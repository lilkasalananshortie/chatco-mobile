/**
 * app-storage.ts
 *
 * Unified cross-platform storage abstraction for ChatCo Mobile.
 *
 * Storage strategy:
 * - Web:    window.localStorage (synchronous, no capacity issues for our use case)
 * - Native (session token only): expo-secure-store (iOS Keychain / Android Keystore)
 * - Native (all other keys): @react-native-async-storage/async-storage
 *
 * Ordinary operations use a 4-second timeout. Financial reads reject failures;
 * financial mutations await actual completion so late native writes cannot
 * overtake a newer queued mutation. No timeout is treated as a saved cash fare.
 *
 * SECURE_KEYS contains only "chatco_session" — the Sanctum bearer token.
 * All other keys (queue, settings, cache) use AsyncStorage.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const isWeb = Platform.OS === "web";
const STORAGE_TIMEOUT_MS = 4000;
const SECURE_KEYS = new Set(["chatco_session"]);

function secureStorageAvailable(key: string) {
  return !isWeb && SECURE_KEYS.has(key);
}

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
  async getItem(key: string, options?: { strict?: boolean }): Promise<string | null> {
    if (webStorageAvailable()) {
      return window.localStorage.getItem(key);
    }
    if (options?.strict) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          secureStorageAvailable(key) ? SecureStore.getItemAsync(key) : AsyncStorage.getItem(key),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error("Saved cash could not be read. Please retry; no transactions were replaced.")), STORAGE_TIMEOUT_MS);
          }),
        ]);
      } finally { if (timer) clearTimeout(timer); }
    }
    if (secureStorageAvailable(key)) {
      return withStorageTimeout(SecureStore.getItemAsync(key), null);
    }
    return withStorageTimeout(AsyncStorage.getItem(key), null);
  },

  async setItem(key: string, value: string, options?: { strict?: boolean }): Promise<void> {
    if (webStorageAvailable()) {
      window.localStorage.setItem(key, value);
      return;
    }
    if (options?.strict) {
      // Await actual persistence: a timed-out write may still finish later and
      // must not overtake a newer financial queue mutation.
      if (secureStorageAvailable(key)) await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
      else await AsyncStorage.setItem(key, value);
      return;
    }
    if (secureStorageAvailable(key)) {
      const saved = await withStorageTimeout(
        SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }).then(() => true),
        false,
      );
      if (!saved) throw new Error("Secure session storage is unavailable. Please restart the app and try again.");
      return;
    }
    const saved = await withStorageTimeout(
      AsyncStorage.setItem(key, value).then(() => true),
      false,
    );
    if (!saved) throw new Error("Session storage is unavailable. Please restart the app and try again.");
  },

  async removeItem(key: string, options?: { strict?: boolean }): Promise<void> {
    if (webStorageAvailable()) {
      window.localStorage.removeItem(key);
      return;
    }
    if (options?.strict) {
      if (secureStorageAvailable(key)) await SecureStore.deleteItemAsync(key);
      else await AsyncStorage.removeItem(key);
      return;
    }
    if (secureStorageAvailable(key)) {
      await withStorageTimeout(SecureStore.deleteItemAsync(key), undefined);
      return;
    }
    await withStorageTimeout(AsyncStorage.removeItem(key), undefined);
  },
};
