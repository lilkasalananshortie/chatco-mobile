import type { Remittance, Shift } from "../../core/domain/types";

export const money = (value: number | string | undefined) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value ?? 0));

export function remittanceStatusLabel(item: Remittance): string {
  const raw = String(item.remittance_status ?? item.status ?? "SUBMITTED").toUpperCase();
  if (item.is_overdue || raw === "OVERDUE") return "Overdue";
  if (raw === "PENDING" || raw === "FOR CASH DECLARATION") return "For Cash Declaration";
  if (raw === "SETTLED") return "Settled";
  if (raw === "SHORTAGE") return "Shortage";
  if (raw === "OVERAGE") return "Overage";
  return raw.charAt(0) + raw.slice(1).toLowerCase();
}

function formatTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function officialReportText(item: Remittance, shift: Shift): string {
  const cash = Number(item.cash_total) || 0;
  const gcash = Number(item.gcash_total) || 0;
  return [
    "CHATCO OFFICIAL SHIFT REPORT",
    `Date: ${item.date ?? item.remitted_at ?? "—"}`,
    `Shift ID: ${item.shift_id ?? "—"}`,
    `Unit: ${item.unit_number ?? shift.unitNumber}`,
    `Conductor: ${item.conductor_name ?? shift.conductorName}`,
    `Driver: ${item.driver_name ?? shift.driverName}`,
    `Time in: ${formatTime(item.time_in)}`,
    `Time out: ${formatTime(item.time_out)}`,
    `Route: ${item.route ?? shift.route ?? "—"}`,
    `GCash: ${money(gcash)}`,
    `Cash: ${money(cash)}`,
    `Grand total: ${money(cash + gcash)}`,
    `Status: ${remittanceStatusLabel(item)}`,
    `Generated: ${new Date().toLocaleString("en-PH", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}`,
  ].join("\n");
}
