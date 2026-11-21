/// <reference types="jest" />
jest.mock("../../storage/app-storage", () => ({ appStorage: { getItem: jest.fn().mockResolvedValue(null) } }));
jest.mock("../../storage/device-id", () => ({ CONDUCTOR_DEVICE_TYPE: "MOBILE", getConductorDeviceId: jest.fn().mockResolvedValue("mobile-test-device") }));
jest.mock("../../storage/offline-cash-queue", () => ({
  getPendingCash: jest.fn(), pendingCashCount: jest.fn().mockResolvedValue(0),
  removePendingCash: jest.fn(), updatePendingCash: jest.fn(),
}));
jest.mock("../api-client", () => ({ NetworkError: class extends Error {}, post: jest.fn() }));
jest.mock("../api-mappers", () => ({ mapShift: jest.fn() }));

import { post } from "../api-client";
import { getPendingCash, removePendingCash, updatePendingCash } from "../../storage/offline-cash-queue";
import { addSyncListener, syncPendingCashTransactions } from "../sync-service";

describe("durable cash sync against the backend batch contract", () => {
  test("an empty queue does not broadcast sync events or make requests", async () => {
    jest.mocked(getPendingCash).mockResolvedValue([]);
    const listener = jest.fn();
    const remove = addSyncListener(listener);
    try {
      expect(await syncPendingCashTransactions()).toBe(0);
      expect(listener).not.toHaveBeenCalled();
      expect(post).not.toHaveBeenCalled();
    } finally { remove(); }
  });
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

  test("a deleted stop ID is dropped from only its ticket and retried once", async () => {
    jest.mocked(getPendingCash).mockResolvedValue(["one", "two"].map(key => ({
      id: `pending-${key}`, idempotencyKey: key, shiftId: "SHF-ORIGINAL", kind: "single" as const,
      payload: { idempotency_key: key, shift_id: "SHF-ORIGINAL", pickup_name: "Calumpit", pickup_stop_id: `stop-${key}`, dropoff_stop_id: `drop-${key}` },
      localTransactions: [{}] as any, createdAt: Date.now(), deviceId: "mobile-test-device",
    })));
    const rejected = Object.assign(new Error("Validation failed"), {
      status: 422, response: { data: { errors: { "transactions.1.pickup_stop_id": ["The selected stop is invalid."] } } },
    });
    jest.mocked(post).mockRejectedValueOnce(rejected).mockResolvedValueOnce({ items: [
      { idempotency_key: "one", status: "synced" }, { idempotency_key: "two", status: "synced" },
    ] });

    expect(await syncPendingCashTransactions()).toBe(2);

    expect(post).toHaveBeenCalledTimes(2);
    const retried = (jest.mocked(post).mock.calls[1]![1] as { transactions: any[] }).transactions;
    expect(retried[0]).toMatchObject({ idempotency_key: "one", pickup_stop_id: "stop-one", dropoff_stop_id: "drop-one" });
    expect(retried[1]).toMatchObject({ idempotency_key: "two", pickup_name: "Calumpit", dropoff_stop_id: "drop-two" });
    expect(retried[1]).not.toHaveProperty("pickup_stop_id");
  });

  test("other validation failures are not retried and keep every ticket", async () => {
    jest.mocked(post).mockRejectedValue(Object.assign(new Error("Validation failed"), {
      status: 422, response: { data: { errors: { "transactions.0.pickup_stop_id": ["Invalid."], "transactions.1.shift_id": ["Required."] } } },
    }));
    expect(await syncPendingCashTransactions()).toBe(0);
    expect(post).toHaveBeenCalledTimes(1);
    expect(removePendingCash).not.toHaveBeenCalled();
    expect(updatePendingCash).toHaveBeenCalledTimes(2);
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

  test("legacy provisional cash remains saved and is never submitted or reassigned", async () => {
    jest.mocked(getPendingCash).mockResolvedValue([
      {
        id: "pending-official", idempotencyKey: "official", shiftId: "SHF-ORIGINAL", kind: "single",
        payload: { idempotency_key: "official", shift_id: "SHF-ORIGINAL" },
        localTransactions: [{}] as any, createdAt: Date.now(), deviceId: "mobile-test-device",
      },
      {
        id: "pending-provisional", idempotencyKey: "legacy", shiftId: "PROV-OLD", kind: "single",
        payload: { idempotency_key: "legacy", shift_id: "PROV-OLD" },
        localTransactions: [{}] as any, createdAt: Date.now(), deviceId: "mobile-test-device",
      },
    ]);
    jest.mocked(post).mockResolvedValue({ items: [{ idempotency_key: "official", status: "synced" }] });
    await syncPendingCashTransactions();
    expect(post).toHaveBeenCalledWith("/mobile/conductor/transactions/sync", {
      transactions: [expect.objectContaining({ idempotency_key: "official", shift_id: "SHF-ORIGINAL" })],
    });
    expect(removePendingCash).toHaveBeenCalledWith("pending-official");
    expect(removePendingCash).not.toHaveBeenCalledWith("pending-provisional");
  });
});
