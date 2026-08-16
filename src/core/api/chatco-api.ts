import { appStorage } from "../storage/app-storage";
import { enqueuePendingCash, getPendingCash, pendingCashCount, pendingCashForShift, removePendingCash } from "../storage/offline-cash-queue";
import type {
  Driver,
  ConductorProfile,
  FarePoint,
  FareMatrix,
  GcashInitiation,
  HailRequest,
  Rating,
  Remittance,
  Shift,
  ShiftEarnings,
  SosAlert,
  Transaction,
  Unit,
  User,
  Announcement,
  RouteGeometry,
} from "../domain/types";

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");
const TOKEN_KEY = "chatco_session";
const REQUEST_TIMEOUT_MS = 15000;

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}

type Envelope<T> = { data: T; message?: string; errors?: unknown };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
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
    if (response.status === 401) await appStorage.removeItem(TOKEN_KEY);
    const message = payload?.message ?? `Request failed (${response.status}).`;
    throw new Error(`${message} [HTTP ${response.status}]`);
  }
  return payload?.data as T;
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

/** Retry durable offline cash writes in order. Items stay queued when the
 * server is unreachable or the originating shift is no longer writable. */
export async function syncPendingCashTransactions(): Promise<number> {
  const pending = await getPendingCash();
  let synced = 0;
  for (const item of pending) {
    try {
      await post("/conductor/transactions", item.payload);
      await removePendingCash(item.id);
      synced += item.localTransactions.length;
    } catch (cause) {
      if (cause instanceof NetworkError) break;
      // Keep validation/closed-shift failures for explicit recovery instead
      // of silently deleting a fare collected offline.
    }
  }
  return synced;
}

const mapUnit = (v: any): Unit => ({
  id: String(v.id),
  unitNumber: v.unit_number,
  plateNumber: v.plate_number,
  route: v.route?.name ?? "—",
  routeId: v.route_id ?? undefined,
  // The conductor units endpoint already returns selectable vehicles.
  // Laravel's ACTIVE value means the vehicle is operational, not on a shift.
  status: "available",
});
const mapDriver = (d: any): Driver => ({
  id: String(d.id),
  name: [d.first_name, d.last_name].filter(Boolean).join(" ") || "Unknown Driver",
  // Match the web portal mapper: the endpoint owns availability filtering.
  status: "available",
});
const mapShift = (s: any): Shift => ({
  shiftId: String(s.shift_id),
  conductorName: s.conductor_name,
  unitNumber: s.unit_number,
  route: s.route?.name ?? "",
  routeId: s.route_id ?? s.route?.id ?? undefined,
  driverName: s.driver_name,
  timeIn: s.time_in,
  timeOut: s.time_out ?? null,
  isActive: s.status === "ACTIVE",
  isOnBreak: Boolean(s.is_on_break),
  breakStartedAt: s.break_started_at ?? null,
});
const mapTransaction = (t: any): Transaction => ({
  transactionId: String(t.transaction_id),
  paymentMethod: t.payment_method === "GCASH" ? "GCash" : t.payment_method === "VOUCHER" ? "Voucher" : "Cash",
  finalAmount: Number(t.final_amount) || 0,
  from: t.pickup_name ?? "",
  to: t.dropoff_name ?? "",
  timestamp: new Date(t.created_at).getTime(),
  passengerName: t.passenger_name ?? "",
  passengerId: t.passenger_id ?? "",
  passengerRole: t.passenger_role ?? undefined,
  distance: Number(t.distance) || 0,
  baseFare: Number(t.base_fare) || 0,
  succeedingKm: Number(t.succeeding_km) || 0,
  discountAmount: Number(t.discount_amount) || 0,
  conductorName: t.conductor_name ?? undefined,
  unitNumber: t.unit_number ?? undefined,
  driverName: t.driver_name ?? undefined,
  voucherCode: t.voucher_code ?? undefined,
  status: t.status ?? undefined,
  paidAt: t.paid_at ?? null,
  qrToken: t.qr_token ?? null,
  groupId: t.group_id ?? null,
  multiplePaymentReference: t.payment_group?.reference_number ?? t.multiple_payment_reference ?? null,
  groupPosition: t.group_position ?? null,
  totalPassengers: Number(t.total_passengers) || 1,
});

export const api = {
  async login(login: string, password: string): Promise<User> {
    const data = await request<any>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ login, password }),
    });
    if (data.role !== "CONDUCTOR") throw new Error("This app is restricted to Conductor accounts.");
    await appStorage.setItem(TOKEN_KEY, data.token);
    return { id: String(data.id), email: data.email, role: data.role, name: data.name };
  },
  async logout() {
    try { await post("/auth/logout"); } finally { await appStorage.removeItem(TOKEN_KEY); }
  },
  async me(): Promise<User | null> {
    if (!(await appStorage.getItem(TOKEN_KEY))) return null;
    try {
      const data = await request<any>("/user");
      const u = data.user ?? data;
      if (u.role !== "CONDUCTOR") return null;
      return { id: String(u.id), email: u.email, role: u.role, name: u.name ?? u.email };
    } catch { return null; }
  },
  units: async () => (await request<any[]>("/conductor/units")).map(mapUnit),
  drivers: async () => (await request<any[]>("/conductor/drivers")).map(mapDriver),
  profile: async (): Promise<ConductorProfile> => {
    const d = await request<any>("/conductor/profile");
    return {
      id: String(d.id),
      name: d.name ?? "Conductor",
      username: d.username ?? "—",
      phoneNumber: d.phone_number ?? d.contact_number ?? undefined,
    };
  },
  activeShift: async () => {
    const data = await request<any | null>("/conductor/shift");
    return data ? mapShift(data) : null;
  },
  checkConnectivity: async (): Promise<boolean> => {
    try {
      await request<any>("/system-status");
      return true;
    } catch (cause) {
      return !(cause instanceof NetworkError);
    }
  },
  pendingCashCount: (shiftId?: string) => pendingCashCount(shiftId),
  startShift: async (unit: Unit, driver: Driver) =>
    mapShift(await post<any>("/conductor/shifts/start", {
      vehicle_id: unit.id,
      driver_id: driver.id,
      route_id: unit.routeId ?? null,
    })),
  transactions: async (shiftId: string) => {
    const pending = await pendingCashForShift(shiftId);
    try {
      return (await request<any[]>(`/conductor/transactions?shift_id=${encodeURIComponent(shiftId)}`)).map(mapTransaction).concat(pending);
    } catch (cause) {
      if (cause instanceof NetworkError) return pending;
      throw cause;
    }
  },
  earnings: async (shiftId: string): Promise<ShiftEarnings> => {
    const d = await request<any>(`/conductor/earnings?shift_id=${encodeURIComponent(shiftId)}`);
    return {
      cashTotal: Number(d.cash_total) || 0,
      gcashTotal: Number(d.gcash_total) || 0,
      total: Number(d.total) || 0,
    };
  },
  recordCash: async (input: {
    amount: number;
    from: string;
    to: string;
    baseFare: number;
    distance: number;
    discountAmount: number;
    passengerRole?: string;
    voucherCode?: string;
    pickupStopId?: string;
    dropoffStopId?: string;
    idempotencyKey?: string;
    shiftId?: string;
  }) => {
    const idempotencyKey = input.idempotencyKey ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const payload = {
      shift_id: input.shiftId,
      payment_method: input.voucherCode ? "VOUCHER" : "CASH",
      final_amount: input.amount,
      pickup_name: input.from,
      dropoff_name: input.to,
      base_fare: input.baseFare,
      distance: input.distance,
      discount_amount: input.discountAmount,
      passenger_role: input.passengerRole,
      pickup_stop_id: input.pickupStopId,
      dropoff_stop_id: input.dropoffStopId,
      idempotency_key: idempotencyKey,
      voucher_code: input.voucherCode || undefined,
    };
    try {
      return mapTransaction(await post<any>("/conductor/transactions", payload));
    } catch (cause) {
      if (!(cause instanceof NetworkError) || input.voucherCode) throw cause;
      const local: Transaction = {
        transactionId: `OFFLINE-${idempotencyKey}`,
        paymentMethod: "Cash",
        finalAmount: input.amount,
        from: input.from,
        to: input.to,
        timestamp: Date.now(),
        passengerRole: input.passengerRole,
        distance: input.distance,
        baseFare: input.baseFare,
        discountAmount: input.discountAmount,
        status: "PAID",
      };
      await enqueuePendingCash({
        id: `pending-${idempotencyKey}`,
        shiftId: input.shiftId ?? "",
        kind: "single",
        idempotencyKey,
        payload,
        localTransactions: [local],
        createdAt: Date.now(),
      });
      return local;
    }
  },
  recordGroupCash: async (input: {
    from: string;
    to: string;
    regularFare: number;
    discountedFare: number;
    passengers: Array<{ passenger_type: "REGULAR" | "SENIOR_CITIZEN" | "STUDENT" | "PWD"; quantity: number }>;
    idempotencyKey?: string;
    shiftId?: string;
  }) => {
    const idempotencyKey = input.idempotencyKey ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const payload = {
      shift_id: input.shiftId,
      payment_method: "CASH",
      pickup_name: input.from,
      dropoff_name: input.to,
      idempotency_key: idempotencyKey,
      group_passengers: input.passengers.map(passenger => {
        const finalAmount = passenger.passenger_type === "REGULAR" ? input.regularFare : input.discountedFare;
        return {
          type: passenger.passenger_type,
          quantity: passenger.quantity,
          final_amount: finalAmount,
          base_fare: input.regularFare,
          discount_amount: Math.max(0, input.regularFare - finalAmount),
        };
      }),
    };
    try {
      const d = await post<any>("/conductor/transactions", payload);
      return {
        groupId: String(d.group_id),
        multiplePaymentReference: d.multiple_payment_reference ?? null,
        transactions: Array.isArray(d.transactions) ? d.transactions.map(mapTransaction) : [],
      };
    } catch (cause) {
      if (!(cause instanceof NetworkError)) throw cause;
      const reference = `OFFLINE-${idempotencyKey.slice(0, 8).toUpperCase()}`;
      const totalPassengers = input.passengers.reduce((sum, row) => sum + row.quantity, 0);
      const transactions = input.passengers.flatMap(passenger => Array.from({ length: passenger.quantity }, (_, index) => ({
        transactionId: `OFFLINE-${idempotencyKey}-${index}`,
        paymentMethod: "Cash" as const,
        finalAmount: passenger.passenger_type === "REGULAR" ? input.regularFare : input.discountedFare,
        from: input.from,
        to: input.to,
        timestamp: Date.now(),
        passengerRole: passenger.passenger_type,
        baseFare: input.regularFare,
        discountAmount: passenger.passenger_type === "REGULAR" ? 0 : input.regularFare - input.discountedFare,
        status: "PAID" as const,
        groupId: `offline-${idempotencyKey}`,
        multiplePaymentReference: reference,
        groupPosition: index + 1,
        totalPassengers,
      })));
      await enqueuePendingCash({
        id: `pending-${idempotencyKey}`,
        shiftId: input.shiftId ?? "",
        kind: "group",
        idempotencyKey,
        payload,
        localTransactions: transactions,
        createdAt: Date.now(),
      });
      return { groupId: `offline-${idempotencyKey}`, multiplePaymentReference: reference, transactions };
    }
  },
  initiateGcash: async (input: {
    amount: number; from: string; to: string; baseFare: number; distance: number; discountAmount: number;
    groupPassengers?: Array<{ type: "REGULAR" | "SENIOR_CITIZEN" | "STUDENT" | "PWD"; quantity: number; final_amount: number; base_fare: number; discount_amount: number }>;
  }): Promise<GcashInitiation> => {
    const d = await post<any>("/conductor/payments/gcash/initiate", {
      payment_method: "GCASH",
      final_amount: input.amount,
      pickup_name: input.from,
      dropoff_name: input.to,
      base_fare: input.baseFare,
      distance: input.distance,
      discount_amount: input.discountAmount,
      group_passengers: input.groupPassengers,
    });
    return {
      transactionId: String(d.transaction_id),
      qrToken: d.qr_token,
      checkoutUrl: d.checkout_url ?? null,
      amount: Number(d.amount) || input.amount,
      expiresAt: d.expires_at,
      from: d.pickup_name ?? null,
      to: d.dropoff_name ?? null,
      groupId: d.group_id ?? null,
      multiplePaymentReference: d.multiple_payment_reference ?? null,
      receipts: Array.isArray(d.receipts) ? d.receipts.map(mapTransaction) : [],
    };
  },
  paymentStatus: async (id: string) => {
    const d = await request<any>(`/payments/${encodeURIComponent(id)}/status`);
    return String(d.status ?? "PENDING").toUpperCase();
  },
  pendingGcash: async (): Promise<GcashInitiation | null> => {
    const d = await request<any | null>("/conductor/payments/gcash/pending");
    if (!d) return null;
    return {
      transactionId: String(d.transaction_id),
      qrToken: d.qr_token,
      checkoutUrl: d.checkout_url ?? null,
      amount: Number(d.amount) || 0,
      expiresAt: d.expires_at,
      from: d.pickup_name ?? null,
      to: d.dropoff_name ?? null,
      groupId: d.group_id ?? null,
      multiplePaymentReference: d.multiple_payment_reference ?? null,
      receipts: Array.isArray(d.receipts) ? d.receipts.map(mapTransaction) : [],
    };
  },
  cancelPayment: (id: string) => post(`/payments/${encodeURIComponent(id)}/cancel`, {}),
  breakStatus: async (isOnBreak: boolean) => mapShift(await post<any>("/conductor/break-status", { is_on_break: isOnBreak })),
  fareMatrix: async (): Promise<FareMatrix> => {
    const d = await request<any>("/fare-matrix");
    const points = Array.isArray(d?.points) ? d.points : [];
    return {
      points: points.map((p: any) => ({
        pointNumber: Number(p.pointNumber ?? p.point_number),
        id: String(p.id ?? ""),
        code: p.code ?? "",
        name: p.name,
        landmarks: p.landmarks ?? [],
        subStops: p.subStops ?? p.sub_stops ?? [],
        latitude: p.latitude === null || p.latitude === undefined ? undefined : Number(p.latitude),
        longitude: p.longitude === null || p.longitude === undefined ? undefined : Number(p.longitude),
        regularFare: Number(p.regularFare ?? p.regular_fare) || 0,
        discountedFare: Number(p.discountedFare ?? p.discounted_fare) || 0,
      })),
      config: {
        baseBarangayCount: Number(d?.config?.baseBarangayCount ?? d?.config?.base_barangay_count) || 4,
        baseFareRegular: Number(d?.config?.baseFareRegular ?? d?.config?.base_fare_regular) || 15,
        baseFareDiscounted: Number(d?.config?.baseFareDiscounted ?? d?.config?.base_fare_discounted) || 12,
        succeedingFareRegular: Number(d?.config?.succeedingFareRegular ?? d?.config?.succeeding_fare_regular) || 2.25,
        succeedingFareDiscounted: Number(d?.config?.succeedingFareDiscounted ?? d?.config?.succeeding_fare_discounted) || 1.75,
        totalPoints: Number(d?.config?.totalPoints ?? d?.config?.total_points) || points.length,
      },
    };
  },
  routeGeometry: async (routeId?: string): Promise<RouteGeometry> => {
    const query = routeId ? `?route_id=${encodeURIComponent(routeId)}` : "";
    const d = await request<any>(`/routes/active${query}`);
    const coordinates = Array.isArray(d.coordinates)
      ? d.coordinates
        .map((point: any) => [Number(point[0] ?? point.latitude), Number(point[1] ?? point.longitude)] as [number, number])
        .filter((point: [number, number]) => point.every(Number.isFinite))
      : [];
    return {
      id: String(d.id),
      name: d.name ?? "Active route",
      coordinates,
      source: coordinates.length > 1 ? "backend" : "fallback",
      version: d.version ? { number: d.version.number, publishedAt: d.version.published_at ?? null } : null,
    };
  },
  hails: async (): Promise<HailRequest[]> => (await request<any[]>("/conductor/hails")).map(h => ({
    id: String(h.id),
    commuterName: h.commuter?.name ?? h.commuter_name ?? "Commuter",
    latitude: Number(h.commuter_lat ?? h.latitude),
    longitude: Number(h.commuter_lng ?? h.longitude),
    label: h.label,
    etaMinutes: Number(h.eta_minutes) || undefined,
  })),
  acceptHail: (id: string) => post(`/conductor/hails/${encodeURIComponent(id)}/accept`),
  rejectHail: (id: string) => post(`/conductor/hails/${encodeURIComponent(id)}/reject`),
  capacity: (capacity_status: string) => post("/conductor/capacity-status", { capacity_status }),
  location: (latitude: number, longitude: number, speed?: number | null, heading?: number | null, accuracy?: number | null, fixTimestamp?: string | null) =>
    post("/conductor/location", {
      lat: latitude,
      lng: longitude,
      speed: Number.isFinite(speed) ? speed : null,
      heading: Number.isFinite(heading) ? heading : null,
      accuracy: Number.isFinite(accuracy) ? accuracy : null,
      fix_timestamp: fixTimestamp ?? new Date().toISOString(),
    }),
  sos: async (lat: number, lng: number, note?: string): Promise<SosAlert> => {
    const d = await post<any>("/conductor/sos", { lat, lng, note });
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
    const d = await request<any>(`/conductor/sos/${encodeURIComponent(id)}`);
    return { id: String(d.id), status: d.status };
  },
  ratings: async (shiftId: string): Promise<Rating[]> => (await request<any[]>(`/conductor/ratings?shift_id=${encodeURIComponent(shiftId)}`)).map(r => ({
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
    const d = await request<any>("/conductor/remittances?per_page=100");
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
  },
  remit: (shift: Shift, expectedCash: number, gcash: number, declaredCash: number) =>
    post("/conductor/remittances", {
      shift_id: shift.shiftId,
      total_collected: expectedCash,
      remitted_amount: declaredCash,
      cash_total: expectedCash,
      gcash_total: gcash,
    }),
};
