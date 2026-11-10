import React from "react";
import { Text } from "../../../shared/ui/BrandText";
import { Animated, Platform, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePaymentTheme } from "../../../core/theme/payment-theme";
import type { CommuterType, FarePoint, GcashInitiation, ReceiptSettings, Shift, Transaction } from "../../../core/domain/types";
import type { PrinterStatus } from "../../../core/utils/thermal-printer";
import type { FareInfo, GroupPassengerRow, SelectedPaymentMethod } from "../payment-types";
import { formatCurrency, getCommuterTypeLabel, selectedPointName } from "../fare-helpers";
import { TransactionReceipt } from "../TransactionReceipt";
import { receiptSummary } from "../receipt-summary";
import { useAnimatedToggle } from "../../../shared/ui/useAnimatedFeedback";
import { useReducedMotion } from "../../../shared/ui/useWebEntrance";

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
  const { colors, isLofi, isLowFidelity } = usePaymentTheme();
  const reduceMotion = useReducedMotion();
  const receiptChevron = useAnimatedToggle(showReceiptDetails, 150, isLowFidelity || reduceMotion);
  const summary = receiptSummary(receiptTransactions, isGroupMode ? groupTotalFare : fareInfo?.finalFare ?? 0, selectedMethod ?? "Cash");
  const hasPendingOfflineCash = selectedMethod === "Cash" && receiptTransactions.some(transaction => transaction.offlinePending);

  return (
    // Amounts and passenger roles below come from the final server receipt rows.
    <View style={[styles.modalCard, { maxWidth: 512, maxHeight: "92%", flexShrink: 1, flexDirection: "column", backgroundColor: isLofi ? "#FFFFFF" : "#071A2E" }]}>
      <ScrollView style={{ flexGrow: 0, flexShrink: 1, minHeight: 0 }} contentContainerStyle={{ padding: 20, alignItems: "center" }} bounces={false}>
        <View style={styles.successCheckCircle}>
          <Ionicons name="checkmark" size={32} color={isLofi ? colors.success : "#00C896"} accessible={false} />
        </View>

        <Text accessibilityRole="header" style={styles.successTitle}>{hasPendingOfflineCash ? "Saved on this device" : "Payment Successful!"}</Text>
        <Text style={styles.successSubtitle}>
          {hasPendingOfflineCash
            ? "Cash fare saved locally. It will sync to this shift when the connection returns."
            : selectedMethod === "Voucher" && summary.amount > 0
            ? `Voucher applied. Collect ₱${summary.amount.toFixed(2)} remaining fare in cash.`
            : summary.amount === 0 && summary.hasVoucher ? "The voucher covered the fare. No cash is due."
            : selectedMethod === "GCash" ? "Fare has been charged via GCash"
            : "Cash payment has been recorded"}
        </Text>

        {/* Summary Card */}
        <View style={styles.successSummaryCard}>
          <View style={styles.confirmRow}>
            <Text style={styles.confirmRowLabel}>Amount Paid</Text>
            <Text style={[styles.confirmRowValue, { fontWeight: "700", color: colors.text }]}>
                {formatCurrency(summary.amount)}
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
              <Text style={[styles.confirmRowValue, { color: selectedMethod === "GCash" ? (isLofi ? colors.success : "#00C896") : pickupBadgeText }]}>
                {pickupLandmark}
              </Text>
            </View>
          ) : null}
          {dropoffLandmark ? (
            <View style={styles.confirmRow}>
              <Text style={styles.confirmRowLabel}>Drop-off Landmark</Text>
              <Text style={[styles.confirmRowValue, { color: selectedMethod === "GCash" ? "#F97316" : dropoffBadgeText }]}>
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
                ? `${summary.passengerCount} group passengers`
                : getCommuterTypeLabel((receiptTransactions[0]?.passengerRole ?? commuterType) as CommuterType)}
            </Text>
          </View>
          <View style={styles.confirmRow}>
            <Text style={styles.confirmRowLabel}>Method</Text>
            <Text
              style={[
                styles.confirmRowValue,
                { color: selectedMethod === "GCash" ? (isLofi ? colors.primary : "#60A5FA") : (isLofi ? colors.success : "#00C896") },
              ]}
            >
              {summary.method}
            </Text>
          </View>
          {gcashInitiation && selectedMethod === "GCash" ? (
            <View style={styles.confirmRow}>
              <Text style={styles.confirmRowLabel}>Ref ID</Text>
              <Text style={[styles.confirmRowValue, { fontSize: 10, color: colors.muted }]}>
                {receiptTransactions[0]?.transactionId ?? gcashInitiation.transactionId}
              </Text>
            </View>
          ) : null}
          {showReceiptDetails && selectedMethod === "Cash" && receiptSettings?.showManualCode !== false && (receiptTransactions[0]?.receiptQrToken ?? cashReceiptToken) ? (
            <View
              accessible
              accessibilityLabel={`Reward Claim Code: ${receiptTransactions[0]?.receiptQrToken ?? cashReceiptToken}`}
              style={[styles.confirmRow, { flexDirection: "column", alignItems: "stretch", gap: 4, marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }]}
            >
              <Text style={[styles.confirmRowLabel, { fontWeight: "700", color: isLofi ? colors.primary : "#38BDF8" }]}>Reward Claim Code</Text>
              <View style={{ width: "100%", flexDirection: "row", flexWrap: "wrap", alignItems: "center" }}>
                {Array.from(
                  { length: Math.ceil((receiptTransactions[0]?.receiptQrToken ?? cashReceiptToken ?? "").length / 6) },
                  (_, index) => (
                    <Text
                      key={index}
                      accessible={false}
                      style={{
                        fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                        fontWeight: "700",
                        fontSize: 13,
                        letterSpacing: 1,
                        color: isLofi ? colors.primary : "#38BDF8",
                      }}
                    >
                      {(receiptTransactions[0]?.receiptQrToken ?? cashReceiptToken ?? "").slice(index * 6, index * 6 + 6)}
                    </Text>
                  ),
                )}
              </View>
            </View>
          ) : null}
        </View>

        {/* Receipt Details Toggle */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Receipt Details"
          accessibilityState={{ expanded: showReceiptDetails }}
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
          <Animated.View style={{ transform: [{ rotate: receiptChevron.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] }) }] }}>
            <Ionicons name="chevron-down" size={18} color={colors.muted} />
          </Animated.View>
        </Pressable>

        {/* Action buttons */}
        <Pressable
          accessibilityRole="button"
          onPress={handlePrint}
          style={[
            styles.printReceiptButton,
            { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
          ]}
        >
          <Text style={styles.printReceiptButtonText}>
            Print {isGroupMode ? "All Receipts" : "Receipt"}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
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
              from={receiptTransactions[0]?.from || (pickupPoint ? selectedPointName(pickupPoint, pickupLandmark) : gcashInitiation?.from ?? "")}
              to={receiptTransactions[0]?.to || (dropoffPoint ? selectedPointName(dropoffPoint, dropoffLandmark) : gcashInitiation?.to ?? "")}
              baseFare={receiptTransactions[0]?.baseFare ?? fareInfo?.regularFare ?? 0}
              discountAmount={receiptTransactions.length ? summary.discount : fareInfo?.discountAmount ?? 0}
              finalFare={
                summary.amount
              }
              paymentMethod={summary.method}
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
              totalPassengers={receiptTransactions.length ? summary.passengerCount : isGroupMode ? groupPassengerCount : 1}
              grossFare={receiptTransactions.length ? summary.gross : isGroupMode ? groupGrossFare : fareInfo?.regularFare}
              passengerBreakdown={receiptTransactions.length > 1 ? summary.breakdown : []}
            />
          </View>
        ) : null}

        {/* Goojprt Belt Printer Status Bar */}
        {showReceiptDetails ? <View
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
                ? pairedPrinterName || "Thermal Printer"
                : "Printer: Disconnected"}
            </Text>
          </View>
        </View> : null}

      </ScrollView>
    </View>
  );
}
