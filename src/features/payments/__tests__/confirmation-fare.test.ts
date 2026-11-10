/// <reference types="jest" />
import React from "react";
import { PaymentConfirmationStep, type PaymentConfirmationStepProps } from "../components/PaymentConfirmationStep";

jest.mock("react-native", () => ({ Pressable: "Button", ScrollView: "Scroll", View: "View" }));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Icon" }));
jest.mock("../../../shared/ui/BrandText", () => ({ Text: "Text" }));
jest.mock("../../../core/theme/payment-theme", () => ({ usePaymentTheme: () => ({ isLofi: false }) }));

const props: PaymentConfirmationStepProps = {
  selectedMethod: "GCash", isGroupMode: false, groupTotalFare: 0, groupGrossFare: 0,
  groupDiscount: 0, groupPassengers: [], commuterType: "REGULAR",
  pickupLandmark: "Gatbuca", dropoffLandmark: "MBB Royal", isInitiatingGcash: false,
  handleConfirmPayment: jest.fn(), onBack: jest.fn(),
  fareInfo: { regularFare: 21.75, discountedFare: 17.5, finalFare: 21.75, discountAmount: 4.25,
    hasDiscount: false, barangaysTraveled: 6, baseBarangayCount: 4, succeedingCount: 2 },
};

function text(node: React.ReactNode): string[] {
  if (typeof node === "string" || typeof node === "number") return [String(node)];
  if (Array.isArray(node)) return node.flatMap(text);
  if (!React.isValidElement(node)) return [];
  return text((node as React.ReactElement<{ children?: React.ReactNode }>).props.children);
}

test("GCash confirmation shows regular fare without applying a stale selected discount", () => {
  const labels = text(PaymentConfirmationStep({ ...props, commuterType: "STUDENT",
    fareInfo: { ...props.fareInfo!, hasDiscount: true, finalFare: 17.5 } }));
  expect(labels).toContain("₱21.75");
  expect(labels).toContain("₱21.75 regular");
  expect(labels).toContain("Generate QR · ₱21.75");
  expect(labels).toContain("Regular");
  expect(labels.some(label => label.includes("discount"))).toBe(false);
});

test("regular Cash confirmation does not show the potential discounted-fare difference", () => {
  const labels = text(PaymentConfirmationStep({ ...props, selectedMethod: "Cash" }));
  expect(labels).toContain("Pay ₱21.75");
  expect(labels.some(label => label.includes("discount"))).toBe(false);
});

test("an applied student Cash discount remains visible with the discounted amount", () => {
  const labels = text(PaymentConfirmationStep({ ...props, selectedMethod: "Cash", commuterType: "STUDENT",
    fareInfo: { ...props.fareInfo!, hasDiscount: true, finalFare: 17.5 } }));
  expect(labels).toContain("Pay ₱17.50");
  expect(labels).toContain("− ₱4.25 student discount");
});

test("applied group discounts remain visible as on the web", () => {
  const labels = text(PaymentConfirmationStep({ ...props, isGroupMode: true,
    groupPassengers: [{ type: "STUDENT", quantity: 1 }], groupGrossFare: 21.75,
    groupTotalFare: 17.5, groupDiscount: 4.25 }));
  expect(labels).toContain("Generate QR · ₱17.50");
  expect(labels).toContain("− ₱4.25 discount");
});
