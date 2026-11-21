/// <reference types="jest" />
const mockStore = new Map<string, string>();
const mockGetItem = jest.fn();
jest.mock("../app-storage", () => ({ appStorage: {
  getItem: (key: string, options?: { strict?: boolean }) => mockGetItem(key, options),
  setItem: async (key: string, value: string) => { mockStore.set(key, value); },
} }));

const KEY = "chatco_conductor_device_v1";
const load = () => {
  let module!: typeof import("../device-id");
  jest.isolateModules(() => { module = require("../device-id"); });
  return module.getConductorDeviceId;
};

beforeEach(() => {
  mockStore.clear();
  mockGetItem.mockReset();
  mockGetItem.mockImplementation(async (key: string) => mockStore.get(key) ?? null);
});

test("a failed storage read keeps the saved ID instead of replacing it", async () => {
  mockStore.set(KEY, "mobile-original-device-id");
  mockGetItem.mockRejectedValueOnce(new Error("read timeout"));
  const getId = load();
  await expect(getId()).rejects.toThrow("read timeout");
  expect(mockStore.get(KEY)).toBe("mobile-original-device-id");
  await expect(getId()).resolves.toBe("mobile-original-device-id");
});

test("the read is strict so a timeout cannot look like a missing ID", async () => {
  mockStore.set(KEY, "mobile-original-device-id");
  await load()();
  expect(mockGetItem).toHaveBeenCalledWith(KEY, { strict: true });
});

test("simultaneous first calls create one ID", async () => {
  const getId = load();
  const [first, second] = await Promise.all([getId(), getId()]);
  expect(first).toBe(second);
  expect(mockStore.get(KEY)).toBe(first);
  expect(first.length).toBeGreaterThanOrEqual(16);
});
