import type { Capacity, Shift, Transaction } from "../domain/types";
import { appStorage } from "./app-storage";

const SHIFT_KEY = "chatco_last_active_shift_v1";
const TRANSACTIONS_KEY = "chatco_last_shift_transactions_v1";
const CAPACITY_KEY = "chatco_shift_capacity_v1";
const TICKET_REFS_KEY = "chatco_offline_ticket_refs_v1";
const MAX_TICKET_REFS = 300;
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const manilaDay = (time: number) => Math.floor((time + MANILA_OFFSET_MS) / DAY_MS);

// Everything here is a convenience copy. A storage failure must never fail a sale.
async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await appStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
async function writeJson(key: string, value: unknown): Promise<void> {
  try { await appStorage.setItem(key, JSON.stringify(value)); } catch { /* Best effort. */ }
}
async function remove(key: string): Promise<void> {
  try { await appStorage.removeItem(key); } catch { /* Best effort. */ }
}

export const rememberActiveShift = (userId: string, shift: Shift) => writeJson(SHIFT_KEY, { userId, shift });
export const forgetActiveShift = () => remove(SHIFT_KEY);

/**
 * The last shift the server confirmed, for reopening the app without signal.
 * The server closes shifts at midnight, so only today's shift can be restored.
 */
export async function restoreActiveShift(userId: string, now = Date.now()): Promise<Shift | null> {
  const saved = await readJson<{ userId: string; shift: Shift }>(SHIFT_KEY);
  const shift = saved?.userId === userId ? saved.shift : null;
  if (!shift?.isActive || shift.timeOut) return null;
  const started = Date.parse(shift.timeIn);
  return Number.isFinite(started) && manilaDay(started) === manilaDay(now) ? shift : null;
}

let lastSavedTransactions = "";
export async function rememberShiftTransactions(shiftId: string, transactions: Transaction[]): Promise<void> {
  const value = JSON.stringify({ shiftId, transactions });
  if (value === lastSavedTransactions) return;
  lastSavedTransactions = value;
  try { await appStorage.setItem(TRANSACTIONS_KEY, value); } catch { lastSavedTransactions = ""; }
}
export async function rememberedShiftTransactions(shiftId: string): Promise<Transaction[]> {
  const saved = await readJson<{ shiftId: string; transactions: Transaction[] }>(TRANSACTIONS_KEY);
  return saved?.shiftId === shiftId && Array.isArray(saved.transactions) ? saved.transactions : [];
}

export async function forgetShiftData(): Promise<void> {
  lastSavedTransactions = "";
  await Promise.all([remove(SHIFT_KEY), remove(TRANSACTIONS_KEY)]);
}

// The server has no read for a unit's capacity, and Home remounts on every tab change.
let knownCapacity: { shiftId: string; capacity: Capacity } | null = null;
const isCapacity = (value: unknown): value is Capacity => value === "AVAILABLE" || value === "STANDING" || value === "FULL";

export const rememberedCapacity = (shiftId: string): Capacity =>
  knownCapacity?.shiftId === shiftId ? knownCapacity.capacity : "AVAILABLE";

export async function rememberCapacity(shiftId: string, capacity: Capacity): Promise<void> {
  knownCapacity = { shiftId, capacity };
  await writeJson(CAPACITY_KEY, knownCapacity);
}
export async function loadRememberedCapacity(shiftId: string): Promise<Capacity | null> {
  if (knownCapacity?.shiftId === shiftId) return knownCapacity.capacity;
  const saved = await readJson<{ shiftId: string; capacity: unknown }>(CAPACITY_KEY);
  if (saved?.shiftId !== shiftId || !isCapacity(saved.capacity)) return null;
  knownCapacity = { shiftId, capacity: saved.capacity };
  return saved.capacity;
}

/** Links the number printed on an offline receipt to the server's record once it syncs. */
export async function rememberTicketRef(serverId?: string | null, printedRef?: string | null): Promise<void> {
  if (!serverId || !printedRef) return;
  const saved = await readJson<Array<[string, string]>>(TICKET_REFS_KEY);
  const refs = Array.isArray(saved) ? saved.filter(([id]) => id !== serverId) : [];
  await writeJson(TICKET_REFS_KEY, [...refs, [serverId, printedRef]].slice(-MAX_TICKET_REFS));
}
export async function withTicketRefs(transactions: Transaction[]): Promise<Transaction[]> {
  const saved = await readJson<Array<[string, string]>>(TICKET_REFS_KEY);
  if (!Array.isArray(saved) || saved.length === 0) return transactions;
  const refs = new Map(saved);
  return transactions.map(transaction => {
    const printed = refs.get(transaction.transactionId)
      ?? (transaction.multiplePaymentReference ? refs.get(transaction.multiplePaymentReference) : undefined);
    return printed ? { ...transaction, offlineTicketRef: printed } : transaction;
  });
}
