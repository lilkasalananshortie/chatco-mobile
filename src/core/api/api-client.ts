import { appStorage } from "../storage/app-storage";

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");
export const TOKEN_KEY = "chatco_session";
export const REQUEST_TIMEOUT_MS = 15000;

export const CACHED_UNITS_KEY = "chatco_cached_units";
export const CACHED_DRIVERS_KEY = "chatco_cached_drivers";
export const CACHED_PROFILE_KEY = "chatco_cached_profile";
export const CACHED_USER_KEY = "chatco_cached_user";
export const PROVISIONAL_SHIFT_KEY = "chatco_provisional_shift";

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

type Envelope<T> = { data: T; message?: string; errors?: unknown };

let sessionEndedHandler: ((message?: string) => void) | null = null;
let sessionEndedNotified = false;
let shiftEndedHandler: (() => void) | null = null;
export function setShiftEndedHandler(handler: () => void): () => void {
  shiftEndedHandler = handler;
  return () => { if (shiftEndedHandler === handler) shiftEndedHandler = null; };
}

// Share only simultaneous default reads. Never cache financial responses or
// combine writes, custom headers, or independently cancellable requests.
const pendingReads = new Map<string, Promise<unknown>>();
const cooldowns = new Map<string, number>();

export class RateLimitError extends Error {
  readonly status = 429;
  readonly response: { status: number; data: unknown };
  constructor(readonly retryAt: number, payload?: unknown) {
    super(`Too many requests. Please try again in ${Math.max(1, Math.ceil((retryAt - Date.now()) / 1000))} seconds.`);
    this.name = "RateLimitError";
    this.response = { status: 429, data: payload };
  }
}

/**
 * Lets the application shell react immediately when another device replaces
 * this device's conductor session.
 */
export function setSessionEndedHandler(handler: ((message?: string) => void) | null): () => void {
  sessionEndedHandler = handler;
  return () => {
    if (sessionEndedHandler === handler) sessionEndedHandler = null;
  };
}

export function resetSessionEndedNotified() {
  sessionEndedNotified = false;
}

/** Fare changes end only this session, never the shift or its pending cash. */
export async function endSessionForFareChange(expectedToken: string): Promise<void> {
  if (await appStorage.getItem(TOKEN_KEY) !== expectedToken) return;
  await appStorage.removeItem(TOKEN_KEY);
  if (!sessionEndedNotified) {
    sessionEndedNotified = true;
    sessionEndedHandler?.("Fares or fare points were updated by an admin. Sign in again to continue; your shift stays open. Pending offline cash remains saved.");
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new Error("Set EXPO_PUBLIC_API_URL in your .env file.");
  const token = await appStorage.getItem(TOKEN_KEY);
  const key = JSON.stringify([token, (init.method ?? "GET").toUpperCase(), path]);
  const retryAt = cooldowns.get(key);
  if (retryAt && retryAt > Date.now()) throw new RateLimitError(retryAt);
  cooldowns.delete(key);
  const shareRead = Object.keys(init).length === 0;
  if (shareRead) {
    const pending = pendingReads.get(key);
    if (pending) return pending as Promise<T>;
  }
  const pending = performRequest<T>(path, init, token, key);
  if (shareRead) pendingReads.set(key, pending);
  try {
    return await pending;
  } finally {
    if (shareRead && pendingReads.get(key) === pending) pendingReads.delete(key);
  }
}

async function performRequest<T>(path: string, init: RequestInit, token: string | null, key: string): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  let response: Response;
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;

  try {
    response = await fetch(`${API_URL}/api/v1${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch (cause) {
    if (timedOut) {
      throw new NetworkError(`The ChatCo server did not respond within ${REQUEST_TIMEOUT_MS / 1000}s. Check your connection and try again.`);
    }
    if (cause instanceof Error && cause.name === "AbortError") {
      throw new NetworkError("The request was cancelled. Please try again.");
    }
    const errorDetail = cause instanceof Error ? cause.message : String(cause);
    console.warn(`[API Network Error] ${init.method ?? "GET"} ${API_URL}/api/v1${path}:`, cause);
    throw new NetworkError(
      `Unable to reach the ChatCo server (${errorDetail}). Target: ${API_URL}. Check your internet connection or host settings.`
    );
  } finally {
    clearTimeout(timeout);
  }
  const payload = (await response.json().catch(() => null)) as Envelope<T> | null;
  if (!response.ok) {
    if (response.status === 429) {
      const header = response.headers?.get("Retry-After")?.trim();
      const delay = header && /^\d+$/.test(header) ? Number(header) * 1000 : NaN;
      const date = header ? Date.parse(header) : NaN;
      const retryAt = Number.isFinite(delay) ? Date.now() + delay
        : Number.isFinite(date) ? Math.max(Date.now(), date) : Date.now() + 30_000;
      for (const [entry, until] of cooldowns) if (until <= Date.now()) cooldowns.delete(entry);
      if (cooldowns.size >= 128) cooldowns.delete(cooldowns.keys().next().value!);
      cooldowns.set(key, retryAt);
      throw new RateLimitError(retryAt, payload);
    }
    if (response.status === 401 && path !== "/mobile/auth/login"
      && token && await appStorage.getItem(TOKEN_KEY) === token) {
      await appStorage.removeItem(TOKEN_KEY);
      if (!sessionEndedNotified) {
        sessionEndedNotified = true;
        sessionEndedHandler?.();
      }
    }
    const message = payload?.message ?? `Request failed (${response.status}).`;
    if (response.status === 409 && /shift (?:has )?(?:already )?ended/i.test(message)
      && token && await appStorage.getItem(TOKEN_KEY) === token) shiftEndedHandler?.();
    const err = new Error(message);
    (err as any).status = response.status;
    (err as any).response = { status: response.status, data: payload };
    throw err;
  }
  return payload?.data as T;
}

export const post = <T>(path: string, body?: unknown) => {
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  return request<T>(path, {
    method: "POST",
    body: body === undefined ? undefined : isFormData ? (body as any) : JSON.stringify(body),
  });
};

export const put = <T>(path: string, body?: unknown) => {
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  return request<T>(path, {
    method: "PUT",
    body: body === undefined ? undefined : isFormData ? (body as any) : JSON.stringify(body),
  });
};

export const patch = <T>(path: string, body?: unknown) => {
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  return request<T>(path, {
    method: "PATCH",
    body: body === undefined ? undefined : isFormData ? (body as any) : JSON.stringify(body),
  });
};

export const del = <T>(path: string, body?: unknown) => {
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  return request<T>(path, {
    method: "DELETE",
    body: body === undefined ? undefined : isFormData ? (body as any) : JSON.stringify(body),
  });
};

