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
} from "./api-client";
import { mapDriver, mapShift, mapUnit } from "./api-mappers";

export const shiftService = {
  units: async (): Promise<Unit[]> => {
    try {
      const units = (await request<any[]>("/mobile/conductor/units")).map(mapUnit);
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
      const drivers = (await request<any[]>("/mobile/conductor/drivers")).map(mapDriver);
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

  activeShift: async (): Promise<Shift | null> => {
    try {
      const data = await request<any | null>("/mobile/conductor/shift");
      if (data) {
        await appStorage.removeItem(PROVISIONAL_SHIFT_KEY).catch(() => null);
        return mapShift(data);
      }
      const provisionalRaw = await appStorage.getItem(PROVISIONAL_SHIFT_KEY);
      if (provisionalRaw) {
        try {
          return JSON.parse(provisionalRaw) as Shift;
        } catch {}
      }
      return null;
    } catch (cause) {
      if (cause instanceof NetworkError) {
        const provisionalRaw = await appStorage.getItem(PROVISIONAL_SHIFT_KEY);
        if (provisionalRaw) {
          try {
            return JSON.parse(provisionalRaw) as Shift;
          } catch {}
        }
      }
      throw cause;
    }
  },

  checkConnectivity: async (): Promise<boolean> => {
    try {
      await request<any>("/system-status");
      return true;
    } catch (cause) {
      return !(cause instanceof NetworkError);
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
        // Create provisional shift for offline depot start
        const provisionalShiftId = `PROV-${Date.now().toString(36).toUpperCase()}-${deviceId.slice(-4).toUpperCase()}`;
        const provisionalShift: Shift = {
          shiftId: provisionalShiftId,
          conductorName: "Conductor",
          unitNumber: unit.unitNumber,
          route: unit.route,
          routeId: unit.routeId,
          driverName: driver.name,
          timeIn: new Date().toISOString(),
          timeOut: null,
          isActive: true,
          operatingDeviceId: deviceId,
          operatingDeviceType: CONDUCTOR_DEVICE_TYPE,
          isProvisional: true,
          provisionalPayload: {
            unitId: unit.id,
            driverId: driver.id,
            routeId: unit.routeId,
          },
        };
        await appStorage.setItem(PROVISIONAL_SHIFT_KEY, JSON.stringify(provisionalShift));
        return provisionalShift;
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
