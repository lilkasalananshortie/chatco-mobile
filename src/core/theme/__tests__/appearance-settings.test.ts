/// <reference types="jest" />
const mockSaved = new Map<string, string>();
jest.mock("../../storage/app-storage", () => ({ appStorage: {
  getItem: jest.fn(async (key: string) => mockSaved.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => { mockSaved.set(key, value); }),
} }));
jest.mock("react-native", () => ({ Platform: { OS: "web" }, StyleSheet: { create: (styles: unknown) => styles } }));
import { appearanceSettings } from "../appearance-settings";
import { createSettingsStyles } from "../../../features/settings/settings-styles";
import { createLocationStyles } from "../../../features/payments/styles/location-styles";

beforeEach(() => mockSaved.clear());

test.each(["light", "lofi"])("restores old %s appearance without enabling simplified styling", async mode => {
  mockSaved.set("chatco_ui_mode", mode);
  await expect(appearanceSettings.load()).resolves.toEqual({ isLight: true, isLowFidelity: false });
});

test("switching light on and off does not enable Lo-Fi, including after reload", async () => {
  await appearanceSettings.setLight(true);
  expect(mockSaved.get("chatco_ui_mode")).toBe("light");
  expect(mockSaved.has("chatco_low_fidelity")).toBe(false);
  await expect(appearanceSettings.load()).resolves.toEqual({ isLight: true, isLowFidelity: false });
  await appearanceSettings.setLight(false);
  await expect(appearanceSettings.load()).resolves.toEqual({ isLight: false, isLowFidelity: false });
});

test("the explicit Lo-Fi preference remains independent of light/dark", async () => {
  await appearanceSettings.setLight(true);
  await appearanceSettings.setLowFidelity(true);
  await appearanceSettings.setLight(false);
  await expect(appearanceSettings.load()).resolves.toEqual({ isLight: false, isLowFidelity: true });
  await appearanceSettings.setLowFidelity(false);
  await expect(appearanceSettings.load()).resolves.toEqual({ isLight: false, isLowFidelity: false });
});

test("normal light mode keeps rounded controls; only explicit Lo-Fi simplifies them", () => {
  const colors = { text: "#09213A", surface: "#FFFFFF", surface2: "#F1F5F9" } as Parameters<typeof createSettingsStyles>[0];
  expect(createSettingsStyles(colors, true, false).toggleTrack.borderRadius).toBe(14);
  expect(createSettingsStyles(colors, true, true).toggleTrack.borderRadius).toBe(4);
  expect(createLocationStyles(colors, true, false).locationCard.borderRadius).toBe(12);
  expect(createLocationStyles(colors, true, true).locationCard.borderRadius).toBe(4);
});
