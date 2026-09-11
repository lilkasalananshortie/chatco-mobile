import type { Driver, Shift, Transaction, Unit } from "../domain/types";

export const mapUnit = (v: any): Unit => ({
  id: String(v.id),
  unitNumber: v.unit_number,
  plateNumber: v.plate_number,
  route: v.route?.name ?? "—",
  routeId: v.route_id ?? undefined,
  status: "available",
});

export const mapDriver = (d: any): Driver => ({
  id: String(d.id),
  name: [d.first_name, d.last_name].filter(Boolean).join(" ") || "Unknown Driver",
  status: "available",
});

export const mapShift = (s: any): Shift => ({
  shiftId: String(s.shift_id),
  conductorName: s.conductor_name,
  unitNumber: s.unit_number,
  route: s.route?.name ?? "",
  routeId: s.route_id ?? s.route?.id ?? undefined,
  driverName: s.driver_name,
  timeIn: s.time_in,
  timeOut: s.time_out ?? null,
  isActive: s.status === "ACTIVE",
  operatingDeviceId: s.operating_device_id ?? null,
  operatingDeviceType: s.operating_device_type ?? null,
  latestDeviceRecoveryAt: s.latest_device_recovery?.created_at ?? null,
  isOnBreak: Boolean(s.is_on_break),
  breakStartedAt: s.break_started_at ?? null,
});

export const mapTransaction = (t: any): Transaction => ({
  transactionId: String(t.transaction_id),
  paymentMethod:
    t.payment_method === "GCASH" ? "GCash" : t.payment_method === "VOUCHER" ? "Voucher" : "Cash",
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
  receiptQrToken: t.receipt_qr_token ?? t.qr_token ?? null,
  groupId: t.group_id ?? null,
  multiplePaymentReference:
    t.payment_group?.reference_number ?? t.multiple_payment_reference ?? null,
  groupPosition: t.group_position ?? null,
  totalPassengers: Number(t.total_passengers) || 1,
});
