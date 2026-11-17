/// <reference types="jest" />
import { useDashboardShift } from "../hooks/useDashboardShift";
import { api } from "../../../core/api/chatco-api";

let effects: Array<() => void | (() => void)> = [];
let setters: jest.Mock[] = [];
jest.mock("react", () => ({ ...jest.requireActual("react"),
  useState: (value: unknown) => { const setter = jest.fn(); setters.push(setter); return [value, setter]; },
  useRef: (value: unknown) => ({ current: value }),
  useMemo: (fn: () => unknown) => fn(),
  useCallback: (fn: unknown) => fn,
  useEffect: (fn: () => void | (() => void)) => effects.push(fn),
}));
jest.mock("react-native", () => ({ AppState: { currentState: "active", addEventListener: jest.fn(() => ({ remove: jest.fn() })) } }));
jest.mock("../../../core/api/chatco-api", () => ({ api: { getSyncState: () => "idle", hails: jest.fn() } }));
jest.mock("../../../core/utils/audio-cues", () => ({ audioCues: { playHailSound: jest.fn() } }));
jest.mock("../../../core/utils/haptics", () => ({ appHaptics: {} }));

test("a failed hail refresh keeps the last visible requests", async () => {
  effects = []; setters = [];
  (api.hails as jest.Mock).mockRejectedValue(new Error("Temporary request failure"));
  useDashboardShift({ shift: { shiftId: "shift", isOnBreak: false } as any, refreshKey: 0, canOperate: true, isOnline: true });

  const cleanup = effects[5]!();
  await Promise.resolve();
  await Promise.resolve();

  expect(api.hails).toHaveBeenCalledTimes(1);
  expect(setters[6]).not.toHaveBeenCalled();
  cleanup?.();
});
