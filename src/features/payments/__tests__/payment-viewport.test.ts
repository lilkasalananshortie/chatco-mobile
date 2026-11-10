/// <reference types="jest" />
import React from "react";
import { PassengerGroupStep } from "../components/PassengerGroupStep";
import { GcashQrStep } from "../components/GcashQrStep";
import { PaymentFailedStep } from "../components/PaymentFailedStep";
import { appHaptics } from "../../../core/utils/haptics";

jest.mock("react-native", () => ({ Pressable: "Button", ScrollView: "Scroll", View: "View", useWindowDimensions: () => ({ width: 400, height: 800 }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 24, bottom: 24 }) }));
jest.mock("../../../shared/ui/BrandText", () => ({ Text: "Text" }));
jest.mock("../../../core/theme/payment-theme", () => ({ usePaymentTheme: () => ({ colors: { border: "#444", muted: "#aaa" }, isLofi: false, isLowFidelity: false }) }));
jest.mock("../../../core/utils/haptics", () => ({ appHaptics: { medium: jest.fn() } }));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Icon" }));
jest.mock("react-native-qrcode-svg", () => ({ __esModule: true, default: "QrCode" }));

function walk(node: unknown): React.ReactElement<any>[] {
  if (Array.isArray(node)) return node.flatMap(walk);
  if (!React.isValidElement(node)) return [];
  const element = node as React.ReactElement<any>;
  return [element, ...walk(element.props.children)];
}

test("all passenger types have visible, pressable tiles that increment their counts", () => {
  const counts = { REGULAR: 0, SENIOR_CITIZEN: 0, STUDENT: 0, PWD: 0 };
  const setGroupCounts = jest.fn();
  const nodes = walk(PassengerGroupStep({ styles: {}, selectedMethod: "Cash", pickupPoint: { name: "A" } as any,
    dropoffPoint: { name: "B" } as any, groupCounts: counts, setGroupCounts, groupEnteredCount: 0,
    groupDiscount: 0, groupTotalFare: 0, fareInfo: null, isInitiatingGcash: false,
    handleConfirmPayment: jest.fn(), setStep: jest.fn() }));
  const viewport = nodes.find(element => element.type === "Scroll")!;
  expect(viewport.props.style.height).toBeGreaterThan(0);
  for (const label of ["Regular", "Senior", "Student", "PWD"]) {
    expect(nodes.some(element => element.type === "Button" && element.props.accessibilityLabel === `Add ${label}, 0 added`)).toBe(true);
  }
  nodes.find(element => element.props.accessibilityLabel === "Add Regular, 0 added")!.props.onPress();
  expect(setGroupCounts.mock.calls[0][0](counts).REGULAR).toBe(1);
  expect(appHaptics.medium).toHaveBeenCalled();
});

test("GCash QR and payment errors render inside bounded scroll areas", () => {
  const qr = walk(GcashQrStep({ styles: {}, gcashInitiation: { qrToken: "pay-token", amount: 17, transactionId: "tx", expiresAt: "2026-11-10T04:00:00Z" } as any,
    pickupPoint: null, dropoffPoint: null, gcashStatus: "pending", gcashError: null, qrSecondsLeft: 60,
    isCancellingGcash: false, handleCancelGcash: jest.fn(), stopPolling: jest.fn(), setStep: jest.fn() }));
  expect(qr.find(element => element.type === "Scroll")!.props.style.height).toBeGreaterThan(0);
  expect(qr.find(element => element.type === "QrCode")!.props.value).toBe("pay-token");

  const missingToken = walk(GcashQrStep({ styles: {}, gcashInitiation: { qrToken: "", amount: 17, transactionId: "tx", expiresAt: "2026-11-10T04:00:00Z" } as any,
    pickupPoint: null, dropoffPoint: null, gcashStatus: "pending", gcashError: null, qrSecondsLeft: 60,
    isCancellingGcash: false, handleCancelGcash: jest.fn(), stopPolling: jest.fn(), setStep: jest.fn() }));
  expect(missingToken.some(element => element.type === "QrCode")).toBe(false);
  expect(missingToken.some(element => element.props.accessibilityRole === "alert" && String(element.props.children).includes("no QR code"))).toBe(true);

  const failed = walk(PaymentFailedStep({ styles: {}, gcashError: "GCash is unavailable while offline.", selectedMethod: "GCash",
    isGroupMode: false, handleClose: jest.fn(), setStep: jest.fn() }));
  expect(failed.find(element => element.type === "Scroll")!.props.style.height).toBeGreaterThan(0);
  expect(failed.some(element => element.type === "Text" && element.props.children === "GCash is unavailable while offline.")).toBe(true);
});
