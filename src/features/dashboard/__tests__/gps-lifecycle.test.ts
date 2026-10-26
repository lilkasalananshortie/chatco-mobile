/// <reference types="jest" />
import { useDashboardGps } from "../hooks/useDashboardGps";
import * as Location from "expo-location";
import { api } from "../../../core/api/chatco-api";
import { evaluateSpeedWarning, getDistanceToCorridorMeters } from "../../../core/utils/corridor-guard";
let mockEffects: Array<() => any> = [];
let mockSetters: jest.Mock[] = [];
jest.mock("react", () => ({ useState: (value: any) => { const setter = jest.fn(); mockSetters.push(setter); return [typeof value === "function" ? value() : value, setter]; }, useRef: (value: any) => ({ current: value }), useEffect: (fn: () => any) => mockEffects.push(fn) }));
jest.mock("react-native", () => ({ Platform: { OS: "android" }, AppState: { addEventListener: jest.fn() } }));
jest.mock("expo-location", () => ({ requestForegroundPermissionsAsync: jest.fn(), requestBackgroundPermissionsAsync: jest.fn(), watchPositionAsync: jest.fn(), startLocationUpdatesAsync: jest.fn(), stopLocationUpdatesAsync: jest.fn(), hasStartedLocationUpdatesAsync: jest.fn(), Accuracy: { Balanced: 3 } }));
jest.mock("../location-task", () => ({ LOCATION_TASK_NAME: "test-location" }));
jest.mock("../../../core/api/chatco-api", () => ({ api: { location: jest.fn().mockResolvedValue({}) } }));
jest.mock("../../../core/api/fleet-service", () => ({ fleetService: {} }));
jest.mock("../../../core/storage/app-storage", () => ({ appStorage: {} }));
jest.mock("../../../core/utils/corridor-guard", () => ({ evaluateSpeedWarning: jest.fn(), getDistanceToCorridorMeters: jest.fn() }));
jest.mock("../../../core/utils/audio-cues", () => ({ audioCues: {} }));
const settle = async () => { for (let i = 0; i < 18; i++) await Promise.resolve(); };
function start() { useDashboardGps({ shift: { shiftId: "shift" } as any, canOperate: true, refreshKey: 0 }); return mockEffects[2]!(); }
beforeEach(() => {
  jest.clearAllMocks(); mockEffects = []; mockSetters = [];
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });
  (Location.requestBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: "denied" });
  (api.location as jest.Mock).mockResolvedValue({});
  (evaluateSpeedWarning as jest.Mock).mockReturnValue({ speedKmh: 0, isOverspeed: false, isNearLimit: false });
  (getDistanceToCorridorMeters as jest.Mock).mockReturnValue(0);
});
test("late foreground permission cannot start a watcher after shift cleanup", async () => {
  let finish!: (value: any) => void;
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockReturnValue(new Promise(done => { finish = done; }));
  const cleanup = start(); cleanup(); finish({ status: "granted" }); await settle();
  expect(Location.watchPositionAsync).not.toHaveBeenCalled();
});
test("watcher installed after cleanup is removed immediately", async () => {
  let finish!: (value: any) => void; const remove = jest.fn();
  (Location.watchPositionAsync as jest.Mock).mockReturnValue(new Promise(done => { finish = done; }));
  const cleanup = start(); await settle(); cleanup(); finish({ remove }); await settle();
  expect(remove).toHaveBeenCalledTimes(1);
});
test("normal shift cleanup stops its foreground watcher", async () => {
  const remove = jest.fn(); (Location.watchPositionAsync as jest.Mock).mockResolvedValue({ remove });
  const cleanup = start(); await settle(); cleanup(); await settle(); expect(remove).toHaveBeenCalledTimes(1);
});
test("tracking remains off before disclosure acceptance or when device cannot operate", async () => {
  useDashboardGps({ shift: { shiftId: "shift" } as any, canOperate: false, refreshKey: 0 });
  mockEffects[2]!(); await settle();
  expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  expect(Location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
});
test("foreground denial is visible and never requests background permission", async () => {
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: "denied" });
  const cleanup = start(); await settle();
  expect(mockSetters[5]).toHaveBeenLastCalledWith("denied");
  expect(mockSetters[4]).toHaveBeenLastCalledWith(expect.stringContaining("permission is denied"));
  expect(Location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled(); cleanup();
});
test("background denial keeps foreground watcher and explains the limitation", async () => {
  const remove = jest.fn(); (Location.watchPositionAsync as jest.Mock).mockResolvedValue({ remove });
  const cleanup = start(); await settle();
  expect(mockSetters[7]).toHaveBeenLastCalledWith(expect.stringContaining("Keep ChatCo open"));
  expect(remove).not.toHaveBeenCalled(); cleanup();
});
const fix = { coords: { latitude: 14.8, longitude: 120.8, speed: 0, heading: 0, accuracy: 5 }, timestamp: 10000 };
test("GPS fixes are not reported as uploaded until the backend confirms, and requests do not overlap", async () => {
  let finish!: () => void;
  (api.location as jest.Mock).mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
  (Location.watchPositionAsync as jest.Mock).mockResolvedValue({ remove: jest.fn() });
  const cleanup = start(); await settle();
  const sample = (Location.watchPositionAsync as jest.Mock).mock.calls[0][1];
  sample(fix); sample(fix);
  expect(api.location).toHaveBeenCalledTimes(1);
  expect(mockSetters[6]).toHaveBeenCalledTimes(1); // reset only, not a claimed upload
  expect(mockSetters[6]).toHaveBeenLastCalledWith(null);
  finish(); await settle(); expect(mockSetters[6]).toHaveBeenLastCalledWith(expect.any(Number)); cleanup();
});
test("failed upload is visible and a later fix retries without falsifying success", async () => {
  (api.location as jest.Mock).mockRejectedValueOnce(new Error("Rejected"));
  (Location.watchPositionAsync as jest.Mock).mockResolvedValue({ remove: jest.fn() });
  const cleanup = start(); await settle();
  const sample = (Location.watchPositionAsync as jest.Mock).mock.calls[0][1];
  sample(fix); await settle();
  expect(mockSetters[4]).toHaveBeenLastCalledWith(expect.stringContaining("update failed"));
  expect(mockSetters[6]).toHaveBeenLastCalledWith(null);
  sample(fix); await settle();
  expect(api.location).toHaveBeenCalledTimes(2);
  expect(mockSetters[4]).toHaveBeenLastCalledWith(""); cleanup();
});
test("upload response after shift cleanup cannot update status", async () => {
  let finish!: () => void; (api.location as jest.Mock).mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
  (Location.watchPositionAsync as jest.Mock).mockResolvedValue({ remove: jest.fn() });
  const cleanup = start(); await settle();
  (Location.watchPositionAsync as jest.Mock).mock.calls[0][1](fix); cleanup(); finish(); await settle();
  expect(mockSetters[6]).toHaveBeenLastCalledWith(null);
});
