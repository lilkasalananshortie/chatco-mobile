import { requireOptionalNativeModule } from "expo";

let maps: typeof import("expo-maps") | null | undefined;

/** Expo Go and older development builds may not contain ExpoMaps. Importing
 * expo-maps eagerly throws before the app's error boundary can mount. */
export function getNativeMaps(): typeof import("expo-maps") | null {
  if (maps !== undefined) return maps;
  try {
    maps = requireOptionalNativeModule("ExpoMaps") ? require("expo-maps") : null;
  } catch {
    maps = null;
  }
  return maps ?? null;
}
