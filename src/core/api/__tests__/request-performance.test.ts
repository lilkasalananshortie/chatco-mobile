/// <reference types="jest" />
jest.mock("../../storage/app-storage", () => ({
  appStorage: { getItem: jest.fn().mockResolvedValue("token-a"), removeItem: jest.fn() },
}));
import { appStorage } from "../../storage/app-storage";

let client: typeof import("../api-client");
const previousUrl = process.env.EXPO_PUBLIC_API_URL;
beforeAll(async () => {
  process.env.EXPO_PUBLIC_API_URL = "https://api.chatco.test";
  client = await import("../api-client");
});
afterAll(() => {
  if (previousUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = previousUrl;
});
beforeEach(() => { (appStorage.getItem as jest.Mock).mockResolvedValue("token-a"); });
afterEach(() => { jest.restoreAllMocks(); });
const success = () => ({ ok: true, json: async () => ({ data: { total: 17 } }) } as Response);

test("simultaneous reads share one fetch, but later reads get fresh financial data", async () => {
  const fetch = jest.spyOn(globalThis, "fetch").mockResolvedValue(success());
  expect(await Promise.all([client.request("/earnings"), client.request("/earnings")])).toEqual([{ total: 17 }, { total: 17 }]);
  expect(fetch).toHaveBeenCalledTimes(1);
  await client.request("/earnings");
  expect(fetch).toHaveBeenCalledTimes(2);
});

test("payment writes and reads with custom headers are never combined", async () => {
  const fetch = jest.spyOn(globalThis, "fetch").mockResolvedValue(success());
  await Promise.all([client.post("/payments", { id: 1 }), client.post("/payments", { id: 2 }),
    client.request("/profile", { headers: { "X-Device": "a" } }), client.request("/profile", { headers: { "X-Device": "b" } })]);
  expect(fetch).toHaveBeenCalledTimes(4);
});

test("reads from different sessions cannot share a response", async () => {
  let finish!: (value: Response) => void;
  const fetch = jest.spyOn(globalThis, "fetch").mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValue(success());
  const first = client.request("/session");
  await Promise.resolve(); await Promise.resolve();
  (appStorage.getItem as jest.Mock).mockResolvedValue("token-b");
  await client.request("/session");
  expect(fetch).toHaveBeenCalledTimes(2);
  finish(success()); await first;
});

test.each(["45", "Sun, 08 Nov 2026 00:00:45 GMT", "invalid"])("429 cooldown honors Retry-After %s without retrying writes", async (header) => {
  const now = Date.parse("2026-11-08T00:00:00Z");
  jest.spyOn(Date, "now").mockReturnValue(now);
  const path = `/limited-${header}`;
  const fetch = jest.spyOn(globalThis, "fetch").mockResolvedValueOnce({
    ok: false, status: 429, headers: new Headers({ "Retry-After": header }), json: async () => ({ message: "Slow down" }),
  } as Response).mockResolvedValue(success());
  await expect(client.post(path, {})).rejects.toBeInstanceOf(client.RateLimitError);
  await expect(client.post(path, {})).rejects.toBeInstanceOf(client.RateLimitError);
  expect(fetch).toHaveBeenCalledTimes(1);
  // The cooldown must not block unrelated actions or a newer login.
  await client.post("/unrelated-action", {});
  (appStorage.getItem as jest.Mock).mockResolvedValue("token-b");
  await client.post(path, {});
  (appStorage.getItem as jest.Mock).mockResolvedValue("token-a");
  jest.mocked(Date.now).mockReturnValue(now + 46_000);
  await client.post(path, {});
  expect(fetch).toHaveBeenCalledTimes(4);
});

test("a failed read releases its slot so a subsequent attempt can recover", async () => {
  const fetch = jest.spyOn(globalThis, "fetch").mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ message: "Unavailable" }) } as Response).mockResolvedValue(success());
  await expect(client.request("/recover")).rejects.toThrow("Unavailable");
  await expect(client.request("/recover")).resolves.toEqual({ total: 17 });
  expect(fetch).toHaveBeenCalledTimes(2);
});
