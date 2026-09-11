import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../core/theme/ThemeProvider";
import { appHaptics } from "../../../core/utils/haptics";
import type { FarePoint } from "../../../core/domain/types";
import type { FareInfo, GroupPassengerType, SelectedPaymentMethod, Step } from "../payment-types";
import { formatCurrency } from "../fare-helpers";

export interface PassengerGroupStepProps {
  styles: any;
  selectedMethod: SelectedPaymentMethod | null;
  pickupPoint: FarePoint | null;
  dropoffPoint: FarePoint | null;
  groupCounts: Record<GroupPassengerType, number>;
  setGroupCounts: React.Dispatch<React.SetStateAction<Record<GroupPassengerType, number>>>;
  groupEnteredCount: number;
  groupGrossFare: number;
  groupDiscount: number;
  groupTotalFare: number;
  fareInfo: FareInfo | null;
  isInitiatingGcash: boolean;
  handleConfirmPayment: () => void;
  setStep: (step: Step) => void;
}

export function PassengerGroupStep({
  styles,
  selectedMethod,
  pickupPoint,
  dropoffPoint,
  groupCounts,
  setGroupCounts,
  groupEnteredCount,
  groupGrossFare,
  groupDiscount,
  groupTotalFare,
  fareInfo,
  isInitiatingGcash,
  handleConfirmPayment,
  setStep,
}: PassengerGroupStepProps) {
  const { colors, isLofi } = useAppTheme();

  return (
    <View style={styles.modalCard}>
      <View style={styles.modalHeader}>
        <View>
          <Text style={styles.modalTitle}>Passenger Group</Text>
          <Text style={styles.modalSubtitle}>
            {pickupPoint?.name} → {dropoffPoint?.name}
          </Text>
        </View>
        <Pressable onPress={() => setStep("select")} style={styles.iconButton} accessibilityLabel="Back to location">
          <Ionicons name="close" size={20} color={colors.muted} />
        </Pressable>
      </View>

      <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ padding: 18, gap: 12 }}>
        <Text style={styles.sectionLabel}>
          {selectedMethod === "GCash" ? "COMPANIONS ONLY" : "PASSENGERS"}
        </Text>

        {(
          [
            { type: "REGULAR", label: "Regular" },
            { type: "SENIOR_CITIZEN", label: "Senior" },
            { type: "STUDENT", label: "Student" },
            { type: "PWD", label: "PWD" },
          ] as { type: GroupPassengerType; label: string }[]
        ).map(({ type, label }) => {
          const count = groupCounts[type];
          const fare =
            type === "REGULAR"
              ? fareInfo?.regularFare ?? 0
              : fareInfo?.discountedFare ?? 0;
          return (
            <View key={type} style={styles.groupCounterRow}>
              <View>
                <Text style={styles.groupCounterLabel}>{label}</Text>
                {selectedMethod !== "GCash" || count > 0 ? (
                  <>
                    <Text style={styles.groupCounterFare}>
                      Fare {formatCurrency(fare)}
                      {type !== "REGULAR" &&
                        ` · Disc. ${formatCurrency((fareInfo?.regularFare ?? 0) - fare)}`}
                    </Text>
                    <Text style={styles.groupCounterSubtotal}>
                      Subtotal {formatCurrency(fare * count)}
                    </Text>
                  </>
                ) : null}
              </View>
              <View style={styles.stepperContainer}>
                <Pressable
                  disabled={count === 0}
                  onPress={() => {
                    appHaptics.medium();
                    setGroupCounts((c) => ({ ...c, [type]: Math.max(0, c[type] - 1) }));
                  }}
                  style={[styles.stepperMinus, count === 0 ? { opacity: 0.3 } : null]}
                  accessibilityLabel={`Decrease ${label}`}
                >
                  <Text style={styles.stepperBtnText}>−</Text>
                </Pressable>
                <Text style={styles.stepperCountText}>{count}</Text>
                <Pressable
                  onPress={() => {
                    appHaptics.medium();
                    setGroupCounts((c) => ({ ...c, [type]: Math.min(50, c[type] + 1) }));
                  }}
                  style={styles.stepperPlus}
                  accessibilityLabel={`Increase ${label}`}
                >
                  <Text style={[styles.stepperBtnText, { color: "#FFFFFF" }]}>+</Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        {/* Blue Group Summary Box */}
        <View style={styles.groupSummaryBox}>
          <View style={styles.summaryLine}>
            <Text style={styles.summaryLineLabel}>
              {selectedMethod === "GCash" ? "Companions entered" : "Passengers entered"}
            </Text>
            <Text style={styles.summaryLineValue}>
              {groupEnteredCount}
              {selectedMethod === "GCash" ? (
                <Text style={{ color: isLofi ? colors.primary : "#93C5FD", fontSize: 11 }}> (+ you)</Text>
              ) : null}
            </Text>
          </View>

          {selectedMethod !== "GCash" || groupEnteredCount > 0 ? (
            <>
              <View style={styles.summaryLine}>
                <Text style={styles.summaryLineLabel}>Gross fare</Text>
                <Text style={styles.summaryLineValue}>{formatCurrency(groupGrossFare)}</Text>
              </View>
              {groupDiscount > 0 ? (
                <View style={styles.summaryLine}>
                  <Text style={styles.summaryLineLabel}>Discounts</Text>
                  <Text style={[styles.summaryLineValue, { color: isLofi ? colors.success : "#34D399" }]}>
                    -{formatCurrency(groupDiscount)}
                  </Text>
                </View>
              ) : null}
            </>
          ) : null}

          {/* Badge tags */}
          <View style={styles.badgeTagsRow}>
            {(
              [
                ["REGULAR", "Regular"],
                ["SENIOR_CITIZEN", "Senior"],
                ["STUDENT", "Student"],
                ["PWD", "PWD"],
              ] as const
            )
              .filter(([t]) => groupCounts[t] > 0)
              .map(([t, label]) => (
                <View key={t} style={styles.summaryPill}>
                  <Text style={styles.summaryPillText}>
                    {label} × {groupCounts[t]}
                  </Text>
                </View>
              ))}
          </View>

          {selectedMethod !== "GCash" || groupEnteredCount > 0 ? (
            <View style={styles.summaryDividerTotal}>
              <Text style={styles.summaryTotalLabel}>Estimated total</Text>
              <Text style={styles.summaryTotalAmount}>
                {formatCurrency(groupTotalFare)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Action buttons */}
        <View style={styles.actionButtonsRow}>
          <Pressable onPress={() => setStep("select")} style={styles.btnSecondary}>
            <Text style={styles.btnSecondaryText}>Back</Text>
          </Pressable>
          <Pressable
            disabled={groupEnteredCount === 0 || isInitiatingGcash}
            onPress={handleConfirmPayment}
            style={[
              styles.btnPrimary,
              groupEnteredCount === 0 ? { opacity: 0.4 } : null,
            ]}
          >
            <Text style={styles.btnPrimaryText}>
              {isInitiatingGcash
                ? "Starting…"
                : selectedMethod === "GCash"
                ? groupEnteredCount > 0
                  ? `Generate QR · ${formatCurrency(groupTotalFare)}`
                  : "Generate QR"
                : `Pay ${formatCurrency(groupTotalFare)}`}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
