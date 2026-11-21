import { appStorage } from "./app-storage";

const DEVICE_KEY = "chatco_conductor_device_v1";

let knownId: string | null = null;
let loading: Promise<string> | null = null;

/** Stable app-install identifier for coordinating one operating device per
 * shift. It is deliberately not used as an authentication credential.
 *
 * Queued cash is tied to this ID, so a failed read must never be mistaken for
 * "no ID yet": replacing it would strand every ticket saved on this phone. */
export async function getConductorDeviceId(): Promise<string> {
  if (knownId) return knownId;
  loading ??= (async () => {
    try {
      let id = await appStorage.getItem(DEVICE_KEY, { strict: true });
      if (!id) {
        const random = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
        id = `mobile-${random}`;
        await appStorage.setItem(DEVICE_KEY, id);
      }
      knownId = id;
      return id;
    } finally {
      loading = null;
    }
  })();
  return loading;
}

export const CONDUCTOR_DEVICE_TYPE = "MOBILE" as const;
