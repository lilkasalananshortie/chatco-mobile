/// <reference types="jest" />
import React from "react";
import { useDashboardShift } from "../hooks/useDashboardShift";
import { api } from "../../../core/api/chatco-api";

let mockEffects: Array<() => any> = [];
jest.mock("react", () => ({ ...jest.requireActual("react"),
  useState: (value: any) => [value, jest.fn()],
  useRef: (value: any) => ({ current: value }), useMemo: (fn: () => any) => fn(), useCallback: (fn: unknown) => fn,
  useEffect: (fn: () => any) => mockEffects.push(fn),
}));
jest.mock("react-native", () => ({ AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) } }));
jest.mock("../../../core/api/chatco-api", () => ({ api: { getSyncState: () => "idle", getDeviceId: jest.fn().mockResolvedValue("device") } }));
jest.mock("../../../core/utils/audio-cues", () => ({ audioCues: {} }));
jest.mock("../../../core/utils/haptics", () => ({ appHaptics: {} }));

beforeEach(() => { mockEffects = []; jest.clearAllMocks(); });

test("dashboard does not poll the unused conductor announcement feed", () => {
  useDashboardShift({ shift: { shiftId: "s", isOnBreak: false } as any, refreshKey: 0, canOperate: true, isOnline: true });
  const firstEffectCleanup = mockEffects[0]!();
  expect(api.getDeviceId).toHaveBeenCalledTimes(1);
  expect((api as any).announcements).toBeUndefined();
  firstEffectCleanup?.();
});
