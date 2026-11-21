/// <reference types="jest" />
import { mapShift, mapTransaction } from "../../../core/api/api-mappers";
import { buildGoojprtReceiptBytes } from "../../../core/utils/thermal-escpos-builder";
import type { Transaction } from "../../../core/domain/types";

const row = (changes: Partial<Transaction> = {}): Transaction => ({
  transactionId: "TXN-1", paymentMethod: "Cash", finalAmount: 17, baseFare: 17, from: "Calumpit", to: "Malolos", timestamp: Date.parse("2026-11-21T00:00:00Z"), ...changes,
});
const printed = (transaction: Transaction) => buildGoojprtReceiptBytes([transaction]).text;

test("a claimed cash receipt prints Passenger instead of the commuter's name", () => {
  const text = printed(row({ passengerName: "Private Commuter", payerName: "Private Commuter", groupPosition: 1 }));
  expect(text).toMatch(/Commuter\s+Passenger/);
  expect(text).not.toContain("Private Commuter");
});

test("a non-cash receipt keeps the passenger's name", () => {
  expect(printed(row({ paymentMethod: "GCash", passengerName: "Rider Name" }))).toContain("Rider Name");
});

test("a companion's group receipt shows who paid and the group's passenger count", () => {
  const text = printed(row({ groupPosition: 2, payerName: "Group Payer", passengerName: "Other Rider", totalPassengers: 3, grossAmount: 17 }));
  expect(text).toMatch(/Commuter\s+Passenger/);
  expect(text).toContain("Paid by: Group Payer");
  expect(text).not.toContain("Other Rider");
  expect(text).toMatch(/Passengers\s+3/);
  expect(text).toMatch(/Gross fare\s+P17\.00/);
});

test("a bundled fare prints its passenger breakdown in place of the base fare", () => {
  const text = printed(row({
    finalAmount: 47.6, baseFare: 51, grossAmount: 51, totalPassengers: 3, discountAmount: 3.4,
    passengerBreakdown: [
      { passengerType: "REGULAR", quantity: 2, subtotal: 34 },
      { passengerType: "SENIOR_CITIZEN", quantity: 1, subtotal: 13.6 },
      { passengerType: "PWD", quantity: 0, subtotal: 0 },
    ],
  }));
  expect(text).toMatch(/Regular x 2\s+P34\.00/);
  expect(text).toMatch(/Senior Citizen x 1\s+P13\.60/);
  expect(text).not.toContain("Pwd x 0");
  expect(text).not.toContain("Base fare");
  expect(text).toMatch(/Passengers\s+3/);
  expect(text).toMatch(/Gross fare\s+P51\.00/);
});

test("server rows keep the payer, breakdown, and shift vehicle needed by the app", () => {
  const transaction = mapTransaction({
    transaction_id: "TXN-1", payment_method: "CASH", created_at: "2026-11-21T00:00:00Z", payer_name_snapshot: "Payer",
    passenger_breakdown: [{ passenger_type: "STUDENT", quantity: "2", subtotal: "27.20" }],
  });
  expect(transaction.payerName).toBe("Payer");
  expect(transaction.passengerBreakdown).toEqual([{ passengerType: "STUDENT", quantity: 2, subtotal: 27.2 }]);
  expect(mapShift({ shift_id: "S", vehicle_id: "vehicle-1" }).vehicleId).toBe("vehicle-1");
});
