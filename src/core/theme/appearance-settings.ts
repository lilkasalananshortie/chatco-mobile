import { appStorage } from "../storage/app-storage";

const MODE_KEY = "chatco_ui_mode";
const LOW_FIDELITY_KEY = "chatco_low_fidelity";

export const appearanceSettings = {
  async load() {
    const [mode, lowFidelity] = await Promise.all([
      appStorage.getItem(MODE_KEY),
      appStorage.getItem(LOW_FIDELITY_KEY),
    ]);
    // The old sun/moon toggle also stored "lofi". Restore its light palette,
    // but require the separate preference to enable simplified styling.
    return { isLight: mode === "light" || mode === "lofi", isLowFidelity: lowFidelity === "true" };
  },
  setLight(value: boolean) { return appStorage.setItem(MODE_KEY, value ? "light" : "dark"); },
  setLowFidelity(value: boolean) { return appStorage.setItem(LOW_FIDELITY_KEY, String(value)); },
};
