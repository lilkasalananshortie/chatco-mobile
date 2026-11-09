/**
 * offline-cash-queue.ts
 *
 * Durable offline cash transaction queue for ChatCo Mobile.
 *
 * When the backend is unreachable during a Cash or Voucher transaction,
 * the payment is saved locally in this queue and replayed to the server
 * when connectivity is restored.
 *
 * Queue semantics:
 * - Items are written with an idempotency key so server-side replay is safe
 * - A serialized promise chain (queueOperation) ensures all reads and writes
 *   are sequenced — prevents data loss when a sync and a new payment happen simultaneously
 * - Corrupt data is preserved in a separate "corrupt" backup key rather than
 *   silently overwritten, enabling manual recovery
 * - Ticket IDs follow the format: TKT-UNITNUMBER-NNNN (sequential per shift)
 * - Group payments are stored as a single queue item with multiple localTransactions
 *
 * The queue is consumed by syncPendingCashTransactions() in chatco-api.ts.
 */

import type { Transaction } from "../domain/types";
import { appStorage } from "./app-storage";

export type PendingCashItem = {
  id: string;
  shiftId: string;
  kind: "single" | "group";
  idempotencyKey: string;
  payload: Record<string, unknown>;
  localTransactions: Transaction[];
  createdAt: number;
  deviceId?: string;
  offlineCreatedAt?: string;
  attempts?: number;
  lastAttemptAt?: number;
  lastError?: string;
};

const KEY = "chatco_pending_cash_v1";
const CORRUPT_KEY_PREFIX = `${KEY}_corrupt_`;
const LATEST_CORRUPT_KEY = `${CORRUPT_KEY_PREFIX}latest`;

// AsyncStorage/secure storage operations are asynchronous. A plain
// read-modify-write sequence can therefore lose a transaction when a sync and
// an enqueue happen at the same time. Keep all queue mutations in one FIFO
// chain so each operation observes the result of the previous one.
let queueOperation: Promise<unknown> = Promise.resolve();

function serialized<T>(operation: () => Promise<T>): Promise<T> {
  const next = queueOperation.then(operation, operation);
  queueOperation = next.then(() => undefined, () => undefined);
  return next;
}

async function readQueue(): Promise<PendingCashItem[]> {
  const raw = await appStorage.getItem(KEY, { strict: true });
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.some(entry => !isPendingCashItem(entry))) {
      throw new Error("Offline cash queue contains an invalid item.");
    }
    return parsed as PendingCashItem[];
  } catch (cause) {
    // Never replace unreadable data with []. Preserve the exact payload so a
    // later recovery tool/debug session can inspect it.
    try {
      // Keep one recoverable snapshot rather than creating a new backup on
      // every poll while the original value remains unreadable.
      if (!(await appStorage.getItem(LATEST_CORRUPT_KEY, { strict: true }))) {
        await appStorage.setItem(LATEST_CORRUPT_KEY, raw, { strict: true });
      }
    } catch {
      // The original queue error is still the important failure; storage
      // backup is best effort and must not overwrite it.
    }
    throw new Error(`Offline cash queue is corrupted and was preserved for recovery. ${cause instanceof Error ? cause.message : ""}`.trim());
  }
}

function isPendingCashItem(value: unknown): value is PendingCashItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<PendingCashItem>;
  return typeof item.id === "string"
    && typeof item.shiftId === "string"
    && (item.kind === "single" || item.kind === "group")
    && typeof item.idempotencyKey === "string"
    && Boolean(item.payload && typeof item.payload === "object" && !Array.isArray(item.payload))
    && Array.isArray(item.localTransactions)
    && typeof item.createdAt === "number";
}

export async function getPendingCash(): Promise<PendingCashItem[]> {
  return serialized(readQueue);
}

export async function enqueuePendingCash(item: PendingCashItem): Promise<void> {
  await serialized(async () => {
    const current = (await readQueue()).filter(entry => entry.id !== item.id);
    await appStorage.setItem(KEY, JSON.stringify([...current, item]), { strict: true });
  });
}

export async function removePendingCash(id: string): Promise<void> {
  await serialized(async () => {
    const remaining = (await readQueue()).filter(entry => entry.id !== id);
    if (remaining.length) await appStorage.setItem(KEY, JSON.stringify(remaining), { strict: true });
    else await appStorage.removeItem(KEY, { strict: true });
  });
}

export async function updatePendingCash(id: string, update: Partial<PendingCashItem>): Promise<void> {
  await serialized(async () => {
    const next = (await readQueue()).map(item => item.id === id ? { ...item, ...update } : item);
    await appStorage.setItem(KEY, JSON.stringify(next), { strict: true });
  });
}

export async function pendingCashForShift(shiftId: string): Promise<Transaction[]> {
  const items = await getPendingCash();
  return items.filter(item => item.shiftId === shiftId).flatMap(item => item.localTransactions);
}

export async function pendingCashCount(shiftId?: string): Promise<number> {
  const items = await getPendingCash();
  return items
    .filter(item => !shiftId || item.shiftId === shiftId)
    .reduce((total, item) => total + item.localTransactions.length, 0);
}

/** Returns the latest server-side sync rejection for the selected authorized shift. */
export async function pendingCashSyncError(shiftId?: string): Promise<string | null> {
  const items = await getPendingCash();
  return items
    .filter(item => (!shiftId || item.shiftId === shiftId) && Boolean(item.lastError))
    .sort((a, b) => (b.lastAttemptAt ?? b.createdAt) - (a.lastAttemptAt ?? a.createdAt))[0]?.lastError ?? null;
}

const SEQ_KEY_PREFIX = "chatco_tkt_seq_";

/**
 * Atomically reserves sequential ticket numbers for offline cash transactions.
 * Returns the first allocated sequence number (1-based).
 */
export async function getNextOfflineTicketSequence(shiftId: string, count = 1): Promise<number> {
  const safeShiftId = shiftId || "default";
  const key = `${SEQ_KEY_PREFIX}${safeShiftId}`;
  return serialized(async () => {
    const raw = await appStorage.getItem(key, { strict: true });
    const current = raw ? parseInt(raw, 10) || 0 : 0;
    const start = current + 1;
    const next = current + Math.max(1, count);
    await appStorage.setItem(key, String(next), { strict: true });
    return start;
  });
}
