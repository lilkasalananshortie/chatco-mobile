import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const isWeb = Platform.OS === "web";

function webStorageAvailable() {
  return isWeb && typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export const appStorage = {
  async getItem(key: string): Promise<string | null> {
    if (webStorageAvailable()) {
      return window.localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (webStorageAvailable()) {
      window.localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },

  async removeItem(key: string): Promise<void> {
    if (webStorageAvailable()) {
      window.localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
