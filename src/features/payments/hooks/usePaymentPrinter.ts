import { useEffect, useRef, useState } from "react";
import { Alert, Platform } from "react-native";
import type {
  ReceiptSettings,
  Shift,
  Transaction,
} from "../../../core/domain/types";
import { appHaptics } from "../../../core/utils/haptics";
import { thermalPrinter, type PrinterStatus } from "../../../core/utils/thermal-printer";
import type { FareInfo, GroupPassengerRow, Step } from "../payment-types";
import { selectedPointName } from "../fare-helpers";

export interface UsePaymentPrinterProps {
  step: Step;
  shift: Shift;
  receiptTransactions: Transaction[];
  receiptSettings: ReceiptSettings | null;
  gcashInitiation: any;
  selectedMethod: string | null;
  isGroupMode: boolean;
  groupPassengerCount: number;
  groupGrossFare: number;
  groupTotalFare: number;
  groupPassengers: Array<{ type: string; quantity: number }>;
  fareInfo: FareInfo | null;
  pickupPoint: any;
  pickupLandmark: string | null;
  dropoffPoint: any;
  dropoffLandmark: string | null;
  commuterType: string;
  cashReceiptToken: string | null;
}

export function usePaymentPrinter({
  step,
  shift,
  receiptTransactions,
  receiptSettings,
  gcashInitiation,
  selectedMethod,
  isGroupMode,
  groupPassengerCount,
  groupGrossFare,
  groupTotalFare,
  groupPassengers,
  fareInfo,
  pickupPoint,
  pickupLandmark,
  dropoffPoint,
  dropoffLandmark,
  commuterType,
  cashReceiptToken,
}: UsePaymentPrinterProps) {
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus>(thermalPrinter.getStatus());
  const [pairedPrinterName, setPairedPrinterName] = useState<string | null>(
    thermalPrinter.getPairedDeviceName(),
  );
  const lastAutoPrintedRef = useRef<string | null>(null);

  useEffect(() => {
    return thermalPrinter.subscribe((status, name) => {
      setPrinterStatus(status);
      setPairedPrinterName(name);
    });
  }, []);

  // Offline cash also supplies real local receipt rows; never fabricate a paid ticket.
  const buildPrintTransactions = (): Transaction[] => receiptTransactions;

  // Direct auto-print helper: prints immediately without waiting or asking questions
  const autoPrintReceipt = (overrideTxns?: Transaction[]) => {
    if (!thermalPrinter.isAutoPrintEnabled()) return;

    const txnsToPrint =
      overrideTxns && overrideTxns.length > 0
        ? overrideTxns
        : receiptTransactions.length > 0
        ? receiptTransactions
        : buildPrintTransactions();

    const firstTxn = txnsToPrint[0];
    if (!firstTxn) return;
    const txnKey = firstTxn?.transactionId || `txn-${Date.now()}`;
    if (lastAutoPrintedRef.current === txnKey) return;
    lastAutoPrintedRef.current = txnKey;

    void thermalPrinter
      .printReceipt(txnsToPrint, {
        shift,
        settings: receiptSettings,
        totalPassengers: isGroupMode ? groupPassengerCount : 1,
        grossFare: isGroupMode ? groupGrossFare : fareInfo?.regularFare ?? 0,
        passengerBreakdown: isGroupMode
          ? groupPassengers.map((p) => ({
              passengerType: p.type,
              quantity: p.quantity,
              subtotal:
                (p.type === "REGULAR" ? fareInfo?.regularFare ?? 0 : fareInfo?.discountedFare ?? 0) *
                p.quantity,
            }))
          : undefined,
      })
      .then((res) => {
        if (!res.success) {
          console.warn("[PaymentPrinter] Auto-print attempt:", res.error);
        }
      });
  };

  // Reset auto-print latch when step leaves 'success'
  useEffect(() => {
    if (step !== "success") {
      lastAutoPrintedRef.current = null;
    }
  }, [step]);

  // Auto-print receipt on payment success if enabled
  useEffect(() => {
    if (step === "success" && thermalPrinter.isAutoPrintEnabled()) {
      autoPrintReceipt();
    }
  }, [
    step,
    receiptTransactions,
    gcashInitiation,
    selectedMethod,
    isGroupMode,
    groupTotalFare,
    fareInfo,
    pickupPoint,
    pickupLandmark,
    dropoffPoint,
    dropoffLandmark,
    shift,
    cashReceiptToken,
    receiptSettings,
    groupPassengerCount,
    groupGrossFare,
    groupPassengers,
    commuterType,
  ]);

  const handlePrint = async () => {
    const txnsToPrint = buildPrintTransactions();
    if (!txnsToPrint.length) {
      Alert.alert("Receipt unavailable", "Refresh the transaction before printing. No estimated ticket was printed.");
      return;
    }
    const result = await thermalPrinter.printReceipt(txnsToPrint, {
      shift,
      settings: receiptSettings,
      totalPassengers: isGroupMode ? groupPassengerCount : 1,
      grossFare: isGroupMode ? groupGrossFare : fareInfo?.regularFare ?? 0,
      passengerBreakdown: isGroupMode
        ? groupPassengers.map((p) => ({
            passengerType: p.type,
            quantity: p.quantity,
            subtotal:
              (p.type === "REGULAR" ? fareInfo?.regularFare ?? 0 : fareInfo?.discountedFare ?? 0) *
              p.quantity,
          }))
        : undefined,
    });

    if (result.success) {
      appHaptics.success();
    } else {
      Alert.alert("Thermal Printer", "Printer is not connected or RawBT is unavailable.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Connect Printer",
          onPress: async () => {
            const connectRes = await thermalPrinter.connect();
            if (connectRes.error) {
              Alert.alert("Pairing Note", connectRes.error);
            }
          },
        },
        ...(Platform.OS === "web" && typeof window !== "undefined" && (window as any).print
          ? [
              {
                text: "Browser Print",
                onPress: () => (window as any).print(),
              },
            ]
          : []),
      ]);
    }
  };

  return {
    printerStatus,
    pairedPrinterName,
    handlePrint,
    autoPrintReceipt,
  };
}
