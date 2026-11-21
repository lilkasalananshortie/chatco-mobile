/// <reference types="jest" />
import { useDashboardShift } from "../hooks/useDashboardShift";
import { api } from "../../../core/api/chatco-api";
import { audioCues } from "../../../core/utils/audio-cues";
import { connectVehicleHails } from "../../../core/api/hail-realtime";
import { acceptedHailsOutOfRange, activeHails, applyLocalAccepts, formatHailCountdown, hailIdFromMarker, nextAcceptedExpiry } from "../hail-state";
import type { HailRequest } from "../../../core/domain/types";

let effects: Array<() => void | (() => void)> = [];
let setters: jest.Mock[] = [];
let mockVisibleHails: unknown = null;
jest.mock("react", () => ({ ...jest.requireActual("react"),
  useState: (value: unknown) => {
    const index = setters.length, setter = jest.fn();
    setters.push(setter);
    return [index === 6 && mockVisibleHails ? mockVisibleHails : value, setter];
  },
  useRef: (value: unknown) => ({ current: value }),
  useMemo: (fn: () => unknown) => fn(),
  useCallback: (fn: unknown) => fn,
  useEffect: (fn: () => void | (() => void)) => effects.push(fn),
}));
jest.mock("react-native", () => ({ AppState: { currentState: "active", addEventListener: jest.fn(() => ({ remove: jest.fn() })) } }));
jest.mock("../../../core/api/chatco-api", () => ({ api: { getSyncState: () => "idle", hails: jest.fn(), acceptHail: jest.fn(), capacity: jest.fn(), breakStatus: jest.fn() } }));
jest.mock("../../../core/utils/audio-cues", () => ({ audioCues: { playHailSound: jest.fn(), playCapacitySound: jest.fn(), playDutySound: jest.fn() } }));
jest.mock("../../../core/utils/haptics", () => ({ appHaptics: { error: jest.fn() } }));
jest.mock("../../../core/storage/offline-shift-cache", () => ({ rememberedCapacity: () => "AVAILABLE", loadRememberedCapacity: async () => null, rememberCapacity: async () => {} }));
jest.mock("../../../core/api/hail-realtime", () => ({ connectVehicleHails: jest.fn() }));

const hail = (id: string, data: Partial<HailRequest> = {}): HailRequest => ({ id, commuterName: "Commuter", latitude: 14.8, longitude: 120.9, status: "PENDING", ...data });
const settle = async () => { for (let i = 0; i < 6; i += 1) await Promise.resolve(); };
const mount = () => {
  effects = []; setters = [];
  return useDashboardShift({ shift: { shiftId: "shift", isOnBreak: false } as any, refreshKey: 0, canOperate: true, isOnline: true });
};
/** Replays functional setHails updates over a starting list. */
const hailsAfter = (start: HailRequest[]) => setters[6]!.mock.calls.reduce(
  (current: HailRequest[], [next]) => typeof next === "function" ? next(current) : next, start);

beforeEach(() => { jest.clearAllMocks(); mockVisibleHails = null; });

test("a failed hail refresh keeps the last visible requests", async () => {
  (api.hails as jest.Mock).mockRejectedValue(new Error("Temporary request failure"));
  mount();

  const cleanup = effects[5]!();
  await settle();

  expect(api.hails).toHaveBeenCalledTimes(1);
  expect(setters[6]).not.toHaveBeenCalled();
  (cleanup as () => void)?.();
});

test("a live event during a request triggers one follow-up refresh", async () => {
  const stop = jest.fn();
  (connectVehicleHails as jest.Mock).mockReturnValue({ setActive: jest.fn(), stop });
  let finishFirst!: (value: HailRequest[]) => void;
  (api.hails as jest.Mock)
    .mockReturnValueOnce(new Promise<HailRequest[]>(resolve => { finishFirst = resolve; }))
    .mockResolvedValue([hail("new")]);
  effects = []; setters = [];
  useDashboardShift({ shift: { shiftId: "shift", vehicleId: "v1", isOnBreak: false } as any, refreshKey: 0, canOperate: true, isOnline: true });

  const cleanup = effects[5]!();
  const { onChange } = (connectVehicleHails as jest.Mock).mock.calls[0]![2];
  expect((connectVehicleHails as jest.Mock).mock.calls[0]![0]).toBe("v1");
  onChange();
  onChange();
  finishFirst([]);
  await settle();

  expect(api.hails).toHaveBeenCalledTimes(2);
  (cleanup as () => void)?.();
  expect(stop).toHaveBeenCalledTimes(1);
});

test("no live connection opens when this device cannot operate the shift", () => {
  (api.hails as jest.Mock).mockResolvedValue([]);
  effects = []; setters = [];
  useDashboardShift({ shift: { shiftId: "shift", vehicleId: "v1", isOnBreak: false } as any, refreshKey: 0, canOperate: false, isOnline: true });
  const cleanup = effects[5]!();
  expect(connectVehicleHails).not.toHaveBeenCalled();
  (cleanup as () => void)?.();
});

test("only a new pending hail plays the new-request sound", async () => {
  const future = new Date(Date.now() + 60_000).toISOString();
  (api.hails as jest.Mock).mockResolvedValue([hail("accepted", { status: "ACCEPTED", expiresAt: future })]);
  mount();
  let cleanup = effects[5]!();
  await settle();
  expect(audioCues.playHailSound).not.toHaveBeenCalled();
  (cleanup as () => void)?.();

  (api.hails as jest.Mock).mockResolvedValue([hail("new")]);
  mount();
  cleanup = effects[5]!();
  await settle();
  expect(audioCues.playHailSound).toHaveBeenCalledTimes(1);
  (cleanup as () => void)?.();
});

test("accepting turns the pin accepted and applies the server's end time", async () => {
  const serverEnd = new Date(Date.now() + 119_000).toISOString();
  (api.acceptHail as jest.Mock).mockResolvedValue(hail("h1", { status: "ACCEPTED", expiresAt: serverEnd }));
  (api.hails as jest.Mock).mockResolvedValue([]);
  const shift = mount();

  await shift.handleHail("h1", "accept");

  expect(api.acceptHail).toHaveBeenCalledWith("h1");
  expect(hailsAfter([hail("h1")])[0]).toMatchObject({ status: "ACCEPTED", expiresAt: serverEnd });
});

test("a failed accept puts the pin back and reports the error", async () => {
  (api.acceptHail as jest.Mock).mockRejectedValue(new Error("Hail is no longer pending"));
  (api.hails as jest.Mock).mockResolvedValue([]);
  const shift = mount();

  await shift.handleHail("h1", "accept");

  expect(hailsAfter([hail("h1")])[0]!.status).toBe("PENDING");
  expect(setters[13]).toHaveBeenCalledWith("Hail is no longer pending");
});

test("turning Full hides an accepted pin and later polls cannot restore it", async () => {
  const accepted = hail("h1", { status: "ACCEPTED", expiresAt: new Date(Date.now() + 60_000).toISOString() });
  mockVisibleHails = [accepted, hail("waiting")];
  (api.capacity as jest.Mock).mockResolvedValue({});
  (api.hails as jest.Mock).mockResolvedValue([accepted, hail("waiting")]);
  const shift = mount();

  await shift.updateCapacity("FULL");
  const cleanup = effects[5]!();
  await settle();

  expect(hailsAfter([accepted, hail("waiting")]).map((item: HailRequest) => item.id)).toEqual(["waiting"]);
  (cleanup as () => void)?.();
});

test("a confirmed break releases accepted pins, but a failed one keeps them", async () => {
  const accepted = hail("h1", { status: "ACCEPTED", expiresAt: new Date(Date.now() + 60_000).toISOString() });
  mockVisibleHails = [accepted];
  (api.breakStatus as jest.Mock).mockRejectedValueOnce(new Error("Offline"));
  let shift = mount();
  await shift.updateBreak();
  expect(hailsAfter([accepted])).toEqual([accepted]);

  (api.breakStatus as jest.Mock).mockResolvedValue({ isOnBreak: true });
  shift = mount();
  await shift.updateBreak();
  expect(hailsAfter([accepted])).toEqual([]);
});

test("only accepted hails past 1 km count as driven past", () => {
  const position = { latitude: 14.8, longitude: 120.9 };
  const far = { latitude: 14.82, longitude: 120.9 };
  expect(acceptedHailsOutOfRange([
    hail("near", { status: "ACCEPTED", ...position }),
    hail("far", { status: "ACCEPTED", ...far }),
    hail("pending-far", far),
  ], position)).toEqual(["far"]);
  expect(acceptedHailsOutOfRange([hail("far", { status: "ACCEPTED", ...far })], null)).toEqual([]);
});

test("only accepted pins are hidden by the phone's timer", () => {
  const now = Date.parse("2026-11-21T00:00:00Z");
  const past = "2026-11-20T23:59:00Z", future = "2026-11-21T00:01:00Z";
  const visible = activeHails([hail("old", { status: "ACCEPTED", expiresAt: past }), hail("live", { status: "ACCEPTED", expiresAt: future }), hail("pending", { expiresAt: past })], now);
  expect(visible.map(item => item.id)).toEqual(["live", "pending"]);
  expect(nextAcceptedExpiry(visible, now)).toBe(Date.parse(future));
  expect(nextAcceptedExpiry([hail("pending", { expiresAt: future })], now)).toBeNull();
});

test("a stale pending response cannot undo a local accept", () => {
  const accepts = new Map([["h1", "2026-11-21T00:02:00Z"], ["gone", "2026-11-21T00:02:00Z"]]);
  expect(applyLocalAccepts([hail("h1")], accepts)[0]).toMatchObject({ status: "ACCEPTED", expiresAt: "2026-11-21T00:02:00Z" });
  expect(accepts.has("gone")).toBe(false);
  applyLocalAccepts([hail("h1", { status: "ACCEPTED", expiresAt: "2026-11-21T00:01:59Z" })], accepts);
  expect(accepts.has("h1")).toBe(false);
});

test("countdown and marker ids format for the pickup card", () => {
  expect(formatHailCountdown(102_000)).toBe("1:42");
  expect(formatHailCountdown(-1)).toBe("0:00");
  expect(hailIdFromMarker("hail-abc")).toBe("abc");
  expect(hailIdFromMarker("vehicle")).toBeNull();
});
