/// <reference types="jest" />
import type { Transaction } from "../../domain/types";
import { buildGoojprtReceiptBytes, encodeText, formatRow, printableText } from "../thermal-escpos-builder";

const offlineTicket = {
  transactionId: "TKT-UNIT004-0001", paymentMethod: "Cash", finalAmount: 21.25, from: "Binang · Sto. Niño", to: "Builders",
  timestamp: Date.parse("2026-11-21T06:00:00+08:00"), offlinePending: true,
} as Transaction;

test("stop names print in plain ASCII", () => {
  expect(printableText("Binang · Sto. Niño — ₱21.25")).toBe("Binang - Sto. Nino - P21.25");
  expect(Array.from(encodeText("Sto. Niño · ÑÁé")).every(byte => byte < 0x80)).toBe(true);
});

test("an unknown character becomes one visible placeholder", () => {
  expect(printableText("A😀B")).toBe("A?B");
});

test("a normal row fills exactly one line", () => {
  const row = formatRow("Unit", "UNIT-004");
  expect(row.length).toBe(33);
  expect(row.startsWith("Unit")).toBe(true);
  expect(row.endsWith("UNIT-004\n")).toBe(true);
});

test("a long stop keeps its label and never passes the paper width", () => {
  const row = formatRow("From", "C.I. (Colegio de Calumpit) · Barangay Hall Crossing");
  const lines = row.trimEnd().split("\n");
  expect(lines[0]).toBe("From");
  expect(lines.length).toBeGreaterThan(2);
  expect(lines.every(line => line.length <= 32)).toBe(true);
  expect(row.replace(/\s+/g, " ")).toContain("C.I. (Colegio de Calumpit) - Barangay Hall Crossing");
});

test("a word longer than the paper is split instead of overflowing", () => {
  expect(formatRow("Ref", "X".repeat(40)).trimEnd().split("\n").every(line => line.length <= 32)).toBe(true);
});

test("an offline receipt says the reward code comes after sync", () => {
  expect(buildGoojprtReceiptBytes([offlineTicket]).text.replace(/\s+/g, " ")).toContain("Reward code is available on a reprint after it syncs");
});

test("a synced reprint shows the number from the original receipt and its reward code", () => {
  const { text } = buildGoojprtReceiptBytes([{
    ...offlineTicket, transactionId: "TXN-2026ABCD2345", offlinePending: false,
    offlineTicketRef: "TKT-UNIT004-0001", receiptQrToken: "token-123",
  }]);
  expect(text).toContain("TXN-2026ABCD2345");
  expect(text).toContain("TKT-UNIT004-0001");
  expect(text).toContain("token-123");
  expect(text).not.toContain("Offline ticket");
});
