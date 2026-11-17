/// <reference types="jest" />
import { receiptSummary } from "../receipt-summary";
import { buildGoojprtReceiptBytes, buildGoojprtReceiptBatchBytes } from "../../../core/utils/thermal-escpos-builder";
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
test("three passenger transactions print three independent receipts with full references", () => {
  const output = buildGoojprtReceiptBatchBytes([
    row({ transactionId: "TXN-2026ABCDEFGH", receiptQrToken: "cash-claim-1" }),
    row({ transactionId: "TXN-2026STUDENT1", receiptQrToken: "cash-claim-2", finalAmount: 13.6, passengerRole: "STUDENT", discountAmount: 3.4 }),
    row({ transactionId: "TXN-2026REGULAR2", receiptQrToken: "cash-claim-3" }),
  ]);
  const slips = output.text.split("FARE RECEIPT").slice(1);
  expect(slips).toHaveLength(3);
  expect(slips[0]).toContain("TXN-2026ABCDEFGH");
  expect(slips[1]).toContain("TXN-2026STUDENT1");
  expect(slips[1]).toContain("P13.60");
  expect(slips[2]).toContain("TXN-2026REGULAR2");
  expect(output.bytes.reduce((count, byte, index) => count + Number(byte === 0x1d && output.bytes[index + 1] === 0x28 && output.bytes[index + 2] === 0x6b && output.bytes[index + 6] === 0x51), 0)).toBe(3);
  for (const [index, token] of ["cash-claim-1", "cash-claim-2", "cash-claim-3"].entries()) expect(slips[index]).toContain(token);
  for (const slip of slips) expect(slip).toMatch(/Passengers\s+1/);
  expect(output.text).not.toContain("Ticket ID");
  expect(output.text).not.toContain("OFFICIAL");
});
test.each([[true, true], [true, false], [false, true], [false, false]])("thermal QR=%s/manual=%s independently control claims", (qr, manual) => {
  const output = buildGoojprtReceiptBytes([row({ receiptQrToken: "reward-token" })], { settings: { showQrCode: qr, showManualCode: manual } as ReceiptSettings });
  expect(output.bytes.some((byte, index) => byte === 0x1d && output.bytes[index + 1] === 0x28 && output.bytes[index + 2] === 0x6b)).toBe(qr);
  expect(output.text.includes("Receipt code")).toBe(manual);
  expect(output.text.includes("reward-token")).toBe(manual);
});

test("thermal print follows saved web receipt detail switches and paper width", () => {
  const settings = { paperWidth: "80", businessName: "CHATCO EXPRESS TRANSPORT", addressLine: "Long address in Malolos Bulacan", footerNote: "Thank you for riding with Chatco and have a safe trip", showDateTime: false, showTransactionId: false, showUnit: false, showConductor: false, showPassenger: false, showRoute: false, showFareBreakdown: false, showQrCode: false, showManualCode: false } as ReceiptSettings;
  const output = buildGoojprtReceiptBytes([row({ transactionId: "TXN-HIDDEN", unitNumber: "UNIT-HIDDEN", conductorName: "HIDDEN", passengerName: "HIDDEN", multiplePaymentReference: "GROUP-123" })], { settings });
  expect(output.text).toContain("-".repeat(48));
  expect(output.text).toContain("CHATCO EXPRESS TRANSPORT");
  expect(output.text.replace(/\s+/g, " ")).toContain("safe trip");
  expect(output.text).toContain("Group ref");
  for (const hidden of ["TXN-HIDDEN", "UNIT-HIDDEN", "Conductor", "Commuter", "Base fare", "From", "Date"]) expect(output.text).not.toContain(hidden);
  expect(output.text).toContain("TOTAL");
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
