import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const isWeb = Platform.OS === "web";
const STORAGE_TIMEOUT_MS = 4000;

async function withStorageTimeout<T>(operation: Promise<T>, fallback: T): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<T>(resolve => {
        timeout = setTimeout(() => resolve(fallback), STORAGE_TIMEOUT_MS);
      }),
    ]);
  } catch {
    return fallback;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function webStorageAvailable() {
  return isWeb && typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export const appStorage = {
  async getItem(key: string): Promise<string | null> {
    if (webStorageAvailable()) {
      return window.localStorage.getItem(key);
    }
    return withStorageTimeout(AsyncStorage.getItem(key), null);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (webStorageAvailable()) {
      window.localStorage.setItem(key, value);
      return;
    }
    const saved = await withStorageTimeout(
      AsyncStorage.setItem(key, value).then(() => true),
      false,
    );
    if (!saved) throw new Error("Session storage is unavailable. Please restart the app and try again.");
  },

  async removeItem(key: string): Promise<void> {
    if (webStorageAvailable()) {
      window.localStorage.removeItem(key);
      return;
    }
    await withStorageTimeout(AsyncStorage.removeItem(key), undefined);
  },
};
