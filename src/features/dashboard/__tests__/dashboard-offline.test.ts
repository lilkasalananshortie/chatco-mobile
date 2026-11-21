/// <reference types="jest" />
import type { Transaction } from "../../../core/domain/types";
let mockStates: any[] = [], mockRefs: any[] = [], mockEffects: Array<() => any> = [], mockI = 0, mockR = 0;
const mockStorage = new Map<string, string>();
jest.mock("react", () => ({ ...jest.requireActual("react"), useMemo: (fn: any) => fn(), useCallback: (fn: any) => fn,
  useState: (initial: any) => { const i = mockI++; if (!(i in mockStates)) mockStates[i] = initial; return [mockStates[i], (v: any) => { mockStates[i] = typeof v === "function" ? v(mockStates[i]) : v; }]; },
  useRef: (v: any) => { const i = mockR++; return mockRefs[i] ?? (mockRefs[i] = { current: v }); },
  useEffect: (fn: any) => mockEffects.push(fn) }));
jest.mock("react-native", () => ({ AppState: { currentState: "active", addEventListener: jest.fn(() => ({ remove: jest.fn() })) }, Platform: { OS: "android" } }));
jest.mock("../../../core/storage/app-storage", () => ({ appStorage: {
  getItem: async (key: string) => mockStorage.get(key) ?? null,
  setItem: async (key: string, value: string) => { mockStorage.set(key, value); },
  removeItem: async (key: string) => { mockStorage.delete(key); },
} }));
jest.mock("../../../core/utils/haptics", () => ({ appHaptics: { error: jest.fn(), light: jest.fn() } }));
jest.mock("../../../core/utils/audio-cues", () => ({ audioCues: { playHailSound: jest.fn(), playCapacitySound: jest.fn(), playDutySound: jest.fn(), playSyncSound: jest.fn() } }));
jest.mock("../../../core/api/hail-realtime", () => ({ connectVehicleHails: jest.fn(() => null) }));
jest.mock("../../../core/api/chatco-api", () => ({ NetworkError: class extends Error {}, api: {
  getDeviceId: jest.fn().mockResolvedValue("mobile-test-device"), transactions: jest.fn(), pendingCashCount: jest.fn(),
  pendingCashSyncError: jest.fn().mockResolvedValue(null), earnings: jest.fn(), getSyncState: jest.fn(() => "idle"), addSyncListener: jest.fn(() => () => {}),
  hails: jest.fn().mockResolvedValue([]), capacity: jest.fn().mockResolvedValue({}), checkConnectivity: jest.fn().mockResolvedValue(true),
  syncPendingCashTransactions: jest.fn().mockResolvedValue(1), releaseShiftDevice: jest.fn().mockResolvedValue({}), authorizeBroadcast: jest.fn(),
} }));
import { api } from "../../../core/api/chatco-api";
import { useDashboardShift } from "../hooks/useDashboardShift";

const shift = { shiftId: "SHF-CAPACITY", isActive: true, vehicleId: "1", operatingDeviceId: "mobile-test-device" } as any;
const cash = (id: string, finalAmount: number, offlinePending = false) =>
  ({ transactionId: id, paymentMethod: "Cash", finalAmount, status: "PAID", offlinePending } as Transaction);
const settle = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
function render(isOnline: boolean, refreshKey = 0) {
  mockI = 0; mockR = 0; mockEffects = [];
  return useDashboardShift({ shift, refreshKey, canOperate: true, isOnline });
}
async function mount(isOnline: boolean) {
  render(isOnline);
  const cleanups = mockEffects.map(effect => effect());
  await settle();
  return { hook: render(isOnline), stop: () => cleanups.forEach(cleanup => typeof cleanup === "function" && cleanup()) };
}
const leaveHome = () => { mockStates = []; mockRefs = []; };

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ["nextTick"] });
  jest.clearAllMocks();
  leaveHome();
  (api.pendingCashCount as jest.Mock).mockResolvedValue(0);
  (api.transactions as jest.Mock).mockResolvedValue([]);
  (api.earnings as jest.Mock).mockResolvedValue({ cashTotal: 0, gcashTotal: 0, total: 0 });
});
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

test("an offline sale is added to the server's total", async () => {
  (api.transactions as jest.Mock).mockResolvedValue([cash("server", 500)]);
  (api.earnings as jest.Mock).mockResolvedValue({ cashTotal: 500, gcashTotal: 0, total: 500 });
  (await mount(true)).stop();
  (api.transactions as jest.Mock).mockResolvedValue([cash("server", 500), cash("TKT-1", 26.5, true)]);
  const offline = await mount(false);
  offline.stop();
  expect(offline.hook.totals).toMatchObject({ total: 526.5, cash: 526.5 });
});

test("returning to Home offline still shows the whole shift", async () => {
  (api.transactions as jest.Mock).mockResolvedValue([cash("server", 500), cash("TKT-1", 26.5, true)]);
  const back = await mount(false);
  back.stop();
  expect(back.hook.totals.total).toBe(526.5);
});

test("capacity survives leaving Home and only saves after the server accepts it", async () => {
  const first = await mount(true);
  (api.capacity as jest.Mock).mockRejectedValueOnce(new Error("Refused"));
  await first.hook.updateCapacity("STANDING");
  await settle();
  await render(true).updateCapacity("FULL");
  await settle();
  first.stop();
  leaveHome();
  const back = await mount(true);
  back.stop();
  expect(back.hook.capacity).toBe("FULL");
});

test("handoff uploads queued cash before releasing the device", async () => {
  const mounted = await mount(true);
  mounted.stop();
  (api.pendingCashCount as jest.Mock).mockResolvedValue(0);
  await mounted.hook.releaseDevice();
  await settle();
  expect(api.syncPendingCashTransactions).toHaveBeenCalledWith({ drain: true });
  expect(api.releaseShiftDevice).toHaveBeenCalledWith("SHF-CAPACITY");
});

test("handoff stops if cash is still queued after the upload", async () => {
  const mounted = await mount(true);
  mounted.stop();
  (api.pendingCashCount as jest.Mock).mockResolvedValue(2);
  await mounted.hook.releaseDevice();
  await settle();
  expect(api.releaseShiftDevice).not.toHaveBeenCalled();
});

test("a sale saved during a refresh still appears", async () => {
  let finish!: (rows: Transaction[]) => void;
  (api.transactions as jest.Mock)
    .mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
    .mockResolvedValue([cash("old", 20), cash("new", 30)]);
  render(true);
  const first = mockEffects.map(effect => effect());
  await settle();
  render(true, 1);
  const second = mockEffects.map(effect => effect());
  await settle();
  finish([cash("old", 20)]);
  await settle();
  const after = render(true, 1);
  [...first, ...second].forEach(cleanup => typeof cleanup === "function" && cleanup());
  expect(after.transactions.map(row => row.transactionId)).toEqual(["old", "new"]);
});
