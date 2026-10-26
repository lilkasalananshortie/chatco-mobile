/// <reference types="jest" />
jest.mock("expo-speech", () => ({ speak: jest.fn() }));
jest.mock("../../../core/utils/haptics", () => ({ appHaptics: { error: jest.fn() } }));
jest.mock("../../../core/utils/audio-cues", () => ({ audioCues: { playWarningSound: jest.fn() } }));
import { evaluateSpeedWarning, getDistanceToCorridorMeters } from "../../../core/utils/corridor-guard";
test("custom backend limit replaces the old fixed 50 km/h threshold", () => {
  expect(evaluateSpeedWarning(40 / 3.6, 35)).toMatchObject({ isOverspeed: true, isNearLimit: false });
  expect(evaluateSpeedWarning(40 / 3.6, 50)).toMatchObject({ isOverspeed: false, isNearLimit: false });
});
test("near-limit warning scales with the configured speed limit", () => {
  expect(evaluateSpeedWarning(37 / 3.6, 40)).toMatchObject({ isNearLimit: true, isOverspeed: false });
});
test("corridor uses the supplied published route instead of the old bundled route", () => {
  expect(getDistanceToCorridorMeters(10, 10.01, [[10, 10], [10, 10.02]])).toBe(0);
  expect(getDistanceToCorridorMeters(10, 10.01)).toBeGreaterThan(300);
});
