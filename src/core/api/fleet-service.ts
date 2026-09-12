import { CONDUCTOR_DEVICE_TYPE, getConductorDeviceId } from "../storage/device-id";
import type {
  Announcement,
  HailRequest,
  Rating,
  Remittance,
  RouteGeometry,
  Shift,
  SosAlert,
} from "../domain/types";
import { NetworkError, post, request } from "./api-client";
import { mapShift } from "./api-mappers";

export const fleetService = {
  breakStatus: async (isOnBreak: boolean) => {
    const deviceId = await getConductorDeviceId();
    return mapShift(
      await post<any>("/mobile/conductor/break-status", {
        is_on_break: isOnBreak,
        device_id: deviceId,
        device_type: CONDUCTOR_DEVICE_TYPE,
      }),
    );
  },

  routeGeometry: async (routeId?: string): Promise<RouteGeometry> => {
    let d: any = null;
    if (routeId) {
      try {
        d = await request<any>(`/routes/active?route_id=${encodeURIComponent(routeId)}`);
      } catch {
        d = null;
      }
    }
    if (!d) {
      try {
        d = await request<any>("/routes/active");
      } catch {
        d = null;
      }
    }
    const rawCoords = d?.coordinates;
    const coordinates = Array.isArray(rawCoords)
      ? rawCoords
          .map(
            (point: any) =>
              [Number(point[0] ?? point.latitude), Number(point[1] ?? point.longitude)] as [number, number],
          )
          .filter((point: [number, number]) => point.every(Number.isFinite))
      : [];
    return {
      id: String(d?.id ?? "fallback-route"),
      name: d?.name ?? "Regular Route",
      coordinates,
      source: coordinates.length > 1 ? "backend" : "fallback",
      version: d?.version ? { number: d.version.number, publishedAt: d.version.published_at ?? null } : null,
    };
  },

  hails: async (): Promise<HailRequest[]> =>
    (await request<any[]>("/mobile/conductor/hails")).map(h => ({
      id: String(h.id),
      commuterName: h.commuter?.name ?? h.commuter_name ?? "Commuter",
      latitude: Number(h.commuter_lat ?? h.latitude),
      longitude: Number(h.commuter_lng ?? h.longitude),
      label: h.label,
      etaMinutes: Number(h.eta_minutes) || undefined,
    })),

  acceptHail: async (id: string) => {
    const deviceId = await getConductorDeviceId();
    return post(`/mobile/conductor/hails/${encodeURIComponent(id)}/accept`, {
      device_id: deviceId,
      device_type: CONDUCTOR_DEVICE_TYPE,
    });
  },

  rejectHail: async (id: string) => {
    const deviceId = await getConductorDeviceId();
    return post(`/mobile/conductor/hails/${encodeURIComponent(id)}/reject`, {
      device_id: deviceId,
      device_type: CONDUCTOR_DEVICE_TYPE,
    });
  },

  capacity: async (capacity_status: string) => {
    const deviceId = await getConductorDeviceId();
    return post("/mobile/conductor/capacity-status", {
      capacity_status,
      device_id: deviceId,
      device_type: CONDUCTOR_DEVICE_TYPE,
    });
  },

  location: async (
    latitude: number,
    longitude: number,
    speed?: number | null,
    heading?: number | null,
    accuracy?: number | null,
    fixTimestamp?: string | null,
  ) => {
    const deviceId = await getConductorDeviceId();
    return post("/mobile/conductor/location", {
      lat: latitude,
      lng: longitude,
      // Expo Location reports metres/second; Laravel stores and validates km/h.
      speed: Number.isFinite(speed) ? Number(speed) * 3.6 : null,
      heading: Number.isFinite(heading) ? heading : null,
      accuracy: Number.isFinite(accuracy) ? accuracy : null,
      fix_timestamp: fixTimestamp ?? new Date().toISOString(),
      device_id: deviceId,
      device_type: CONDUCTOR_DEVICE_TYPE,
    });
  },

  sos: async (lat: number, lng: number, note?: string): Promise<SosAlert> => {
    const d = await post<any>("/mobile/conductor/sos", { lat, lng, note });
    return { id: String(d.id), status: d.status };
  },

  announcements: async (): Promise<Announcement[]> => {
    const d = await request<any>("/announcements");
    const rows = Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [];
    return rows.map((row: any) => ({
      id: String(row.id),
      title: row.title ?? "ChatCo notice",
      body: row.body ?? row.message ?? "",
      isRead: Boolean(row.is_read ?? row.isRead),
      createdAt: row.created_at ?? row.createdAt,
      priority: row.priority,
    }));
  },

  markAnnouncementRead: (id: string) => post(`/announcements/${encodeURIComponent(id)}/read`),

  sosStatus: async (id: string): Promise<SosAlert> => {
    const d = await request<any>(`/mobile/conductor/sos/${encodeURIComponent(id)}`);
    return { id: String(d.id), status: d.status };
  },

  ratings: async (shiftId: string): Promise<Rating[]> =>
    (await request<any[]>(`/mobile/conductor/ratings?shift_id=${encodeURIComponent(shiftId)}`)).map(r => ({
      ratingId: String(r.ratingId ?? r.rating_id ?? r.id),
      commuterId: String(r.commuterId ?? r.commuter_id ?? ""),
      commuterName: r.commuterName ?? r.commuter_name ?? "Commuter",
      shiftId: String(r.shiftId ?? r.shift_id ?? shiftId),
      targetRole: r.targetRole ?? r.target_role,
      targetId: String(r.targetId ?? r.target_id ?? ""),
      score: Number(r.score) || 0,
      comment: r.comment ?? "",
      createdAt: r.createdAt ?? r.created_at ?? new Date().toISOString(),
    })),

  remittances: async (): Promise<Remittance[]> => {
    try {
      const d = await request<any>("/mobile/conductor/remittances?per_page=100");
      const rows = Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [];
      return rows.map((r: any) => ({
        id: String(r.id ?? r.remittance_id ?? r.shift_id ?? ""),
        shift_id: String(r.shift_id ?? ""),
        date: r.date ?? r.created_at ?? "",
        cash_total: Number(r.cash_total) || 0,
        gcash_total: Number(r.gcash_total) || 0,
        voucher_total: Number(r.voucher_total) || 0,
        declared_amount: Number(r.remitted_amount ?? r.cash_declared ?? 0) || 0,
        total_collected: Number(r.total_collected ?? r.expected_cash ?? r.cash_total ?? 0) || 0,
        remittance_status: String(r.remittance_status ?? "PENDING").toUpperCase(),
        status: r.remittance_status,
        remitted_at: r.remitted_at ?? null,
        unit_number: r.unit_number ?? r.shift?.unit_number ?? "",
        conductor_name: r.conductor_name ?? r.shift?.conductor_name ?? "",
        driver_name: r.driver_name ?? r.shift?.driver_name ?? "",
        total_passengers: Number(r.total_passengers) || 0,
        cash_declared: Number(r.cash_declared ?? r.total_collected) || 0,
        total_cashless: Number(r.total_cashless) || 0,
        gcash_scanned_total: Number(r.gcash_scanned_total) || 0,
        gcash_direct_total: Number(r.gcash_direct_total) || 0,
        time_in: r.shift?.time_in ?? "",
        time_out: r.shift?.time_out ?? "",
        shortage: Number(r.shortage) || 0,
        overage: Number(r.overage) || 0,
        due_at: r.remittance_due_at ?? null,
        is_overdue: Boolean(r.is_overdue),
        reminder_count: Number(r.reminder_count) || 0,
      }));
    } catch (cause) {
      if (cause instanceof NetworkError) return [];
      throw cause;
    }
  },

  remit: async (shift: Shift, expectedCash: number, gcash: number) => {
    const deviceId = await getConductorDeviceId();
    return post("/mobile/conductor/remittances", {
      shift_id: shift.shiftId,
      total_collected: expectedCash,
      // Declared cash defaults to the collected total; the backend also
      // falls back to total_collected when this field is absent.
      remitted_amount: expectedCash,
      cash_total: expectedCash,
      gcash_total: gcash,
      device_id: deviceId,
      device_type: CONDUCTOR_DEVICE_TYPE,
    });
  },
};
