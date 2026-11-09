import {
  getPendingCash,
  pendingCashCount,
  removePendingCash,
  updatePendingCash,
} from "../storage/offline-cash-queue";
import { CONDUCTOR_DEVICE_TYPE, getConductorDeviceId } from "../storage/device-id";
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

/** Retry durable offline cash writes in order. */
let syncInFlight: Promise<number> | null = null;

export async function syncPendingCashTransactions(): Promise<number> {
  if (syncInFlight) return syncInFlight;
  syncInFlight = (async () => {
    const pending = await getPendingCash();
    // Empty-queue timers must not trigger syncing/idle notifications and a
    // dashboard transaction + earnings reload every twenty seconds.
    if (pending.length === 0) return 0;
    notifySyncState("syncing", pending.length);

    try {
      const currentDeviceId = await getConductorDeviceId();
      let synced = 0;

      // Legacy provisional tickets have no backend-authorized originating
      // shift. Keep them for recovery, but never reassign or submit them.
      const eligibleItems = pending.filter(
        (item) => Boolean(item.shiftId)
          && !item.shiftId.startsWith("PROV-")
          && (!item.deviceId || item.deviceId === currentDeviceId)
      );

      if (eligibleItems.length > 0) {
        // Chunk into batches of up to 50 items (backend max batch limit)
        const batchSize = 50;
        for (let i = 0; i < eligibleItems.length; i += batchSize) {
          const chunk = eligibleItems.slice(i, i + batchSize);
          const payloadList = chunk.map((item) => ({
            ...item.payload,
            device_id: item.deviceId ?? currentDeviceId,
            device_type: CONDUCTOR_DEVICE_TYPE,
            offline_created_at:
              item.offlineCreatedAt ?? new Date(item.createdAt).toISOString(),
          }));

          try {
            const batchResult = await post<{
              synced_count: number;
              failed_count: number;
              items?: Array<{ idempotency_key: string; status: string; error?: string }>;
              results?: Record<string, { status: string; error?: string }>;
            }>("/mobile/conductor/transactions/sync", {
              transactions: payloadList,
            });

            for (const item of chunk) {
              const itemResult = cashSyncOutcome(batchResult, item.idempotencyKey, item.id);
              if (itemResult?.status === "synced") {
                await removePendingCash(item.id);
                synced += item.localTransactions.length;
              } else if (itemResult?.status === "failed") {
                await updatePendingCash(item.id, {
                  attempts: (item.attempts ?? 0) + 1,
                  lastAttemptAt: Date.now(),
                  lastError: itemResult.error ?? "Synchronization failed.",
                });
              } else {
                // HTTP 200 is not an acknowledgement of this individual ticket.
                await updatePendingCash(item.id, {
                  attempts: (item.attempts ?? 0) + 1,
                  lastAttemptAt: Date.now(),
                  lastError: "The server did not confirm this ticket. It remains queued for retry.",
                });
              }
            }
          } catch (cause) {
            if (cause instanceof NetworkError) {
              break;
            }
            // Mark attempts for chunk items on general request failure
            for (const item of chunk) {
              await updatePendingCash(item.id, {
                attempts: (item.attempts ?? 0) + 1,
                lastAttemptAt: Date.now(),
                lastError:
                  cause instanceof Error ? cause.message : "Synchronization failed.",
              });
            }
          }
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
  })();
  try {
    return await syncInFlight;
  } finally {
    syncInFlight = null;
  }
}
