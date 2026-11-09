/// <reference types="jest" />
let mockEffect: () => () => void;
jest.mock("react", () => ({ useEffect: (effect: typeof mockEffect) => { mockEffect = effect; } }));
jest.mock("expo-keep-awake", () => ({ isAvailableAsync: jest.fn(), activateKeepAwakeAsync: jest.fn(), deactivateKeepAwake: jest.fn() }));
import { activateKeepAwakeAsync, deactivateKeepAwake, isAvailableAsync } from "expo-keep-awake";
import { useDashboardKeepAwake } from "../hooks/useDashboardKeepAwake";
const settle = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };
const mount = () => { useDashboardKeepAwake(); return mockEffect(); };
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(isAvailableAsync).mockResolvedValue(true);
  jest.mocked(activateKeepAwakeAsync).mockResolvedValue();
  jest.mocked(deactivateKeepAwake).mockResolvedValue();
});

test("unmount during pending activation waits before releasing the same tag", async () => {
  let finish!: () => void;
  jest.mocked(activateKeepAwakeAsync).mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const cleanup = mount(); await settle(); cleanup();
  expect(deactivateKeepAwake).not.toHaveBeenCalled();
  finish(); await settle();
  expect(deactivateKeepAwake).toHaveBeenCalledWith(jest.mocked(activateKeepAwakeAsync).mock.calls[0]![0]);
});

test("a denied or unsupported browser never releases a nonexistent lock", async () => {
  jest.mocked(activateKeepAwakeAsync).mockRejectedValueOnce(new Error("NotAllowedError"));
  const cleanup = mount(); await settle(); cleanup();
  jest.mocked(isAvailableAsync).mockResolvedValue(false);
  const unsupportedCleanup = mount(); await settle(); unsupportedCleanup();
  expect(deactivateKeepAwake).not.toHaveBeenCalled();
  expect(activateKeepAwakeAsync).toHaveBeenCalledTimes(1);
});

test("cleanup before the availability check finishes never acquires a lock", async () => {
  const cleanup = mount(); cleanup(); await settle();
  expect(activateKeepAwakeAsync).not.toHaveBeenCalled();
});

test("fast remounts use distinct tags and release each acquired lock once", async () => {
  const first = mount(); const second = mount(); await settle();
  const tags = jest.mocked(activateKeepAwakeAsync).mock.calls.map(args => args[0]);
  expect(new Set(tags).size).toBe(2);
  first(); first(); second(); await settle();
  expect(deactivateKeepAwake).toHaveBeenCalledTimes(2);
});

test("a release rejection is handled during navigation", async () => {
  jest.mocked(deactivateKeepAwake).mockRejectedValueOnce(new Error("Already released"));
  const cleanup = mount(); await settle(); cleanup(); await settle();
  expect(deactivateKeepAwake).toHaveBeenCalledTimes(1);
});
