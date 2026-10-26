/// <reference types="jest" />
import React from "react";
import { useDashboardShift } from "../hooks/useDashboardShift";
import { api } from "../../../core/api/chatco-api";
import { AppState } from "react-native";
let mockEffects: Array<() => any> = [];
let mockSetters: jest.Mock[] = [];
jest.mock("react", () => ({ ...jest.requireActual("react"),
  useState: (value: any) => { const setter = jest.fn(); mockSetters.push(setter); return [value, setter]; },
  useRef: (value: any) => ({ current: value }), useMemo: (fn: () => any) => fn(), useCallback: (fn: unknown) => fn,
  useEffect: (fn: () => any) => mockEffects.push(fn),
}));
jest.mock("react-native", () => ({ AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) } }));
jest.mock("../../../core/api/chatco-api", () => ({ api: { getSyncState: () => "idle", announcements: jest.fn() } }));
jest.mock("../../../core/utils/audio-cues", () => ({ audioCues: {} }));
jest.mock("../../../core/utils/haptics", () => ({ appHaptics: {} }));
const mount = () => {
  useDashboardShift({ shift: { shiftId: "s", isOnBreak: false } as any, refreshKey: 0, canOperate: true, isOnline: true });
  return mockEffects[0]!();
};
const settle = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); mockEffects = []; mockSetters = []; });
afterEach(() => jest.useRealTimers());
test("announcements actually populate from the backend on mount", async () => {
  (api.announcements as jest.Mock).mockResolvedValue([{ id: "notice" }]);
  const cleanup = mount(); await settle();
  expect(mockSetters[7]).toHaveBeenLastCalledWith([{ id: "notice" }]); cleanup();
});
test("poll and foreground refresh load new notices", async () => {
  (api.announcements as jest.Mock).mockResolvedValue([]);
  const cleanup = mount(); await settle(); await jest.advanceTimersByTimeAsync(30000);
  expect(api.announcements).toHaveBeenCalledTimes(2);
  (AppState.addEventListener as jest.Mock).mock.calls[0][1]("active"); await settle();
  expect(api.announcements).toHaveBeenCalledTimes(3); cleanup();
});
test("late notice results cannot update an unmounted shift", async () => {
  let finish!: (value: any) => void;
  (api.announcements as jest.Mock).mockReturnValue(new Promise(done => { finish = done; }));
  const cleanup = mount(); cleanup(); finish([{ id: "old" }]); await settle();
  expect(mockSetters[7]).toHaveBeenCalledTimes(1);
});
