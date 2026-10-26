/// <reference types="jest" />
jest.mock("../app-storage", () => ({ appStorage: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() } }));
import { appStorage } from "../app-storage";
import { enqueuePendingCash, getPendingCash, removePendingCash, type PendingCashItem } from "../offline-cash-queue";
let store: Map<string, string>;
const item = (id: string): PendingCashItem => ({ id, shiftId: "original-shift", idempotencyKey: id, kind: "single", payload: {}, localTransactions: [], createdAt: 1, deviceId: "original-device" });
beforeEach(() => {
  store = new Map(); jest.clearAllMocks();
  (appStorage.getItem as jest.Mock).mockImplementation(async key => store.get(key) ?? null);
  (appStorage.setItem as jest.Mock).mockImplementation(async (key, value) => { store.set(key, value); });
  (appStorage.removeItem as jest.Mock).mockImplementation(async key => { store.delete(key); });
});
test("concurrent cash enqueue retains both original shifts and keys", async () => {
  await Promise.all([enqueuePendingCash(item("a")), enqueuePendingCash(item("b"))]);
  expect((await getPendingCash()).map(row => row.id)).toEqual(["a", "b"]);
  expect((await getPendingCash())[0]).toMatchObject({ shiftId: "original-shift", deviceId: "original-device", idempotencyKey: "a" });
});
test("failed financial read cannot overwrite existing cash", async () => {
  await enqueuePendingCash(item("a")); const before = [...store.entries()];
  (appStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error("read timeout"));
  await expect(enqueuePendingCash(item("b"))).rejects.toThrow("read timeout");
  expect([...store.entries()]).toEqual(before);
});
test("acknowledged removal and concurrent enqueue do not erase the new fare", async () => {
  await enqueuePendingCash(item("a"));
  await Promise.all([removePendingCash("a"), enqueuePendingCash(item("b"))]);
  expect((await getPendingCash()).map(row => row.id)).toEqual(["b"]);
  expect(appStorage.removeItem).toHaveBeenCalledWith(expect.any(String), { strict: true });
});
test("corrupt queue is preserved and not replaced by the next fare", async () => {
  store.set("chatco_pending_cash_v1", "{broken");
  await expect(enqueuePendingCash(item("b"))).rejects.toThrow("preserved for recovery");
  expect(store.get("chatco_pending_cash_v1")).toBe("{broken");
});
