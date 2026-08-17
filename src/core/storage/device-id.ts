import { appStorage } from "./app-storage";

const DEVICE_KEY = "chatco_conductor_device_v1";

/** Stable app-install identifier for coordinating one operating device per
 * shift. It is deliberately not used as an authentication credential. */
export async function getConductorDeviceId(): Promise<string> {
  const existing = await appStorage.getItem(DEVICE_KEY);
  if (existing) return existing;

  const random = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  const id = `mobile-${random}`;
  await appStorage.setItem(DEVICE_KEY, id);
  return id;
}

export const CONDUCTOR_DEVICE_TYPE = "MOBILE" as const;
