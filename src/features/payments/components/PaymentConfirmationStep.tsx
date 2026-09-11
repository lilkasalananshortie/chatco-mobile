import React from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../core/theme/ThemeProvider";
import type { CommuterType, FarePoint } from "../../../core/domain/types";
import type { FareInfo, SelectedPaymentMethod, Step } from "../payment-types";
import { formatCurrency, getCommuterTypeLabel } from "../fare-helpers";

export interface PaymentConfirmationStepProps {
  styles: any;
  selectedMethod: SelectedPaymentMethod | null;
  pickupPoint: FarePoint | null;
  pickupLandmark: string | null;
  dropoffPoint: FarePoint | null;
  dropoffLandmark: string | null;
  commuterType: CommuterType;
  isGroupMode: boolean;
  groupPassengerCount: number;
  groupTotalFare: number;
  fareInfo: FareInfo | null;
  voucherCode: string;
  setVoucherCode: (code: string) => void;
  isInitiatingGcash: boolean;
  pickupBadgeText: string;
  dropoffBadgeText: string;
  handleConfirmPayment: () => void;
  setStep: (step: Step) => void;
}

export function PaymentConfirmationStep({
  styles,
  selectedMethod,
  pickupPoint,
  pickupLandmark,
  dropoffPoint,
  dropoffLandmark,
  commuterType,
  isGroupMode,
  groupPassengerCount,
  groupTotalFare,
  fareInfo,
  voucherCode,
  setVoucherCode,
  isInitiatingGcash,
  pickupBadgeText,
  dropoffBadgeText,
  handleConfirmPayment,
  setStep,
}: PaymentConfirmationStepProps) {
  const { colors, isLofi } = useAppTheme();

  return (
    <View style={styles.modalCard}>
      <View style={styles.modalHeader}>
        <View>
          <Text style={styles.modalTitle}>Confirm Payment</Text>
          <Text style={styles.modalSubtitle}>Review fare breakdown and details</Text>
        </View>
        <Pressable
          onPress={() => setStep(isGroupMode ? "passengers" : "select")}
          style={styles.iconButton}
          accessibilityLabel="Back"
        >
          <Ionicons name="close" size={20} color={colors.muted} />
        </Pressable>
      </View>

      <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ padding: 18, gap: 12 }}>
        <View style={styles.confirmDetailsBox}>
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
            <Text style={styles.confirmRowLabel}>Barangays Traveled</Text>
            <Text style={styles.confirmRowValue}>
              {fareInfo?.barangaysTraveled ?? 0}
            </Text>
          </View>
          <View style={styles.confirmRow}>
            <Text style={styles.confirmRowLabel}>Fare Basis</Text>
            <Text style={[styles.confirmRowValue, { fontSize: 11, color: colors.muted }]}>
              {(fareInfo?.succeedingCount ?? 0) > 0
                ? `Base fare covers first ${fareInfo?.baseBarangayCount} + ${fareInfo?.succeedingCount} succeeding`
                : "Base fare (within first 4 barangays)"}
            </Text>
          </View>
          <View style={styles.confirmRow}>
            <Text style={styles.confirmRowLabel}>Commuter Type</Text>
            <Text style={styles.confirmRowValue}>
              {isGroupMode
                ? `${groupPassengerCount} group passengers`
                : selectedMethod === "GCash"
                ? "Detected after scan"
                : getCommuterTypeLabel(commuterType)}
            </Text>
          </View>
          {fareInfo?.hasDiscount && !isGroupMode ? (
            <View style={styles.confirmRow}>
              <Text style={styles.confirmRowLabel}>Regular Fare</Text>
              <Text style={[styles.confirmRowValue, { textDecorationLine: "line-through", color: colors.muted }]}>
                {formatCurrency(fareInfo.regularFare)}
              </Text>
            </View>
          ) : null}
          {fareInfo?.hasDiscount && (fareInfo.discountAmount ?? 0) > 0 && !isGroupMode ? (
            <View style={styles.confirmRow}>
              <Text style={styles.confirmRowLabel}>Discount</Text>
              <Text style={[styles.confirmRowValue, { color: isLofi ? colors.success : "#34D399" }]}>
                -{formatCurrency(fareInfo.discountAmount)}
              </Text>
            </View>
          ) : null}
          <View style={styles.confirmDividerTotal}>
            <Text style={styles.confirmTotalLabel}>Total</Text>
            <Text style={styles.confirmTotalValue}>
              {formatCurrency(isGroupMode ? groupTotalFare : fareInfo?.finalFare ?? 0)}
            </Text>
          </View>
        </View>

        {/* Method Notice Card */}
        {selectedMethod === "GCash" ? (
          <View style={styles.gcashNoticeBox}>
            <View style={styles.noticeHeaderRow}>
              <Ionicons name="shield-checkmark-outline" size={16} color={isLofi ? colors.primary : "#62A0EA"} />
              <Text style={styles.gcashNoticeTitle}>GCash Secure Payment</Text>
            </View>
            <Text style={styles.gcashNoticeText}>
              Fare will be charged to the commuter's GCash account. No wallet balance needed —
              pay directly.
            </Text>
          </View>
        ) : (
          <View style={styles.cashNoticeBox}>
            <View style={styles.noticeHeaderRow}>
              <Ionicons name="cash-outline" size={16} color={isLofi ? colors.success : "#34D399"} />
              <Text style={styles.cashNoticeTitle}>Cash Payment</Text>
            </View>
            <Text style={styles.cashNoticeText}>
              Collect the exact fare amount from the commuter in cash. This transaction will be
              recorded in your shift log.
            </Text>
          </View>
        )}

        {/* Voucher Code Input */}
        {selectedMethod === "Voucher" ? (
          <View style={styles.voucherInputBox}>
            <Text style={styles.voucherInputLabel}>
              Voucher Code <Text style={{ color: colors.danger }}>*</Text>
            </Text>
            <TextInput
              value={voucherCode}
              onChangeText={(text) => setVoucherCode(text.toUpperCase().trim())}
              placeholder="e.g. REWARD-AB12CD34"
              placeholderTextColor={colors.muted}
              autoCapitalize="characters"
              style={styles.voucherTextInput}
            />
            <Text style={styles.voucherInputSubtext}>
              Enter the code shown by the commuter's app. The ride will be recorded as a free
              ride (₱0).
            </Text>
          </View>
        ) : null}

        {/* Buttons */}
        <View style={styles.actionButtonsRow}>
          <Pressable
            disabled={isInitiatingGcash}
            onPress={() => setStep(isGroupMode ? "passengers" : "select")}
            style={styles.btnSecondary}
          >
            <Text style={styles.btnSecondaryText}>Back</Text>
          </Pressable>
          <Pressable
            disabled={
              isInitiatingGcash ||
              (selectedMethod === "Voucher" && !voucherCode.trim())
            }
            onPress={handleConfirmPayment}
            style={[
              selectedMethod === "GCash"
                ? styles.gcashActionButton
                : selectedMethod === "Voucher"
                ? styles.voucherActionButton
                : styles.cashActionButton,
              { flex: 1 },
            ]}
          >
            <Text style={styles.cashActionButtonText}>
              {isInitiatingGcash
                ? "Starting…"
                : selectedMethod === "GCash"
                ? `Generate QR · ${formatCurrency(
                    isGroupMode ? groupTotalFare : fareInfo?.finalFare ?? 0
                  )}`
                : selectedMethod === "Voucher"
                ? "Apply Voucher (Free Ride)"
                : `Pay ${formatCurrency(
                    isGroupMode ? groupTotalFare : fareInfo?.finalFare ?? 0
                  )}`}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
