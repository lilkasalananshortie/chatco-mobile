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
};

const KEY = "chatco_pending_cash_v1";

export async function getPendingCash(): Promise<PendingCashItem[]> {
  const raw = await appStorage.getItem(KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as PendingCashItem[]; } catch { return []; }
}

export async function enqueuePendingCash(item: PendingCashItem): Promise<void> {
  const current = (await getPendingCash()).filter(entry => entry.id !== item.id);
  await appStorage.setItem(KEY, JSON.stringify([...current, item]));
}

export async function removePendingCash(id: string): Promise<void> {
  const remaining = (await getPendingCash()).filter(entry => entry.id !== id);
  if (remaining.length) await appStorage.setItem(KEY, JSON.stringify(remaining));
  else await appStorage.removeItem(KEY);
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
