import type { Transaction } from "../../core/domain/types";

/** Zero is a valid server amount. Never fall back to the pre-voucher estimate. */
export function receiptSummary(rows: Transaction[], fallbackAmount = 0, fallbackMethod = "Cash") {
  const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
  const amount = rows.length ? round(rows.reduce((sum, row) => sum + row.finalAmount, 0)) : fallbackAmount;
  const gross = round(rows.reduce((sum, row) => sum + (row.grossAmount ?? row.baseFare ?? row.finalAmount + (row.discountAmount ?? 0)), 0));
  const discount = round(rows.reduce((sum, row) => sum + (row.discountAmount ?? 0), 0));
  const methods = [...new Set(rows.map((row) => row.paymentMethod))];
  let method = methods.length ? methods.join(" + ") : fallbackMethod;
  const hasVoucher = fallbackMethod === "Voucher" || rows.some((row) => row.voucherId || row.voucherCode || row.paymentMethod === "Voucher");
  if (hasVoucher && amount > 0 && !method.includes("Voucher")) method += " + Voucher";
  const breakdown = new Map<string, { passengerType: string; quantity: number; subtotal: number }>();
  for (const row of rows) {
    const role = row.passengerRole ?? "REGULAR";
    const group = breakdown.get(role) ?? { passengerType: role, quantity: 0, subtotal: 0 };
    // Normalized receipt rows represent one passenger each, not group-size squared.
    group.quantity++; group.subtotal = round(group.subtotal + row.finalAmount); breakdown.set(role, group);
  }
  return { amount, gross, discount, method, hasVoucher, passengerCount: rows.length > 1 ? rows.length : rows[0]?.totalPassengers ?? 1, breakdown: [...breakdown.values()] };
}
