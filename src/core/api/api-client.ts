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

let sessionEndedHandler: (() => void) | null = null;
let sessionEndedNotified = false;

/**
 * Lets the application shell react immediately when another device replaces
 * this device's conductor session.
 */
export function setSessionEndedHandler(handler: (() => void) | null): () => void {
  sessionEndedHandler = handler;
  return () => {
    if (sessionEndedHandler === handler) sessionEndedHandler = null;
  };
}

export function resetSessionEndedNotified() {
  sessionEndedNotified = false;
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new Error("Set EXPO_PUBLIC_API_URL in your .env file.");
  const token = await appStorage.getItem(TOKEN_KEY);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch (cause) {
    if (cause instanceof Error && cause.name === "AbortError") {
      throw new NetworkError("The ChatCo server did not respond. Check your connection and try again.");
    }
    throw new NetworkError("Unable to reach the ChatCo server. Check your internet connection.");
  } finally {
    clearTimeout(timeout);
  }
  const payload = (await response.json().catch(() => null)) as Envelope<T> | null;
  if (!response.ok) {
    if (response.status === 401 && path !== "/auth/login") {
      await appStorage.removeItem(TOKEN_KEY);
      if (!sessionEndedNotified) {
        sessionEndedNotified = true;
        sessionEndedHandler?.();
      }
    }
    const message = payload?.message ?? `Request failed (${response.status}).`;
    throw new Error(`${message} [HTTP ${response.status}]`);
  }
  return payload?.data as T;
}

export const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

export const put = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "PUT", body: body === undefined ? undefined : JSON.stringify(body) });

export const patch = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) });
