/// <reference types="jest" />
const mockStore = new Map<string, string>();
jest.mock("../app-storage", () => ({ appStorage: {
  getItem: async (key: string) => mockStore.get(key) ?? null,
  setItem: async (key: string, value: string) => { mockStore.set(key, value); },
  removeItem: async (key: string) => { mockStore.delete(key); },
} }));
import type { Shift, Transaction } from "../../domain/types";
import {
  forgetActiveShift, forgetShiftData, rememberActiveShift, rememberedShiftTransactions,
  rememberShiftTransactions, rememberTicketRef, restoreActiveShift, withTicketRefs,
} from "../offline-shift-cache";

const shift = { shiftId: "SHF-1", isActive: true, timeOut: null, timeIn: "2026-11-21T06:00:00+08:00" } as Shift;
const sameDay = Date.parse("2026-11-21T23:59:00+08:00");
const nextDay = Date.parse("2026-11-22T00:01:00+08:00");
const row = (transactionId: string, extra: Partial<Transaction> = {}) => ({ transactionId, ...extra } as Transaction);

beforeEach(() => mockStore.clear());

test("today's confirmed shift restores for the same conductor", async () => {
  await rememberActiveShift("conductor", shift);
  await expect(restoreActiveShift("conductor", sameDay)).resolves.toMatchObject({ shiftId: "SHF-1" });
});

test("a shift from before midnight is not restored, because the server has closed it", async () => {
  await rememberActiveShift("conductor", shift);
  await expect(restoreActiveShift("conductor", nextDay)).resolves.toBeNull();
});

test("another conductor cannot resume the saved shift", async () => {
  await rememberActiveShift("conductor", shift);
  await expect(restoreActiveShift("someone-else", sameDay)).resolves.toBeNull();
});

test("an ended or forgotten shift is not restored", async () => {
  await rememberActiveShift("conductor", { ...shift, timeOut: "2026-11-21T10:00:00+08:00" });
  await expect(restoreActiveShift("conductor", sameDay)).resolves.toBeNull();
  await rememberActiveShift("conductor", shift);
  await forgetActiveShift();
  await expect(restoreActiveShift("conductor", sameDay)).resolves.toBeNull();
});

test("saved transactions only return for their own shift and clear on sign-out", async () => {
  await rememberShiftTransactions("SHF-1", [row("TXN-1")]);
  await expect(rememberedShiftTransactions("SHF-1")).resolves.toHaveLength(1);
  await expect(rememberedShiftTransactions("SHF-2")).resolves.toEqual([]);
  await forgetShiftData();
  await expect(rememberedShiftTransactions("SHF-1")).resolves.toEqual([]);
});

test("a corrupted saved copy is treated as empty", async () => {
  mockStore.set("chatco_last_shift_transactions_v1", "{broken");
  mockStore.set("chatco_last_active_shift_v1", "{broken");
  await expect(rememberedShiftTransactions("SHF-1")).resolves.toEqual([]);
  await expect(restoreActiveShift("conductor", sameDay)).resolves.toBeNull();
});

test("a synced fare keeps the number printed on its receipt", async () => {
  await rememberTicketRef("TXN-1", "TKT-UNIT004-0001");
  await rememberTicketRef("GRP-SERVER", "GRP-UNIT004-0002");
  const [single, group, other] = await withTicketRefs([
    row("TXN-1"), row("TXN-2", { multiplePaymentReference: "GRP-SERVER" }), row("TXN-3"),
  ]);
  expect(single!.offlineTicketRef).toBe("TKT-UNIT004-0001");
  expect(group!.offlineTicketRef).toBe("GRP-UNIT004-0002");
  expect(other!.offlineTicketRef).toBeUndefined();
});
