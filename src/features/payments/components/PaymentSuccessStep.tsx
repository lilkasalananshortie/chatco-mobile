import React from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../core/theme/ThemeProvider";
import type { CommuterType, FarePoint, GcashInitiation, ReceiptSettings, Shift, Transaction } from "../../../core/domain/types";
import { thermalPrinter, type PrinterStatus } from "../../../core/utils/thermal-printer";
import type { FareInfo, GroupPassengerRow, SelectedPaymentMethod } from "../payment-types";
import { formatCurrency, getCommuterTypeLabel, selectedPointName } from "../fare-helpers";
import { TransactionReceipt } from "../TransactionReceipt";

export interface PaymentSuccessStepProps {
  styles: any;
  selectedMethod: SelectedPaymentMethod | null;
  receiptTransactions: Transaction[];
  gcashInitiation: GcashInitiation | null;
  isGroupMode: boolean;
  groupPassengerCount: number;
  groupGrossFare: number;
  groupTotalFare: number;
  groupPassengers: GroupPassengerRow[];
  fareInfo: FareInfo | null;
  commuterType: CommuterType;
  pickupPoint: FarePoint | null;
  pickupLandmark: string | null;
  dropoffPoint: FarePoint | null;
  dropoffLandmark: string | null;
  pickupBadgeText: string;
  dropoffBadgeText: string;
  showReceiptDetails: boolean;
  setShowReceiptDetails: React.Dispatch<React.SetStateAction<boolean>>;
  receiptSettings: ReceiptSettings | null;
  shift: Shift;
  cashReceiptToken: string | null;
  printerStatus: PrinterStatus;
  pairedPrinterName: string | null;
  handlePrint: () => void;
  handleClose: () => void;
}

export function PaymentSuccessStep({
  styles,
  selectedMethod,
  receiptTransactions,
  gcashInitiation,
  isGroupMode,
  groupPassengerCount,
  groupGrossFare,
  groupTotalFare,
  fareInfo,
  commuterType,
  pickupPoint,
  pickupLandmark,
  dropoffPoint,
  dropoffLandmark,
  pickupBadgeText,
  dropoffBadgeText,
  showReceiptDetails,
  setShowReceiptDetails,
  receiptSettings,
  shift,
  cashReceiptToken,
  printerStatus,
  pairedPrinterName,
  handlePrint,
  handleClose,
}: PaymentSuccessStepProps) {
  const { colors, isLofi } = useAppTheme();

  return (
    <View style={[styles.modalCard, { maxHeight: "90%" }]}>
      <ScrollView contentContainerStyle={{ padding: 20, alignItems: "center" }}>
        <View style={styles.successCheckCircle}>
          <Ionicons name="checkmark" size={32} color={isLofi ? colors.success : "#34D399"} />
        </View>

        <Text style={styles.successTitle}>Payment Successful!</Text>
        <Text style={styles.successSubtitle}>
          {selectedMethod === "GCash"
            ? "Fare has been charged via GCash"
            : "Cash payment has been recorded"}
        </Text>

        {/* Summary Card */}
        <View style={styles.successSummaryCard}>
          <View style={styles.confirmRow}>
            <Text style={styles.confirmRowLabel}>Amount Paid</Text>
            <Text style={[styles.confirmRowValue, { fontWeight: "700", color: colors.text }]}>
              {formatCurrency(
                receiptTransactions.reduce((s, t) => s + t.finalAmount, 0) ||
                  (isGroupMode ? groupTotalFare : fareInfo?.finalFare ?? 0)
              )}
            </Text>
          </View>
          <View style={styles.confirmRow}>
            <Text style={styles.confirmRowLabel}>Route</Text>
            <Text style={styles.confirmRowValue}>
              {pickupPoint?.name}
              {pickupLandmark ? ` · ${pickupLandmark}` : ""} → {dropoffPoint?.name}
              {dropoffLandmark ? ` · ${dropoffLandmark}` : ""}
            </Text>
          </View>
          {pickupLandmark ? (
            <View style={styles.confirmRow}>
              <Text style={styles.confirmRowLabel}>Pickup Landmark</Text>
              <Text style={[styles.confirmRowValue, { color: pickupBadgeText }]}>
                {pickupLandmark}
              </Text>
            </View>
          ) : null}
          {dropoffLandmark ? (
            <View style={styles.confirmRow}>
              <Text style={styles.confirmRowLabel}>Drop-off Landmark</Text>
              <Text style={[styles.confirmRowValue, { color: dropoffBadgeText }]}>
                {dropoffLandmark}
              </Text>
            </View>
          ) : null}
          <View style={styles.confirmRow}>
            <Text style={styles.confirmRowLabel}>Barangays</Text>
            <Text style={styles.confirmRowValue}>
              {fareInfo?.barangaysTraveled ?? 0} traveled
            </Text>
          </View>
          <View style={styles.confirmRow}>
            <Text style={styles.confirmRowLabel}>Commuter Type</Text>
            <Text style={styles.confirmRowValue}>
              {isGroupMode
                ? `${groupPassengerCount} group passengers`
                : getCommuterTypeLabel(commuterType)}
            </Text>
          </View>
          <View style={styles.confirmRow}>
            <Text style={styles.confirmRowLabel}>Method</Text>
            <Text
              style={[
                styles.confirmRowValue,
                { color: selectedMethod === "GCash" ? (isLofi ? colors.primary : "#60A5FA") : (isLofi ? colors.success : "#34D399") },
              ]}
            >
              {selectedMethod}
            </Text>
          </View>
          {gcashInitiation && selectedMethod === "GCash" ? (
            <View style={styles.confirmRow}>
              <Text style={styles.confirmRowLabel}>Ref ID</Text>
              <Text style={[styles.confirmRowValue, { fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", fontSize: 11, color: colors.text }]}>
                {gcashInitiation.transactionId}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Receipt Details Toggle */}
        <Pressable
          onPress={() => setShowReceiptDetails((s) => !s)}
          style={styles.receiptAccordionToggle}
        >
          <View>
            <Text style={styles.receiptAccordionTitle}>Receipt Details</Text>
            <Text style={styles.receiptAccordionSubtitle}>
              {showReceiptDetails
                ? `${Math.max(1, receiptTransactions.length)} receipt shown`
                : `Tap to view ${Math.max(1, receiptTransactions.length)} receipt`}
            </Text>
          </View>
          <Ionicons
            name={showReceiptDetails ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.muted}
          />
        </Pressable>

        {/* Thermal Receipt Content */}
        {showReceiptDetails ? (
          <View style={styles.receiptContainer}>
            <TransactionReceipt
              settings={
                receiptSettings ?? {
                  businessName: "CHATCO",
                  addressLine: "",
                  footerNote: "Thank you for riding with Chatco!",
                  paperWidth: "58",
                  autoPrint: true,
                  showDateTime: true,
                  showTransactionId: true,
                  showRoute: true,
                  showUnit: true,
                  showConductor: true,
                  showPassenger: true,
                  showFareBreakdown: true,
                }
              }
              transactionId={
                receiptTransactions[0]?.transactionId ?? gcashInitiation?.transactionId
              }
              timestamp={receiptTransactions[0]?.timestamp ?? Date.now()}
              unitNumber={receiptTransactions[0]?.unitNumber || shift.unitNumber || "—"}
              conductorName={
                receiptTransactions[0]?.conductorName || shift.conductorName || "—"
              }
              passengerType={
                receiptTransactions[0]?.passengerRole ||
                getCommuterTypeLabel(commuterType)
              }
              passengerName={
                selectedMethod === "Cash" ? "Passenger" : receiptTransactions[0]?.passengerName
              }
              from={receiptTransactions[0]?.from || selectedPointName(pickupPoint!, pickupLandmark)}
              to={receiptTransactions[0]?.to || selectedPointName(dropoffPoint!, dropoffLandmark)}
              baseFare={receiptTransactions[0]?.baseFare ?? fareInfo?.regularFare ?? 0}
              discountAmount={
                receiptTransactions[0]?.discountAmount ?? fareInfo?.discountAmount ?? 0
              }
              finalFare={
                receiptTransactions.reduce((s, t) => s + t.finalAmount, 0) ||
                (isGroupMode ? groupTotalFare : fareInfo?.finalFare ?? 0)
              }
              paymentMethod={selectedMethod ?? "Cash"}
              receiptQrToken={
                selectedMethod === "Cash"
                  ? receiptTransactions[0]?.receiptQrToken ?? cashReceiptToken
                  : null
              }
              multiplePaymentReference={
                receiptTransactions[0]?.multiplePaymentReference ??
                gcashInitiation?.multiplePaymentReference ??
                null
              }
              driverName={receiptTransactions[0]?.driverName || shift.driverName}
              totalPassengers={isGroupMode ? groupPassengerCount : 1}
              grossFare={isGroupMode ? groupGrossFare : fareInfo?.regularFare}
            />
          </View>
        ) : null}

        {/* Goojprt Belt Printer Status Bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: isLofi ? colors.surface2 : "rgba(255, 255, 255, 0.04)",
            borderWidth: 1,
            borderColor: isLofi ? colors.border : "rgba(255, 255, 255, 0.08)",
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            marginTop: 12,
            marginBottom: 6,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 3.5,
                backgroundColor:
                  printerStatus === "connected"
                    ? isLofi
                      ? colors.success
                      : "#10B981"
                    : isLofi
                    ? colors.muted
                    : "#6B7280",
              }}
            />
            <Text
              numberOfLines={1}
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: colors.text,
                flexShrink: 1,
              }}
            >
              {printerStatus === "connected"
                ? pairedPrinterName || "Goojprt Belt Printer"
                : "Goojprt: Disconnected"}
            </Text>
          </View>
          <View
            style={{
              backgroundColor: thermalPrinter.isAutoPrintEnabled()
                ? isLofi
                  ? "rgba(22, 112, 90, 0.15)"
                  : "rgba(16, 185, 129, 0.15)"
                : colors.surface,
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
              borderWidth: 1,
              borderColor: thermalPrinter.isAutoPrintEnabled()
                ? isLofi
                  ? colors.success
                  : "rgba(16, 185, 129, 0.3)"
                : colors.border,
            }}
          >
            <Text
              style={{
                fontSize: 9,
                fontWeight: "800",
                color: thermalPrinter.isAutoPrintEnabled()
                  ? isLofi
                    ? colors.success
                    : "#34D399"
                  : colors.muted,
              }}
            >
              {thermalPrinter.isAutoPrintEnabled() ? "AUTO-PRINT: ON" : "AUTO-PRINT: OFF"}
            </Text>
          </View>
        </View>

        {/* Action buttons */}
        <Pressable
          onPress={handlePrint}
          style={[
            styles.printReceiptButton,
            { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
          ]}
        >
          <Ionicons name="print-outline" size={16} color={colors.text} />
          <Text style={styles.printReceiptButtonText}>
            Print {isGroupMode ? "All Receipts" : "Receipt"} (Goojprt 58mm)
          </Text>
        </Pressable>

        <Pressable
          onPress={handleClose}
          style={[
            selectedMethod === "GCash"
              ? styles.gcashActionButton
              : styles.cashActionButton,
            { width: "100%" },
          ]}
        >
          <Text style={styles.cashActionButtonText}>Done</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
