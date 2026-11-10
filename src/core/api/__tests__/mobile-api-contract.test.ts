/// <reference types="jest" />
jest.mock("../../storage/app-storage", () => ({
  appStorage: { getItem: jest.fn().mockResolvedValue("session-token"), removeItem: jest.fn() },
}));
import { appStorage } from "../../storage/app-storage";

let client: typeof import("../api-client");
let auth: typeof import("../auth-service");
const previousUrl = process.env.EXPO_PUBLIC_API_URL;

beforeAll(async () => {
  process.env.EXPO_PUBLIC_API_URL = "https://api.chatco.test";
  client = await import("../api-client");
  auth = await import("../auth-service");
});
afterAll(() => {
  if (previousUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = previousUrl;
});
beforeEach(() => { jest.clearAllMocks(); (appStorage.getItem as jest.Mock).mockResolvedValue("session-token"); });
afterEach(() => jest.restoreAllMocks());

test("fare signout removes only authentication, preserving server shift and queued cash", async () => {
  const ended = jest.fn();
  client.resetSessionEndedNotified();
  const cleanup = client.setSessionEndedHandler(ended);
  const fetchMock = jest.spyOn(globalThis, "fetch");
  try {
    await client.endSessionForFareChange("session-token");
    expect(appStorage.removeItem).toHaveBeenCalledTimes(1);
    expect(appStorage.removeItem).toHaveBeenCalledWith(client.TOKEN_KEY);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(ended).toHaveBeenCalledWith(expect.stringContaining("your shift stays open"));
  } finally { cleanup(); }
});

test("late fare update cannot sign out a newer login", async () => {
  await client.endSessionForFareChange("old-token");
  expect(appStorage.removeItem).not.toHaveBeenCalled();
});

test("a slow logout response cannot clear a newer login", async () => {
  (appStorage.getItem as jest.Mock)
    .mockResolvedValueOnce("old-token")
    .mockResolvedValueOnce("old-token")
    .mockResolvedValueOnce("new-token");
  jest.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, json: async () => ({ data: null }) } as Response);
  await auth.authService.logout();
  expect(appStorage.removeItem).not.toHaveBeenCalled();
});

test("server-confirmed ended shifts invalidate operations without removing authentication or queued cash", async () => {
  const ended = jest.fn(); const cleanup = client.setShiftEndedHandler(ended);
  jest.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false, status: 409,
    json: async () => ({ message: "The shift has already ended; no new transaction can be recorded." }),
  } as Response);
  try {
    await expect(client.post("/mobile/conductor/transactions/cash", {})).rejects.toThrow("shift has already ended");
    expect(ended).toHaveBeenCalledTimes(1);
    expect(appStorage.removeItem).not.toHaveBeenCalled();
  } finally { cleanup(); }
});

test("mobile requests retain bearer authentication and unwrap the existing envelope", async () => {
  const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true, json: async () => ({ success: true, data: { id: "shared-account" } }),
  } as Response);
  expect(await client.request("/mobile/user")).toEqual({ id: "shared-account" });
  expect(fetchMock).toHaveBeenCalledWith("https://api.chatco.test/api/v1/mobile/user",
    expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer session-token" }) }));
});

test("a timed-out request reports a network timeout without a red console error", async () => {
  jest.useFakeTimers();
  const errorLog = jest.spyOn(console, "error").mockImplementation(() => undefined);
  jest.spyOn(globalThis, "fetch").mockImplementation((_url, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("signal is aborted without reason"), { name: "AbortError" })));
  }));
  try {
    const pending = client.request("/mobile/conductor/transactions?shift_id=shift-1");
    const assertion = expect(pending).rejects.toThrow("did not respond within 15s");
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(client.REQUEST_TIMEOUT_MS);
    await assertion;
    expect(errorLog).not.toHaveBeenCalled();
  } finally {
    jest.useRealTimers();
  }
});

test("an unrelated abort is not mislabeled as a server timeout", async () => {
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  jest.spyOn(globalThis, "fetch").mockRejectedValue(Object.assign(new Error("cancelled"), { name: "AbortError" }));
  await expect(client.request("/mobile/user")).rejects.toThrow("request was cancelled");
  expect(console.error).not.toHaveBeenCalled();
});

test("invalid mobile login does not revoke an existing local session", async () => {
  jest.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: false, status: 401, json: async () => ({ message: "Invalid credentials" }),
  } as Response);
  await expect(client.request("/mobile/auth/login")).rejects.toThrow("Invalid credentials");
  expect(appStorage.removeItem).not.toHaveBeenCalled();
});

test("expired authentication on a protected mobile route clears the session", async () => {
  const ended = jest.fn();
  client.resetSessionEndedNotified();
  const cleanup = client.setSessionEndedHandler(ended);
  jest.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: false, status: 401, json: async () => ({ message: "Unauthenticated" }),
  } as Response);
  try {
    await expect(client.request("/mobile/user")).rejects.toThrow("Unauthenticated");
    expect(appStorage.removeItem).toHaveBeenCalledWith(client.TOKEN_KEY);
    expect(ended).toHaveBeenCalledTimes(1);
  } finally {
    cleanup();
  }
});

test("paginated payload remains intact for mobile response mappers", async () => {
  const page = { data: [{ id: "ride-1" }], current_page: 2, last_page: 4, total: 70 };
  jest.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true, json: async () => ({ data: page }),
  } as Response);
  expect(await client.request("/mobile/commuter/payments?page=2")).toEqual(page);
});

test("late 401 from an older token cannot clear a newly authenticated session", async () => {
  let finish!: (response: Response) => void;
  (appStorage.getItem as jest.Mock).mockResolvedValueOnce("old-token").mockResolvedValue("new-token");
  jest.spyOn(globalThis, "fetch").mockReturnValue(new Promise(done => { finish = done; }));
  const pending = client.request("/mobile/user");
  await Promise.resolve();
  finish({ ok: false, status: 401, json: async () => ({ message: "Unauthenticated" }) } as Response);
  await expect(pending).rejects.toThrow("Unauthenticated");
  expect(appStorage.removeItem).not.toHaveBeenCalled();
});
