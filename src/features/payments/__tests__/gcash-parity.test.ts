/// <reference types="jest" />
import { useGcashPayment } from "../hooks/useGcashPayment";
import { api } from "../../../core/api/chatco-api";
let mockStates: any[] = [];
let mockRefs: any[] = [];
let mockCursor = 0;
let mockRefCursor = 0;
let mockEffects: Array<() => any> = [];
jest.mock("react", () => ({
  useCallback: (callback: unknown) => callback,
  useEffect: (effect: () => any) => { mockEffects.push(effect); },
  useRef: (initial: unknown) => { const slot = mockRefCursor++; if (!(slot in mockRefs)) mockRefs[slot] = { current: initial }; return mockRefs[slot]; },
  useState: (initial: unknown) => {
    const slot = mockCursor++; if (!(slot in mockStates)) mockStates[slot] = initial;
    return [mockStates[slot], (value: any) => { mockStates[slot] = typeof value === "function" ? value(mockStates[slot]) : value; }];
  },
}));
jest.mock("../../../core/api/chatco-api", () => ({ api: { initiateGcash: jest.fn(), paymentStatusDetails: jest.fn(), pendingGcash: jest.fn(), cancelPayment: jest.fn(), simulatePayment: jest.fn() } }));
jest.mock("../../../core/utils/haptics", () => ({ appHaptics: { success: jest.fn(), error: jest.fn() } }));
const setStep = jest.fn(); const receipts = jest.fn(); const saved = jest.fn();
const point = { id: "a", pointNumber: 1, name: "A", code: "A", landmarks: [], regularFare: 17, discountedFare: 13.6 };
function render(online = true) {
  mockCursor = 0; mockRefCursor = 0;
  return useGcashPayment({
    visible: true, step: "confirm", setStep, isOnline: online, onSaved: saved, triggerSuccessAlert: jest.fn(),
    pickupPoint: point, pickupLandmark: null, dropoffPoint: { ...point, id: "b", name: "B", pointNumber: 2 }, dropoffLandmark: null,
    isGroupMode: true, setIsGroupMode: jest.fn(), groupTotalFare: 34, fareConfig: { baseBarangayCount: 4, baseFareRegular: 17, baseFareDiscounted: 13.6, succeedingFareRegular: 2.25, succeedingFareDiscounted: 1.8, totalPoints: 2 },
    groupPassengers: [{ type: "REGULAR", quantity: 2 }], setSelectedMethod: jest.fn(), setReceiptTransactions: receipts,
  });
}
async function flush() { for (let i = 0; i < 6; i++) await Promise.resolve(); }
beforeEach(() => {
  jest.useFakeTimers(); jest.clearAllMocks(); mockStates = []; mockRefs = [];
  mockEffects = [];
  (api.initiateGcash as jest.Mock).mockResolvedValue({ transactionId: "ride", qrToken: "qr", amount: 51, expiresAt: new Date(Date.now() + 300000).toISOString() });
});
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });
test("commuter discount updates the remaining group amount without marking it paid", async () => {
  const flow = render(); await flow.handleInitiateGcash();
  const rows = [{ transactionId: "payer", paymentMethod: "GCash", finalAmount: 12, passengerRole: "REGULAR", voucherId: "v" }, { transactionId: "companion", paymentMethod: "GCash", finalAmount: 17 }];
  (api.paymentStatusDetails as jest.Mock).mockResolvedValue({ status: "PENDING", finalAmount: 12, receipts: rows });
  jest.advanceTimersByTime(3000); await flush();
  expect(render().gcashInitiation!.amount).toBe(29);
  expect(receipts).toHaveBeenCalledWith(rows);
  expect(saved).not.toHaveBeenCalled();
  flow.stopPolling();
});
test("fully covered server receipt stays zero and succeeds once", async () => {
  const flow = render(); await flow.handleInitiateGcash();
  const rows = [{ transactionId: "payer", paymentMethod: "Voucher", finalAmount: 0, passengerRole: "REGULAR" }];
  (api.paymentStatusDetails as jest.Mock).mockResolvedValue({ status: "PAID", finalAmount: 0, receipts: rows });
  jest.advanceTimersByTime(3000); await flush();
  expect(render().gcashInitiation!.amount).toBe(0);
  expect(setStep).toHaveBeenLastCalledWith("success");
  jest.advanceTimersByTime(9000); await flush();
  expect(saved).toHaveBeenCalledTimes(1);
});
test("expired student category from the backend is preserved in receipts", async () => {
  const flow = render(); await flow.handleInitiateGcash();
  const rows = [{ transactionId: "payer", paymentMethod: "GCash", finalAmount: 17, passengerRole: "REGULAR" }];
  (api.paymentStatusDetails as jest.Mock).mockResolvedValue({ status: "PAID", receipts: rows });
  jest.advanceTimersByTime(3000); await flush();
  expect(receipts).toHaveBeenCalledWith(rows);
});
test("slow status requests do not overlap or change closed payment state", async () => {
  const flow = render(); await flow.handleInitiateGcash();
  let resolve!: (value: any) => void;
  (api.paymentStatusDetails as jest.Mock).mockReturnValue(new Promise((done) => { resolve = done; }));
  jest.advanceTimersByTime(9000);
  expect(api.paymentStatusDetails).toHaveBeenCalledTimes(1);
  flow.stopPolling(); resolve({ status: "PAID", finalAmount: 0 }); await flush();
  expect(saved).not.toHaveBeenCalled();
});
test("rapid initiation taps issue one mobile request", async () => {
  let resolve!: (value: any) => void;
  (api.initiateGcash as jest.Mock).mockReturnValue(new Promise((done) => { resolve = done; }));
  const flow = render(); const first = flow.handleInitiateGcash(); const second = flow.handleInitiateGcash();
  expect(api.initiateGcash).toHaveBeenCalledTimes(1);
  resolve({ transactionId: "ride", amount: 51, expiresAt: new Date(Date.now() + 300000).toISOString() });
  await Promise.all([first, second]); flow.stopPolling();
});
test("offline mode cannot initiate GCash", async () => {
  await render(false).handleInitiateGcash();
  expect(api.initiateGcash).not.toHaveBeenCalled();
  expect(render(false).gcashError).toContain("offline");
});
test("late initiation response cannot reopen a closed flow", async () => {
  let resolve!: (value: any) => void;
  (api.initiateGcash as jest.Mock).mockReturnValue(new Promise((done) => { resolve = done; }));
  const flow = render(); const pending = flow.handleInitiateGcash();
  flow.stopPolling();
  resolve({ transactionId: "ride", amount: 17, expiresAt: new Date(Date.now() + 300000).toISOString() });
  await pending;
  expect(setStep).not.toHaveBeenCalledWith("qr_code");
  expect(render().gcashInitiation).toBeNull();
});

test("PROCESSING past the QR claim deadline keeps polling until authoritative PAID", async () => {
  (api.initiateGcash as jest.Mock).mockResolvedValue({ transactionId: "ride", status: "processing", amount: 51, expiresAt: new Date(Date.now() - 300000).toISOString(), confirmationDelayed: true });
  (api.paymentStatusDetails as jest.Mock).mockResolvedValue({ status: "PROCESSING", confirmationDelayed: true });
  const flow = render(); await flow.handleInitiateGcash();
  for (let i = 0; i < 6; i++) { jest.advanceTimersByTime(3000); await flush(); }
  expect(setStep).not.toHaveBeenCalledWith("failed");
  expect(render().gcashStatus).toBe("processing");
  expect(render().gcashInitiation!.confirmationDelayed).toBe(true);
  (api.paymentStatusDetails as jest.Mock).mockResolvedValue({ status: "PAID", finalAmount: 51 });
  jest.advanceTimersByTime(3000); await flush();
  expect(saved).toHaveBeenCalledTimes(1);
  expect(setStep).toHaveBeenLastCalledWith("success");
});

test("PENDING past the QR deadline still fails rather than inventing payment success", async () => {
  (api.initiateGcash as jest.Mock).mockResolvedValue({ transactionId: "ride", status: "pending", amount: 51, expiresAt: new Date(Date.now() - 300000).toISOString() });
  (api.paymentStatusDetails as jest.Mock).mockResolvedValue({ status: "PENDING" });
  await render().handleInitiateGcash();
  jest.advanceTimersByTime(10000); await flush();
  expect(setStep).toHaveBeenLastCalledWith("failed");
  expect(saved).not.toHaveBeenCalled();
});

test("reopening an old PROCESSING payment preserves its status instead of making a new QR", async () => {
  (api.pendingGcash as jest.Mock).mockResolvedValue({ transactionId: "existing", status: "processing", amount: 51, expiresAt: new Date(Date.now() - 600000).toISOString() });
  (api.paymentStatusDetails as jest.Mock).mockResolvedValue({ status: "PROCESSING" });
  render(); mockEffects[1]!(); await flush();
  expect(render().gcashStatus).toBe("processing");
  jest.advanceTimersByTime(11000); await flush();
  expect(setStep).not.toHaveBeenCalledWith("failed");
  expect(api.initiateGcash).not.toHaveBeenCalled();
});
