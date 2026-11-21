/// <reference types="jest" />
jest.mock("../../storage/app-storage", () => ({ appStorage: { getItem: jest.fn().mockResolvedValue("session-token"), removeItem: jest.fn() } }));
import { connectVehicleHails } from "../hail-realtime";

class FakeSocket {
  static instances: FakeSocket[] = [];
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  sent: any[] = [];
  closed = false;
  constructor(readonly url: string) { FakeSocket.instances.push(this); }
  send(data: string) { this.sent.push(JSON.parse(data)); }
  close() { this.closed = true; }
  receive(event: string, data: object = {}, channel?: string) {
    this.onmessage?.({ data: JSON.stringify({ event, data: JSON.stringify(data), channel }) });
  }
}

const CHANNEL = "private-vehicle.v1.hails";
const config = { key: "public-key", cluster: "ap1" };
const flush = async () => { for (let i = 0; i < 5; i += 1) await Promise.resolve(); };
const latest = () => FakeSocket.instances[FakeSocket.instances.length - 1]!;

function start(authorize: jest.Mock = jest.fn().mockResolvedValue("signed")) {
  const onChange = jest.fn(), onSubscribedChange = jest.fn();
  const realtime = connectVehicleHails("v1", authorize, { onChange, onSubscribedChange }, config)!;
  return { realtime, authorize, onChange, onSubscribedChange };
}
async function subscribe() {
  latest().receive("pusher:connection_established", { socket_id: "1.2", activity_timeout: 120 });
  await flush();
  latest().receive("pusher_internal:subscription_succeeded", {}, CHANNEL);
}

beforeEach(() => {
  jest.useFakeTimers();
  FakeSocket.instances = [];
  (globalThis as any).WebSocket = FakeSocket;
});
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  delete (globalThis as any).WebSocket;
});

test("without Pusher settings the app stays on polling", () => {
  expect(connectVehicleHails("v1", jest.fn(), { onChange: jest.fn(), onSubscribedChange: jest.fn() }, null)).toBeNull();
  expect(FakeSocket.instances).toHaveLength(0);
});

test("authorizes the vehicle's private channel, then refreshes to catch missed hails", async () => {
  const { authorize, onChange, onSubscribedChange } = start();
  expect(latest().url).toContain("wss://ws-ap1.pusher.com/app/public-key?protocol=7");
  await subscribe();
  expect(authorize).toHaveBeenCalledWith("1.2", CHANNEL);
  expect(latest().sent).toContainEqual({ event: "pusher:subscribe", data: { channel: CHANNEL, auth: "signed" } });
  expect(onSubscribedChange).toHaveBeenCalledWith(true);
  expect(onChange).toHaveBeenCalledTimes(1);
});

test("hail events on this channel refresh the list, and others are ignored", async () => {
  const { onChange } = start();
  await subscribe();
  onChange.mockClear();
  latest().receive("HailCreated", {}, CHANNEL);
  latest().receive("HailStatusChanged", {}, CHANNEL);
  latest().receive("HailCreated", {}, "private-vehicle.other.hails");
  latest().receive("SomethingElse", {}, CHANNEL);
  expect(onChange).toHaveBeenCalledTimes(2);
});

test("a failed authorization falls back to polling", async () => {
  const { onChange, onSubscribedChange } = start(jest.fn().mockRejectedValue(new Error("403")));
  latest().receive("pusher:connection_established", { socket_id: "1.2" });
  await flush();
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onSubscribedChange).not.toHaveBeenCalledWith(true);
});

test("a dropped connection reconnects with backoff and reports it is no longer live", async () => {
  const { onSubscribedChange } = start();
  await subscribe();
  latest().onclose?.({ code: 1006 });
  expect(onSubscribedChange).toHaveBeenLastCalledWith(false);
  jest.advanceTimersByTime(999);
  expect(FakeSocket.instances).toHaveLength(1);
  jest.advanceTimersByTime(1);
  expect(FakeSocket.instances).toHaveLength(2);
});

test("a permanent Pusher refusal stops reconnecting", () => {
  start();
  latest().onclose?.({ code: 4001 });
  jest.advanceTimersByTime(120_000);
  expect(FakeSocket.instances).toHaveLength(1);
});

test("a silent connection is pinged, then replaced when no answer arrives", async () => {
  const { onSubscribedChange } = start();
  await subscribe();
  const first = latest();
  jest.advanceTimersByTime(120_000);
  expect(first.sent).toContainEqual({ event: "pusher:ping", data: {} });
  jest.advanceTimersByTime(30_000);
  expect(first.closed).toBe(true);
  expect(onSubscribedChange).toHaveBeenLastCalledWith(false);
  jest.advanceTimersByTime(1000);
  expect(FakeSocket.instances).toHaveLength(2);
});

test("backgrounding closes the socket and returning reconnects; stop ends it", async () => {
  const { realtime } = start();
  await subscribe();
  const first = latest();
  realtime.setActive(false);
  expect(first.closed).toBe(true);
  jest.advanceTimersByTime(60_000);
  expect(FakeSocket.instances).toHaveLength(1);
  realtime.setActive(true);
  expect(FakeSocket.instances).toHaveLength(2);
  realtime.stop();
  expect(latest().closed).toBe(true);
  jest.advanceTimersByTime(60_000);
  expect(FakeSocket.instances).toHaveLength(2);
});

test("channel authorization posts the form to Laravel with the session token", async () => {
  jest.useRealTimers();
  const previous = process.env.EXPO_PUBLIC_API_URL;
  process.env.EXPO_PUBLIC_API_URL = "https://api.chatco.test";
  const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, json: async () => ({ auth: "key:signature" }) } as Response);
  try {
    let authorizeBroadcast!: typeof import("../api-client").authorizeBroadcast;
    await jest.isolateModulesAsync(async () => { ({ authorizeBroadcast } = await import("../api-client")); });
    await expect(authorizeBroadcast("1.2", CHANNEL)).resolves.toBe("key:signature");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.chatco.test/api/v1/broadcasting/auth");
    expect(init).toMatchObject({ method: "POST", body: "socket_id=1.2&channel_name=private-vehicle.v1.hails" });
    expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer session-token");
  } finally {
    fetchMock.mockRestore();
    if (previous === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = previous;
  }
});
