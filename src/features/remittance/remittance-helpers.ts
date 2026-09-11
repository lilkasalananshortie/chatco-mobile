import type { Remittance, Shift } from "../../core/domain/types";

export const money = (value: number | string | undefined) => `₱${Number(value ?? 0).toFixed(2)}`;

export function officialReportText(item: Remittance, shift: Shift): string {
  return [
    "CHATCO OFFICIAL REMITTANCE REPORT",
    `Report ID: ${item.id ?? "—"}`,
    `Shift ID: ${item.shift_id ?? "—"}`,
    `Unit: ${item.unit_number ?? shift.unitNumber}`,
    `Conductor: ${item.conductor_name ?? shift.conductorName}`,
    `Driver: ${item.driver_name ?? shift.driverName}`,
    `Cash: ${money(item.cash_total)}`,
    `GCash: ${money(item.gcash_total)}`,
    `Voucher: ${money(item.voucher_total)}`,
    `Cash to hand over: ${money(item.cash_total)}`,
    `Status: ${item.remittance_status ?? item.status ?? "Submitted"}`,
  ].join("\n");
}
