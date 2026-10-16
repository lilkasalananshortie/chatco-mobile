/// <reference types="jest" />
jest.mock("../../storage/app-storage", () => ({ appStorage: { getItem: jest.fn().mockResolvedValue(null) } }));
jest.mock("../../storage/device-id", () => ({ CONDUCTOR_DEVICE_TYPE: "MOBILE", getConductorDeviceId: jest.fn().mockResolvedValue("mobile-test-device") }));
jest.mock("../../storage/offline-cash-queue", () => ({
  getPendingCash: jest.fn(), pendingCashCount: jest.fn().mockResolvedValue(0),
  reassignPendingShiftId: jest.fn(), removePendingCash: jest.fn(), updatePendingCash: jest.fn(),
}));
jest.mock("../api-client", () => ({ NetworkError: class extends Error {}, post: jest.fn(), request: jest.fn(), PROVISIONAL_SHIFT_KEY: "provisional" }));
jest.mock("../api-mappers", () => ({ mapShift: jest.fn() }));

import { post } from "../api-client";
import { getPendingCash, removePendingCash, updatePendingCash } from "../../storage/offline-cash-queue";
import { syncPendingCashTransactions } from "../sync-service";

describe("durable cash sync against the backend batch contract", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getPendingCash).mockResolvedValue(["one", "two"].map(key => ({
      id: `pending-${key}`, idempotencyKey: key, shiftId: "SHF-ORIGINAL", kind: "single" as const,
      payload: { idempotency_key: key, shift_id: "SHF-ORIGINAL" },
      localTransactions: [{}] as any, createdAt: Date.now(), deviceId: "mobile-test-device",
    })));
  });

  test("partial failure removes only explicitly confirmed tickets", async () => {
    jest.mocked(post).mockResolvedValue({ items: [
      { idempotency_key: "one", status: "synced" },
      { idempotency_key: "two", status: "failed", error: "Shift finalized" },
    ] });
    expect(await syncPendingCashTransactions()).toBe(1);
    expect(removePendingCash).toHaveBeenCalledTimes(1);
    expect(removePendingCash).toHaveBeenCalledWith("pending-one");
    expect(updatePendingCash).toHaveBeenCalledWith("pending-two", expect.objectContaining({ lastError: "Shift finalized" }));
  });

  test("missing item acknowledgements retain every ticket", async () => {
    jest.mocked(post).mockResolvedValue({ synced_count: 2 });
    expect(await syncPendingCashTransactions()).toBe(0);
    expect(removePendingCash).not.toHaveBeenCalled();
    expect(updatePendingCash).toHaveBeenCalledTimes(2);
  });

  test("request failure retains every ticket", async () => {
    jest.mocked(post).mockRejectedValue(new Error("Server unavailable"));
    expect(await syncPendingCashTransactions()).toBe(0);
    expect(removePendingCash).not.toHaveBeenCalled();
  });

  test("simultaneous synchronization shares one request and preserves shift and keys", async () => {
    jest.mocked(post).mockResolvedValue({ items: [
      { idempotency_key: "one", status: "synced" }, { idempotency_key: "two", status: "synced" },
    ] });
    await Promise.all([syncPendingCashTransactions(), syncPendingCashTransactions()]);
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith("/mobile/conductor/transactions/sync", {
      transactions: expect.arrayContaining([expect.objectContaining({ shift_id: "SHF-ORIGINAL", idempotency_key: "one" })]),
    });
  });
});
