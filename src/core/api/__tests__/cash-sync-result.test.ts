/// <reference types="jest" />
import { cashSyncOutcome } from "../cash-sync-result";

describe("offline cash acknowledgement contract", () => {
  test("matches the backend items array by idempotency key", () => {
    expect(cashSyncOutcome({ items: [{ idempotency_key: "cash-1", status: "synced" }] }, "cash-1", "pending-cash-1"))
      .toEqual({ idempotency_key: "cash-1", status: "synced" });
  });

  test("preserves failed item outcomes in a partially successful batch", () => {
    const response = { synced_count: 1, failed_count: 1, items: [
      { idempotency_key: "cash-1", status: "synced" },
      { idempotency_key: "cash-2", status: "failed", error: "Shift ended" },
    ] };
    expect(cashSyncOutcome(response, "cash-2", "pending-cash-2")?.status).toBe("failed");
  });

  test.each([null, {}, { synced_count: 1 }, { items: [] }, { items: [{ idempotency_key: "other", status: "synced" }] }])
    ("never infers confirmation from a successful batch or an unrelated item: %j", response => {
      expect(cashSyncOutcome(response, "cash-1", "pending-cash-1")).toBeUndefined();
    });

  test("rejects unrecognized outcomes", () => {
    expect(cashSyncOutcome({ items: [{ idempotency_key: "cash-1", status: "pending" }] }, "cash-1", "pending-cash-1"))
      .toBeUndefined();
  });

  test("supports explicit legacy keyed acknowledgements", () => {
    expect(cashSyncOutcome({ results: { "pending-cash-1": { status: "synced" } } }, "cash-1", "pending-cash-1")?.status)
      .toBe("synced");
  });
});
