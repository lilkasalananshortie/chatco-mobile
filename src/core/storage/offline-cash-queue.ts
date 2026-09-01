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
  const raw = await appStorage.getItem(KEY);
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
      if (!(await appStorage.getItem(LATEST_CORRUPT_KEY))) {
        await appStorage.setItem(LATEST_CORRUPT_KEY, raw);
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
    await appStorage.setItem(KEY, JSON.stringify([...current, item]));
  });
}

export async function removePendingCash(id: string): Promise<void> {
  await serialized(async () => {
    const remaining = (await readQueue()).filter(entry => entry.id !== id);
    if (remaining.length) await appStorage.setItem(KEY, JSON.stringify(remaining));
    else await appStorage.removeItem(KEY);
  });
}

export async function updatePendingCash(id: string, update: Partial<PendingCashItem>): Promise<void> {
  await serialized(async () => {
    const next = (await readQueue()).map(item => item.id === id ? { ...item, ...update } : item);
    await appStorage.setItem(KEY, JSON.stringify(next));
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
