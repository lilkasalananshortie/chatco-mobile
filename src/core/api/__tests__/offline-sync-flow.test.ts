/// <reference types="jest" />
const mockStore = new Map<string, string>();
const mockGetItem = jest.fn(async (key: string, _options?: { strict?: boolean }) => mockStore.get(key) ?? null);
jest.mock("../../storage/app-storage", () => ({ appStorage: {
  getItem: (key: string, options?: { strict?: boolean }) => mockGetItem(key, options),
  setItem: async (key: string, value: string) => { mockStore.set(key, value); },
  removeItem: async (key: string) => { mockStore.delete(key); },
} }));

process.env.EXPO_PUBLIC_API_URL = "https://api.test";
const { transactionService } = require("../transaction-service") as typeof import("../transaction-service");
const { MAX_SINGLE_TICKETS_PER_SYNC, syncPendingCashTransactions } = require("../sync-service") as typeof import("../sync-service");
const { getPendingCash } = require("../../storage/offline-cash-queue") as typeof import("../../storage/offline-cash-queue");

const PICKUP = "11111111-1111-4111-8111-111111111111";
const DROPOFF = "22222222-2222-4222-8222-222222222222";
const BATCH = "https://api.test/api/v1/mobile/conductor/transactions/sync";
const SINGLE = "https://api.test/api/v1/mobile/conductor/transactions";

type Call = { url: string; body: any };
let calls: Call[] = [];
const json = (status: number, data: unknown, extra: object = {}) => ({
  ok: status < 400, status, headers: { get: () => null }, json: async () => ({ data, ...extra }),
});
const html = (status: number) => ({
  ok: status < 400, status, headers: { get: () => null }, json: async () => { throw new SyntaxError("Unexpected token <"); },
});
const offline = () => { globalThis.fetch = jest.fn(async () => { throw new TypeError("Network request failed"); }) as never; };
function online(single: (body: any) => unknown = body => json(201, { transaction_id: `TXN-${body.idempotency_key}` })) {
  globalThis.fetch = jest.fn(async (url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    calls.push({ url, body });
    if (url === BATCH) return json(200, { items: body.transactions.map((row: any) => ({ idempotency_key: row.idempotency_key, status: "synced" })) });
    return single(body);
  }) as never;
}
const fare = (key: string, passengerRole: string) => transactionService.recordCash({
  idempotencyKey: key, amount: passengerRole === "REGULAR" ? 26.5 : 21.25, from: "Calumpit", to: "Builders",
  baseFare: 26.5, distance: 8, discountAmount: passengerRole === "REGULAR" ? 0 : 5.25, passengerRole,
  pickupStopId: PICKUP, dropoffStopId: DROPOFF, shiftId: "SHF-1", unitNumber: "UNIT-004",
});

beforeEach(() => { mockStore.clear(); calls = []; jest.spyOn(console, "warn").mockImplementation(() => {}); });
afterEach(() => jest.restoreAllMocks());

test("discounted tickets keep their passenger type; regular and group tickets use the batch", async () => {
  offline();
  await fare("regular", "REGULAR");
  await fare("student", "STUDENT");
  await fare("senior", "SENIOR");
  await transactionService.recordGroupCash({
    idempotencyKey: "group", from: "Calumpit", to: "Builders", regularFare: 26.5, discountedFare: 21.25,
    pickupStopId: PICKUP, dropoffStopId: DROPOFF, shiftId: "SHF-1", unitNumber: "UNIT-004",
    passengers: [{ passenger_type: "REGULAR", quantity: 1 }, { passenger_type: "PWD", quantity: 1 }],
  });
  expect(await transactionService.pendingCashCount("SHF-1")).toBe(5);

  online();
  expect(await syncPendingCashTransactions()).toBe(5);
  expect(await getPendingCash()).toEqual([]);

  const batch = calls.find(call => call.url === BATCH)!;
  expect(batch.body.transactions.map((row: any) => row.idempotency_key)).toEqual(["regular", "group"]);
  const singles = calls.filter(call => call.url === SINGLE);
  expect(singles.map(call => [call.body.idempotency_key, call.body.passenger_role])).toEqual([
    ["student", "STUDENT"], ["senior", "SENIOR_CITIZEN"],
  ]);
  for (const { body } of singles) {
    expect(body).toMatchObject({ shift_id: "SHF-1", device_type: "MOBILE", final_amount: 21.25 });
    expect(body.device_id.length).toBeGreaterThanOrEqual(16);
    expect(Date.parse(body.offline_created_at)).not.toBeNaN();
  }
});

test.each([[200], [502], [503], [504]])("a non-JSON %i page saves the cash ticket instead of failing the sale", async status => {
  globalThis.fetch = jest.fn(async () => html(status)) as never;
  const saved = await fare("portal", "REGULAR");
  expect(saved).toMatchObject({ offlinePending: true, finalAmount: 26.5 });
  expect((await getPendingCash()).map(item => item.idempotencyKey)).toEqual(["portal"]);
});

test("losing the connection mid-sync keeps the unsent discounted tickets", async () => {
  offline();
  await fare("first", "PWD");
  await fare("second", "PWD");
  let sent = 0;
  globalThis.fetch = jest.fn(async () => {
    sent += 1;
    if (sent === 1) return json(201, { transaction_id: "TXN-first" });
    throw new TypeError("Network request failed");
  }) as never;
  expect(await syncPendingCashTransactions()).toBe(1);
  expect((await getPendingCash()).map(item => item.idempotencyKey)).toEqual(["second"]);
});

test("a deleted stop is retried by name on the single-ticket route", async () => {
  offline();
  await fare("stale", "STUDENT");
  online(body => body.pickup_stop_id
    ? json(422, null, { message: "Pickup stop not found", errors: { pickup_stop_id: ["Pickup stop not found"] } })
    : json(201, { transaction_id: "TXN-stale" }));
  expect(await syncPendingCashTransactions()).toBe(1);
  expect(calls).toHaveLength(2);
  expect(calls[1]!.body).toMatchObject({ pickup_name: "Calumpit", dropoff_stop_id: DROPOFF, passenger_role: "STUDENT" });
  expect(calls[1]!.body.pickup_stop_id).toBeUndefined();
});

test("a refused ticket stays queued with the reason and does not block the next one", async () => {
  offline();
  await fare("refused", "PWD");
  await fare("fine", "PWD");
  online(body => body.idempotency_key === "refused"
    ? json(409, null, { message: "This ended shift has already been remitted." })
    : json(201, { transaction_id: "TXN-fine" }));
  expect(await syncPendingCashTransactions()).toBe(1);
  const [left] = await getPendingCash();
  expect(left).toMatchObject({ idempotencyKey: "refused", attempts: 1, lastError: "This ended shift has already been remitted." });
});

test("remitting uploads more than the background limit in one go", async () => {
  offline();
  for (let index = 0; index < 12; index++) await fare(`bulk-${index}`, "STUDENT");
  online();
  expect(await syncPendingCashTransactions({ drain: true })).toBe(12);
  expect(await transactionService.pendingCashCount("SHF-1")).toBe(0);
});

test("a ticket refused twice stops blocking the conductor but stays saved", async () => {
  offline();
  await fare("refused", "PWD");
  online(() => json(409, null, { message: "This ended shift has already been remitted." }));
  await syncPendingCashTransactions({ drain: true });
  expect(await transactionService.pendingCashCount("SHF-1")).toBe(0);
  expect(await getPendingCash()).toHaveLength(1);
  expect(await transactionService.cashNeedingReview("SHF-1")).toEqual([
    expect.objectContaining({ amount: 21.25, reason: "This ended shift has already been remitted." }),
  ]);
});

test("a temporary server error never moves a ticket to review", async () => {
  offline();
  await fare("temporary", "PWD");
  online(() => json(500, null, { message: "Server Error" }));
  await syncPendingCashTransactions({ drain: true });
  await syncPendingCashTransactions({ drain: true });
  expect(await transactionService.pendingCashCount("SHF-1")).toBe(1);
  expect(await transactionService.cashNeedingReview("SHF-1")).toEqual([]);
});

test("a ticket in review retries slowly and clears if the server later accepts it", async () => {
  offline();
  await fare("review", "PWD");
  online(() => json(409, null, { message: "Refused" }));
  await syncPendingCashTransactions({ drain: true });
  calls = [];
  await syncPendingCashTransactions();
  expect(calls).toHaveLength(0);
  const later = Date.now() + 11 * 60 * 1000;
  jest.spyOn(Date, "now").mockReturnValue(later);
  online();
  expect(await syncPendingCashTransactions()).toBe(1);
  expect(await getPendingCash()).toEqual([]);
});

test("the shift's earlier fares stay visible offline", async () => {
  globalThis.fetch = jest.fn(async () => json(200, [{ transaction_id: "TXN-1", payment_method: "CASH", final_amount: 500, created_at: "2026-11-21T01:00:00Z", status: "PAID" }])) as never;
  await transactionService.transactions("SHF-1");
  await new Promise<void>(resolve => { setTimeout(() => resolve(), 0); });
  offline();
  await fare("after", "REGULAR");
  const rows = await transactionService.transactions("SHF-1");
  expect(rows.map(row => row.finalAmount)).toEqual([500, 26.5]);
});

test("a synced ticket remembers its printed number", async () => {
  offline();
  const printed = await fare("linked", "STUDENT");
  online(() => json(201, { transaction_id: "TXN-LINKED" }));
  await syncPendingCashTransactions();
  globalThis.fetch = jest.fn(async () => json(200, [{ transaction_id: "TXN-LINKED", payment_method: "CASH", final_amount: 21.25, created_at: "2026-11-21T01:00:00Z" }])) as never;
  const [row] = await transactionService.transactions("SHF-1");
  expect(row!.offlineTicketRef).toBe(printed.transactionId);
});

test("a success without a transaction ID is not treated as saved", async () => {
  offline();
  await fare("unconfirmed", "STUDENT");
  online(() => json(201, {}));
  expect(await syncPendingCashTransactions()).toBe(0);
  expect(await getPendingCash()).toHaveLength(1);
});

test("single tickets stay under the write limit and refused ones cannot starve the rest", async () => {
  offline();
  const keys = Array.from({ length: MAX_SINGLE_TICKETS_PER_SYNC + 2 }, (_, index) => `ticket-${index}`);
  for (const key of keys) await fare(key, "STUDENT");
  online(() => json(409, null, { message: "Refused" }));
  jest.spyOn(Date, "now").mockReturnValue(1_000);
  await syncPendingCashTransactions();
  expect(calls).toHaveLength(MAX_SINGLE_TICKETS_PER_SYNC);
  calls = [];
  jest.spyOn(Date, "now").mockReturnValue(2_000);
  await syncPendingCashTransactions();
  expect(calls.slice(0, 2).map(call => call.body.idempotency_key)).toEqual(keys.slice(-2));
});
