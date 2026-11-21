import {
  getPendingCash,
  pendingCashCount,
  removePendingCash,
  updatePendingCash,
  type PendingCashItem,
} from "../storage/offline-cash-queue";
import { CONDUCTOR_DEVICE_TYPE, getConductorDeviceId } from "../storage/device-id";
import { rememberTicketRef } from "../storage/offline-shift-cache";
import { canSyncFromDevice, isDueForSync } from "../domain/cash-review";
import { NetworkError, post } from "./api-client";
import { cashSyncOutcome } from "./cash-sync-result";

export type SyncState = "idle" | "syncing" | "error";
let currentSyncState: SyncState = "idle";
const syncListeners = new Set<(state: SyncState, pendingCount: number) => void>();

export function addSyncListener(listener: (state: SyncState, pendingCount: number) => void): () => void {
  syncListeners.add(listener);
  return () => {
    syncListeners.delete(listener);
  };
}

export function getSyncState(): SyncState {
  return currentSyncState;
}

export function notifySyncState(state: SyncState, count: number) {
  currentSyncState = state;
  for (const listener of syncListeners) {
    try {
      listener(state, count);
    } catch {}
  }
}

const REJECTED_STOP_ID = /^(?:transactions\.(\d+)\.)?(pickup_stop_id|dropoff_stop_id)$/;

/**
 * The server rejects a whole batch when one queued ticket names a stop that no
 * longer exists. Dropping only that ID lets it match the stop by its saved name;
 * a ticket it still can't match fails alone instead of holding back the others.
 */
export function withoutRejectedStopIds<T extends object>(payloads: T[], cause: unknown): T[] | null {
  const failure = cause as { status?: number; response?: { data?: { errors?: Record<string, unknown> | null } } };
  const errors = failure?.status === 422 ? failure.response?.data?.errors : null;
  const fields = errors ? Object.keys(errors) : [];
  if (!fields.length || !fields.every(field => REJECTED_STOP_ID.test(field))) return null;
  const retry = payloads.map(payload => ({ ...payload })) as Array<T & Record<string, unknown>>;
  for (const field of fields) {
    const [, index = "0", stopField] = REJECTED_STOP_ID.exec(field)!;
    if (retry[Number(index)]) delete retry[Number(index)]![stopField!];
  }
  return retry;
}

type CashSyncBatchResult = {
  synced_count: number;
  failed_count: number;
  items?: Array<{ idempotency_key: string; status: string; error?: string; transaction_id?: string | null }>;
  results?: Record<string, { status: string; error?: string; transaction_id?: string | null }>;
};

const postCashBatch = (transactions: object[]) =>
  post<CashSyncBatchResult>("/mobile/conductor/transactions/sync", { transactions });

const postSingleTicket = (ticket: object) =>
  post<{ transaction_id?: string } | undefined>("/mobile/conductor/transactions", ticket);

/**
 * The batch route discards passenger_role, which would save a Student, Senior,
 * or PWD ticket at the regular fare. The single-ticket route keeps it.
 */
function needsSingleTicketRoute(item: PendingCashItem): boolean {
  const role = item.payload.passenger_role;
  return item.kind === "single" && Boolean(role) && role !== "REGULAR";
}

/** Single tickets share a 30-per-minute write limit with new fares and remittance. */
export const MAX_SINGLE_TICKETS_PER_SYNC = 5;
/** Remitting waits on the upload, so it uses most of that limit in one go. */
export const MAX_SINGLE_TICKETS_WHEN_REMITTING = 20;

/** The server answered and refused this ticket, so retrying immediately won't help. */
const REFUSED_STATUSES = new Set([403, 404, 409, 422]);

const syncPayload = (item: PendingCashItem, currentDeviceId: string) => ({
  ...item.payload,
  device_id: item.deviceId ?? currentDeviceId,
  device_type: CONDUCTOR_DEVICE_TYPE,
  offline_created_at: item.offlineCreatedAt ?? new Date(item.createdAt).toISOString(),
});

const printedRef = (item: PendingCashItem) =>
  item.kind === "group"
    ? item.localTransactions[0]?.multiplePaymentReference
    : item.localTransactions[0]?.transactionId;

const recordFailure = (item: PendingCashItem, lastError: string, refused: boolean) =>
  updatePendingCash(item.id, {
    attempts: (item.attempts ?? 0) + 1,
    lastAttemptAt: Date.now(),
    lastError,
    ...(refused ? { refusals: (item.refusals ?? 0) + 1 } : {}),
  });

async function confirmSynced(item: PendingCashItem, serverId?: string | null): Promise<number> {
  await removePendingCash(item.id);
  await rememberTicketRef(serverId, printedRef(item));
  return item.localTransactions.length;
}

/** Retry durable offline cash writes in order. */
async function runSyncPass(singleTicketLimit: number, retryRefused: boolean): Promise<number> {
  const pending = await getPendingCash();
  // Empty-queue timers must not trigger syncing/idle notifications and a
  // dashboard transaction + earnings reload every twenty seconds.
  if (pending.length === 0) return 0;

  let currentDeviceId: string;
  try {
    currentDeviceId = await getConductorDeviceId();
  } catch {
    return 0;
  }
  // Legacy provisional tickets have no backend-authorized originating
  // shift. Keep them for recovery, but never reassign or submit them.
  const now = Date.now();
  const eligibleItems = pending.filter(
    (item) => canSyncFromDevice(item, currentDeviceId) && isDueForSync(item, now, retryRefused),
  );
  if (eligibleItems.length === 0) return 0;
  notifySyncState("syncing", pending.length);

  try {
    let synced = 0;
    let serverReachable = true;
    const batchItems = eligibleItems.filter((item) => !needsSingleTicketRoute(item));

    // Chunk into batches of up to 50 items (backend max batch limit)
    const batchSize = 50;
    for (let i = 0; i < batchItems.length; i += batchSize) {
      const chunk = batchItems.slice(i, i + batchSize);
      const payloadList = chunk.map((item) => syncPayload(item, currentDeviceId));

      try {
        let batchResult: CashSyncBatchResult;
        try {
          batchResult = await postCashBatch(payloadList);
        } catch (cause) {
          const retry = withoutRejectedStopIds(payloadList, cause);
          if (!retry) throw cause;
          batchResult = await postCashBatch(retry);
        }

        for (const item of chunk) {
          const itemResult = cashSyncOutcome(batchResult, item.idempotencyKey, item.id);
          if (itemResult?.status === "synced") {
            synced += await confirmSynced(item, itemResult.transaction_id);
          } else if (itemResult?.status === "failed") {
            await recordFailure(item, itemResult.error ?? "Synchronization failed.", true);
          } else {
            // HTTP 200 is not an acknowledgement of this individual ticket.
            await recordFailure(item, "The server did not confirm this ticket. It remains queued for retry.", false);
          }
        }
      } catch (cause) {
        if (cause instanceof NetworkError) {
          serverReachable = false;
          break;
        }
        // Mark attempts for chunk items on general request failure
        for (const item of chunk) {
          await recordFailure(item, cause instanceof Error ? cause.message : "Synchronization failed.", false);
        }
      }
    }

    // Least recently tried first, so a refused ticket cannot starve the rest.
    const singleTickets = eligibleItems
      .filter(needsSingleTicketRoute)
      .sort((a, b) => (a.lastAttemptAt ?? 0) - (b.lastAttemptAt ?? 0))
      .slice(0, singleTicketLimit);
    for (const item of serverReachable ? singleTickets : []) {
      const payload = syncPayload(item, currentDeviceId);
      try {
        let saved: { transaction_id?: string } | undefined;
        try {
          saved = await postSingleTicket(payload);
        } catch (cause) {
          const retry = withoutRejectedStopIds([payload], cause);
          if (!retry) throw cause;
          saved = await postSingleTicket(retry[0]!);
        }
        if (saved?.transaction_id) {
          synced += await confirmSynced(item, saved.transaction_id);
        } else {
          await recordFailure(item, "The server did not confirm this ticket. It remains queued for retry.", false);
        }
      } catch (cause) {
        if (cause instanceof NetworkError) break;
        const status = (cause as { status?: number }).status;
        await recordFailure(
          item,
          cause instanceof Error ? cause.message : "Synchronization failed.",
          status !== undefined && REFUSED_STATUSES.has(status),
        );
        if (status === 401 || status === 429) break;
      }
    }

    const remaining = await pendingCashCount();
    notifySyncState("idle", remaining);
    return synced;
  } catch {
    const remaining = await pendingCashCount().catch(() => 0);
    notifySyncState("idle", remaining);
    return 0;
  }
}

let syncInFlight: Promise<number> | null = null;

function startSyncPass(singleTicketLimit: number, retryRefused: boolean): Promise<number> {
  const pass: Promise<number> = runSyncPass(singleTicketLimit, retryRefused).finally(() => {
    if (syncInFlight === pass) syncInFlight = null;
  });
  syncInFlight = pass;
  return pass;
}

async function waitForRunningSync(): Promise<void> {
  while (syncInFlight) await syncInFlight.catch(() => 0);
}

/**
 * `drain` is for actions that wait on the result, like remitting: it uploads as
 * much as the write limit allows and settles whether a refused ticket needs review.
 */
export async function syncPendingCashTransactions({ drain = false }: { drain?: boolean } = {}): Promise<number> {
  if (!drain) return syncInFlight ?? startSyncPass(MAX_SINGLE_TICKETS_PER_SYNC, false);
  await waitForRunningSync();
  let synced = await startSyncPass(MAX_SINGLE_TICKETS_WHEN_REMITTING, true);
  if ((await getPendingCash()).some((item) => item.refusals === 1)) {
    await waitForRunningSync();
    synced += await startSyncPass(MAX_SINGLE_TICKETS_PER_SYNC, true);
  }
  return synced;
}
