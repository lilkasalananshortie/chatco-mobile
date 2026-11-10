import type { Remittance, Shift } from "./types";

export type ShiftAccess =
  | { kind: "active"; shift: Shift }
  | { kind: "unremitted"; record: Remittance }
  | { kind: "waiting"; record: Remittance }
  | { kind: "ready" };

export function remittanceState(record: Remittance): "Not Remitted" | "For Cash Declaration" | "Overdue" | "Settled" | "Unknown" {
  const status = String(record.remittance_status ?? record.status ?? "").toUpperCase();
  if (["COMPLETE", "SHORTAGE", "OVERAGE"].includes(status)) return "Settled";
  if (status !== "PENDING") return "Unknown";
  if (!record.remitted_at) return "Not Remitted";
  return record.is_overdue || (record.due_at && Date.parse(record.due_at) < Date.now()) ? "Overdue" : "For Cash Declaration";
}

export function resolveShiftAccess(shift: Shift | null, records: Remittance[]): ShiftAccess {
  if (shift?.isActive && !shift.timeOut) return { kind: "active", shift };
  const outstanding = records.filter(record => remittanceState(record) !== "Settled")
    .sort((a, b) => String(a.date ?? a.time_in ?? "").localeCompare(String(b.date ?? b.time_in ?? "")) || String(a.time_in ?? "").localeCompare(String(b.time_in ?? "")));
  const unremitted = outstanding.find(record => remittanceState(record) === "Not Remitted");
  if (unremitted) return { kind: "unremitted", record: unremitted };
  if (outstanding[0]) return { kind: "waiting", record: outstanding[0] };
  return { kind: "ready" };
}

export function remittanceShift(record: Remittance): Shift {
  if (!record.shift_id) throw new Error("The report has no shift ID. Check again before remitting.");
  return { shiftId: record.shift_id, conductorName: record.conductor_name || "Conductor",
    driverName: record.driver_name || "Driver", unitNumber: record.unit_number || "Unit", route: record.route || "",
    timeIn: record.time_in || record.date || "", timeOut: record.time_out || null, isActive: false };
}

export function remittanceTotals(record: Remittance) {
  const cash = Number(record.cash_total);
  const gcash = Number(record.gcash_total);
  if (!Number.isFinite(cash) || !Number.isFinite(gcash) || cash < 0 || gcash < 0) throw new Error("Remittance totals are unavailable. Check again before remitting.");
  return { cash, gcash, all: cash + gcash };
}
