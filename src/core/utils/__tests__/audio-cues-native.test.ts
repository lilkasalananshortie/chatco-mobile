/// <reference types="jest" />
import { Platform } from "react-native";
import { appStorage } from "../../storage/app-storage";
import { audioCues, loadScanSoundSetting, setAudioCuesActive, setScanSoundEnabled } from "../audio-cues";
import { appHaptics } from "../haptics";
import { playNativeCue } from "../native-audio";

jest.mock("react-native", () => ({ Platform: { OS: "android" } }));
jest.mock("../../storage/app-storage", () => ({ appStorage: { getItem: jest.fn(), setItem: jest.fn() } }));
jest.mock("../haptics", () => ({ appHaptics: { light: jest.fn(), medium: jest.fn(), success: jest.fn(), error: jest.fn() } }));
jest.mock("../native-audio", () => ({ playNativeCue: jest.fn(), preloadNativeAudio: jest.fn() }));

async function flushCue() {
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(async () => {
  (appStorage.getItem as jest.Mock).mockResolvedValue("on");
  (appStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  await setAudioCuesActive(true);
  await loadScanSoundSetting();
  jest.clearAllMocks();
});

test("each operational cue reaches native playback", async () => {
  expect(Platform.OS).toBe("android");
  audioCues.playPaymentSound();
  audioCues.playCapacitySound();
  audioCues.playHailSound();
  audioCues.playWarningSound();
  audioCues.playDutySound();
  audioCues.playSyncSound();
  await flushCue();
  expect((playNativeCue as jest.Mock).mock.calls.map(([name]) => name)).toEqual([
    "payment", "capacity", "hail", "warning", "duty", "sync",
  ]);
});

test("scan sound preference blocks the native payment cue and its haptic", async () => {
  await setScanSoundEnabled(false);
  audioCues.playPaymentSound();
  await flushCue();
  expect(playNativeCue).not.toHaveBeenCalled();
  expect(appHaptics.success).not.toHaveBeenCalled();
});

test("all operational cues still vibrate when in-app sound is disabled", async () => {
  await setAudioCuesActive(false);
  audioCues.playPaymentSound();
  audioCues.playCapacitySound();
  audioCues.playHailSound();
  audioCues.playWarningSound();
  audioCues.playDutySound();
  audioCues.playSyncSound();
  await flushCue();
  expect(appHaptics.success).toHaveBeenCalledTimes(2);
  expect(appHaptics.medium).toHaveBeenCalled();
  expect(appHaptics.error).toHaveBeenCalled();
  expect(appHaptics.light).toHaveBeenCalled();
  expect(playNativeCue).not.toHaveBeenCalled();
});
