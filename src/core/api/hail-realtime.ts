/**
 * Small Pusher protocol client for one private hail channel, built on React
 * Native's WebSocket so the app needs no new native dependency. Events only
 * trigger a list refresh; the hail API stays the source of truth.
 */
const MAX_RETRY_MS = 30_000;
const PONG_TIMEOUT_MS = 30_000;
const DEFAULT_ACTIVITY_MS = 120_000;

export interface PusherConfig { key: string; cluster: string }
export interface HailRealtimeHandlers {
  onChange: () => void;
  onSubscribedChange: (subscribed: boolean) => void;
}
export interface HailRealtime {
  setActive: (active: boolean) => void;
  stop: () => void;
}
type Authorize = (socketId: string, channelName: string) => Promise<string>;
type Timer = ReturnType<typeof setTimeout> | null;

export function pusherConfig(): PusherConfig | null {
  const key = process.env.EXPO_PUBLIC_PUSHER_APP_KEY?.trim();
  const cluster = process.env.EXPO_PUBLIC_PUSHER_APP_CLUSTER?.trim();
  return key && cluster ? { key, cluster } : null;
}

function parseData(data: unknown): Record<string, any> {
  if (typeof data !== "string") return (data ?? {}) as Record<string, any>;
  try { return JSON.parse(data) ?? {}; } catch { return {}; }
}

const isPermanentRefusal = (code: unknown) => typeof code === "number" && code >= 4000 && code <= 4099;

/** Returns null when live updates aren't configured; the caller keeps polling. */
export function connectVehicleHails(
  vehicleId: string,
  authorize: Authorize,
  handlers: HailRealtimeHandlers,
  config: PusherConfig | null = pusherConfig(),
): HailRealtime | null {
  if (!config || typeof WebSocket === "undefined") return null;
  const channel = `private-vehicle.${vehicleId}.hails`;
  const url = `wss://ws-${config.cluster}.pusher.com/app/${encodeURIComponent(config.key)}?protocol=7&client=chatco-mobile&version=1.0&flash=false`;

  let socket: WebSocket | null = null;
  let wanted = true;
  let refused = false;
  let subscribed = false;
  let retries = 0;
  let activityMs = DEFAULT_ACTIVITY_MS;
  let retryTimer: Timer = null;
  let activityTimer: Timer = null;
  let pongTimer: Timer = null;

  const clearTimer = (timer: Timer): null => {
    if (timer) clearTimeout(timer);
    return null;
  };
  const clearHeartbeat = () => {
    activityTimer = clearTimer(activityTimer);
    pongTimer = clearTimer(pongTimer);
  };
  const setSubscribed = (next: boolean) => {
    if (subscribed === next) return;
    subscribed = next;
    handlers.onSubscribedChange(next);
  };
  const closeSocket = () => {
    const current = socket;
    socket = null;
    clearHeartbeat();
    setSubscribed(false);
    try { current?.close(); } catch { /* Already closed. */ }
  };
  const scheduleRetry = (delay = Math.min(1000 * 2 ** retries, MAX_RETRY_MS)) => {
    if (!wanted || refused || retryTimer) return;
    retries += 1;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      open();
    }, delay);
  };
  const send = (current: WebSocket, event: string, data: object) => {
    try { current.send(JSON.stringify({ event, data })); } catch { /* The close handler reconnects. */ }
  };
  // A mobile network can silently drop a socket, so confirm it after any quiet period.
  const armHeartbeat = (current: WebSocket) => {
    clearHeartbeat();
    activityTimer = setTimeout(() => {
      send(current, "pusher:ping", {});
      pongTimer = setTimeout(() => {
        if (socket !== current) return;
        closeSocket();
        scheduleRetry();
      }, PONG_TIMEOUT_MS);
    }, activityMs);
  };

  const handleMessage = (current: WebSocket, raw: string) => {
    let message: { event?: string; channel?: string; data?: unknown };
    try { message = JSON.parse(raw); } catch { return; }
    armHeartbeat(current);
    switch (message.event) {
      case "pusher:connection_established": {
        const data = parseData(message.data);
        retries = 0;
        if (Number(data.activity_timeout) > 0) activityMs = Math.min(Number(data.activity_timeout) * 1000, DEFAULT_ACTIVITY_MS);
        authorize(String(data.socket_id), channel)
          .then(auth => { if (socket === current) send(current, "pusher:subscribe", { channel, auth }); })
          .catch(() => {
            if (socket !== current) return;
            setSubscribed(false);
            handlers.onChange();
          });
        break;
      }
      case "pusher:ping":
        send(current, "pusher:pong", {});
        break;
      case "pusher_internal:subscription_succeeded":
        if (message.channel === channel) {
          setSubscribed(true);
          // Catches hails created before authentication or during a reconnect.
          handlers.onChange();
        }
        break;
      case "pusher:subscription_error":
        setSubscribed(false);
        handlers.onChange();
        break;
      case "pusher:error":
        if (isPermanentRefusal(parseData(message.data).code)) {
          refused = true;
          closeSocket();
        }
        break;
      case "HailCreated":
      case "HailStatusChanged":
        if (message.channel === channel) handlers.onChange();
        break;
    }
  };

  function open() {
    if (!wanted || refused || socket) return;
    retryTimer = clearTimer(retryTimer);
    let current: WebSocket;
    try {
      current = new WebSocket(url);
    } catch {
      scheduleRetry();
      return;
    }
    socket = current;
    current.onmessage = event => {
      if (socket === current) handleMessage(current, String(event.data));
    };
    current.onclose = event => {
      if (socket !== current) return;
      socket = null;
      clearHeartbeat();
      setSubscribed(false);
      if (isPermanentRefusal(event?.code)) {
        refused = true;
        return;
      }
      scheduleRetry(event?.code >= 4200 && event?.code <= 4299 ? 0 : undefined);
    };
  }

  open();

  return {
    setActive(active) {
      if (active === wanted) return;
      wanted = active;
      if (active) {
        retries = 0;
        open();
      } else {
        retryTimer = clearTimer(retryTimer);
        closeSocket();
      }
    },
    stop() {
      wanted = false;
      retryTimer = clearTimer(retryTimer);
      closeSocket();
    },
  };
}
