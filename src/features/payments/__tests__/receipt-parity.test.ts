/// <reference types="jest" />
import { receiptSummary } from "../receipt-summary";
import { buildGoojprtReceiptBytes } from "../../../core/utils/thermal-escpos-builder";
import type { ReceiptSettings, Transaction } from "../../../core/domain/types";
const row = (changes: Partial<Transaction> = {}): Transaction => ({ transactionId: "t", paymentMethod: "Cash", finalAmount: 17, baseFare: 17, from: "A", to: "B", timestamp: 1, passengerRole: "REGULAR", ...changes });
test("free voucher amount stays zero instead of falling back to estimated fare", () => {
  expect(receiptSummary([row({ paymentMethod: "Voucher", finalAmount: 0, discountAmount: 17 })], 17, "Voucher").amount).toBe(0);
});
test("partial discount preserves physical cash due and voucher identity", () => {
  expect(receiptSummary([row({ finalAmount: 12, discountAmount: 5, voucherId: "v" })], 17, "Voucher")).toMatchObject({ amount: 12, discount: 5, method: "Cash + Voucher", hasVoucher: true });
});
test("payer plus companions use authoritative row count and roles", () => {
  const summary = receiptSummary([row({ totalPassengers: 3 }), row({ paymentMethod: "GCash", passengerRole: "STUDENT", finalAmount: 13.6, totalPassengers: 3 }), row({ finalAmount: 0, paymentMethod: "Voucher", totalPassengers: 3 })]);
  expect(summary.passengerCount).toBe(3);
  expect(summary.amount).toBe(30.6);
  expect(summary.breakdown.find((b) => b.passengerType === "REGULAR")!.quantity).toBe(2);
});
test("thermal group breakdown includes payer and ignores stale companion-only estimates", () => {
  const output = buildGoojprtReceiptBytes([row(), row({ finalAmount: 13.6, passengerRole: "STUDENT" }), row()], { totalPassengers: 2, passengerBreakdown: [{ passengerType: "STUDENT", quantity: 99, subtotal: 999 }] });
  expect(output.text).toContain("REGULAR x2"); expect(output.text).toContain("STUDENT x1");
  expect(output.text).toContain("47.60"); expect(output.text).not.toContain("999");
});
test.each([[true, true], [true, false], [false, true], [false, false]])("thermal QR=%s/manual=%s independently control claims", (qr, manual) => {
  const output = buildGoojprtReceiptBytes([row({ receiptQrToken: "reward-token" })], { settings: { showQrCode: qr, showManualCode: manual } as ReceiptSettings });
  expect(output.text.includes("SCAN IN REWARDS")).toBe(qr);
  expect(output.text.includes("reward-token")).toBe(manual);
});
test("long manual claim code is not truncated", () => {
  const token = "12345678901234567890123456789012-remaining-code";
  const output = buildGoojprtReceiptBytes([row({ receiptQrToken: token })], { settings: { showQrCode: false, showManualCode: true } as ReceiptSettings });
  expect(output.text).toContain("-remaining-code");
});
test("payment QR and transaction reference do not become claim QR", () => {
  const output = buildGoojprtReceiptBytes([row({ paymentMethod: "GCash", receiptQrToken: null, qrToken: "payment-only" })]);
  expect(output.text).not.toContain("SCAN IN REWARDS"); expect(output.text).not.toContain("payment-only");
});
