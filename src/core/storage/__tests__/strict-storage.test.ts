/// <reference types="jest" />
jest.mock("react-native", () => ({ Platform: { OS: "android" } }));
jest.mock("@react-native-async-storage/async-storage", () => ({ getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() }));
jest.mock("expo-secure-store", () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
import AsyncStorage from "@react-native-async-storage/async-storage";
import { appStorage } from "../app-storage";
beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.useRealTimers());
test("strict financial reads propagate errors instead of empty queue", async () => {
  (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error("disk failure"));
  await expect(appStorage.getItem("cash", { strict: true })).rejects.toThrow("disk failure");
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});
test("strict financial read timeout rejects and does not write", async () => {
  jest.useFakeTimers();
  (AsyncStorage.getItem as jest.Mock).mockReturnValue(new Promise(() => undefined));
  const pending = expect(appStorage.getItem("cash", { strict: true })).rejects.toThrow("no transactions were replaced");
  await jest.advanceTimersByTimeAsync(4000); await pending;
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});
test("missing stored data is still a real null", async () => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  await expect(appStorage.getItem("cash", { strict: true })).resolves.toBeNull();
});
test("nonfinancial reads retain their compatible fallback", async () => {
  (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error("disk failure"));
  await expect(appStorage.getItem("theme")).resolves.toBeNull();
});

test("financial writes await actual native completion beyond the ordinary timeout", async () => {
  jest.useFakeTimers();
  let finish!: () => void; let completed = false;
  (AsyncStorage.setItem as jest.Mock).mockReturnValue(new Promise<void>(done => { finish = done; }));
  const pending = appStorage.setItem("cash", "saved", { strict: true }).then(() => { completed = true; });
  await jest.advanceTimersByTimeAsync(5000); expect(completed).toBe(false);
  finish(); await pending; expect(completed).toBe(true);
});
test("financial deletion errors propagate instead of acknowledging removal", async () => {
  (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(new Error("delete failed"));
  await expect(appStorage.removeItem("cash", { strict: true })).rejects.toThrow("delete failed");
});
