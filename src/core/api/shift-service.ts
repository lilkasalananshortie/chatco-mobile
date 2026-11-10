import { appStorage } from "../storage/app-storage";
import { CONDUCTOR_DEVICE_TYPE, getConductorDeviceId } from "../storage/device-id";
import type { ConductorProfile, Driver, Shift, Unit } from "../domain/types";
import {
  CACHED_DRIVERS_KEY,
  CACHED_PROFILE_KEY,
  CACHED_UNITS_KEY,
  NetworkError,
  post,
  PROVISIONAL_SHIFT_KEY,
  request,
  TOKEN_KEY,
} from "./api-client";
import { mapDriver, mapShift, mapUnit } from "./api-mappers";

let activeShiftRequest: Promise<Shift | null> | null = null;
let activeShiftToken: string | null = null;
let connectivityRequest: Promise<boolean> | null = null;

export const shiftService = {
  units: async (): Promise<Unit[]> => {
    try {
      const units = (await request<any[]>("/mobile/conductor/units?include_unavailable=1")).map(mapUnit);
      await appStorage.setItem(CACHED_UNITS_KEY, JSON.stringify(units)).catch(() => null);
      return units;
    } catch (cause) {
      if (cause instanceof NetworkError) {
        const cached = await appStorage.getItem(CACHED_UNITS_KEY);
        if (cached) {
          try {
            return JSON.parse(cached) as Unit[];
          } catch {}
        }
      }
      throw cause;
    }
  },

  drivers: async (): Promise<Driver[]> => {
    try {
      const drivers = (await request<any[]>("/mobile/conductor/drivers?include_unavailable=1")).map(mapDriver);
      await appStorage.setItem(CACHED_DRIVERS_KEY, JSON.stringify(drivers)).catch(() => null);
      return drivers;
    } catch (cause) {
      if (cause instanceof NetworkError) {
        const cached = await appStorage.getItem(CACHED_DRIVERS_KEY);
        if (cached) {
          try {
            return JSON.parse(cached) as Driver[];
          } catch {}
        }
      }
      throw cause;
    }
  },

  profile: async (): Promise<ConductorProfile> => {
    try {
      const d = await request<any>("/mobile/conductor/profile");
      const prof: ConductorProfile = {
        id: String(d.id),
        name: d.name ?? "Conductor",
        username: d.username ?? "—",
        phoneNumber: d.phone_number ?? d.contact_number ?? undefined,
        profilePictureUrl: d.profile_picture_url ?? null,
      };
      await appStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(prof)).catch(() => null);
      return prof;
    } catch (cause) {
      if (cause instanceof NetworkError) {
        const cached = await appStorage.getItem(CACHED_PROFILE_KEY);
        if (cached) {
          try {
            return JSON.parse(cached) as ConductorProfile;
          } catch {}
        }
      }
      throw cause;
    }
  },

  uploadProfilePhoto: async (photo: FormData, ownerId?: string): Promise<string> => {
    const result = await post<{ profile_picture_url: string }>("/mobile/conductor/profile/photo", photo);
    if (!result.profile_picture_url) throw new Error("The server did not confirm the saved photo.");
    // Do not let a failed cache write disguise a successful server upload.
    try {
      const raw = await appStorage.getItem(CACHED_PROFILE_KEY);
      const cached = raw ? JSON.parse(raw) : null;
      if (ownerId && cached?.id === ownerId) await appStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify({ ...cached, profilePictureUrl: result.profile_picture_url }));
    } catch { /* Re-fetch the authoritative profile on next visit. */ }
    return result.profile_picture_url;
  },

  activeShift: async (): Promise<Shift | null> => {
    const token = await appStorage.getItem(TOKEN_KEY);
    if (activeShiftRequest && activeShiftToken === token) return activeShiftRequest;
    const pending = (async (): Promise<Shift | null> => {
      try {
        const data = await request<any | null>("/mobile/conductor/shift");
        if (data) {
          await appStorage.removeItem(PROVISIONAL_SHIFT_KEY).catch(() => null);
          return mapShift(data);
        }
        // A legacy local provisional shift is not server authorization.
        await appStorage.removeItem(PROVISIONAL_SHIFT_KEY).catch(() => null);
        return null;
      } catch (cause) {
        if (cause instanceof NetworkError) {
          // Never restore a locally invented shift when the backend cannot
          // confirm the conductor's active shift.
          await appStorage.removeItem(PROVISIONAL_SHIFT_KEY).catch(() => null);
        }
        throw cause;
      }
    })();
    activeShiftRequest = pending;
    activeShiftToken = token;
    try {
      return await pending;
    } finally {
      if (activeShiftRequest === pending) activeShiftRequest = null;
    }
  },

  checkConnectivity: async (): Promise<boolean> => {
    if (connectivityRequest) return connectivityRequest;
    const pending = (async () => {
      try {
        await request<any>("/mobile/system-status");
        return true;
      } catch (cause) {
        return !(cause instanceof NetworkError);
      }
    })();
    connectivityRequest = pending;
    try {
      return await pending;
    } finally {
      if (connectivityRequest === pending) connectivityRequest = null;
    }
  },

  startShift: async (unit: Unit, driver: Driver): Promise<Shift> => {
    const deviceId = await getConductorDeviceId();
    try {
      const official = await post<any>("/mobile/conductor/shifts/start", {
        vehicle_id: unit.id,
        driver_id: driver.id,
        route_id: unit.routeId ?? null,
        device_id: deviceId,
        device_type: CONDUCTOR_DEVICE_TYPE,
      });
      await appStorage.removeItem(PROVISIONAL_SHIFT_KEY).catch(() => null);
      return mapShift(official);
    } catch (cause) {
      if (cause instanceof NetworkError) {
        // A timed-out start may have reached the server. Resolve that
        // ambiguous result from the authoritative active-shift endpoint;
        // never manufacture a local shift or retry the start blindly.
        try {
          const active = await request<any | null>("/mobile/conductor/shift");
          if (active) {
            await appStorage.removeItem(PROVISIONAL_SHIFT_KEY).catch(() => null);
            return mapShift(active);
          }
        } catch {
          // Preserve the original start error when status cannot be checked.
        }
        await appStorage.removeItem(PROVISIONAL_SHIFT_KEY).catch(() => null);
      }
      throw cause;
    }
  },

  claimShiftDevice: async (shiftId: string): Promise<Shift> => {
    const deviceId = await getConductorDeviceId();
    const data = await post<any>("/mobile/conductor/shifts/device/claim", {
      shift_id: shiftId,
      device_id: deviceId,
      device_type: CONDUCTOR_DEVICE_TYPE,
    });
    return mapShift(data?.data ?? data);
  },

  updateTripDirection: async (direction: "FORWARD" | "REVERSE"): Promise<void> => {
    await post("/mobile/conductor/trip-direction", {
      trip_direction: direction,
      device_id: await getConductorDeviceId(),
      device_type: CONDUCTOR_DEVICE_TYPE,
    });
  },

  releaseShiftDevice: async (shiftId: string): Promise<Shift> => {
    const deviceId = await getConductorDeviceId();
    const data = await post<any>("/mobile/conductor/shifts/device/release", {
      shift_id: shiftId,
      device_id: deviceId,
      device_type: CONDUCTOR_DEVICE_TYPE,
    });
    return mapShift(data?.data ?? data);
  },
};
