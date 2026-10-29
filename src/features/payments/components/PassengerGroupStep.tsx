import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePaymentTheme } from "../../../core/theme/payment-theme";
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
  groupDiscount: number;
  groupTotalFare: number;
  fareInfo: FareInfo | null;
  isInitiatingGcash: boolean;
  handleConfirmPayment: () => void;
  setStep: (step: Step) => void;
}

const passengerTypes: { type: GroupPassengerType; label: string }[] = [
  { type: "REGULAR", label: "Regular" },
  { type: "SENIOR_CITIZEN", label: "Senior" },
  { type: "STUDENT", label: "Student" },
  { type: "PWD", label: "PWD" },
];

export function PassengerGroupStep({
  styles,
  selectedMethod,
  pickupPoint,
  dropoffPoint,
  groupCounts,
  setGroupCounts,
  groupEnteredCount,
  groupDiscount,
  groupTotalFare,
  fareInfo,
  isInitiatingGcash,
  handleConfirmPayment,
  setStep,
}: PassengerGroupStepProps) {
  const { colors, isLofi } = usePaymentTheme();
  const isGCashGroup = selectedMethod === "GCash";
  const showFareSummary = !isGCashGroup || groupEnteredCount > 0;
  const groupNoun = isGCashGroup
    ? groupEnteredCount === 1 ? "companion" : "companions"
    : groupEnteredCount === 1 ? "passenger" : "passengers";
  const border = isLofi ? colors.border : "rgba(255,255,255,0.1)";
  const surface = isLofi ? "#FFFFFF" : "#071A2E";
  const summarySurface = isLofi ? "#F9FAFB" : "#050F1A";
  const mainText = isLofi ? "#111827" : "#FFFFFF";
  const mutedText = isLofi ? "#6B7280" : "rgba(255,255,255,0.45)";
  const mix = passengerTypes
    .filter(({ type }) => groupCounts[type] > 0)
    .map(({ type, label }) => `${label} × ${groupCounts[type]}`)
    .join(" · ");
  const actionDisabled = groupEnteredCount === 0 || !pickupPoint || !dropoffPoint || isInitiatingGcash;

  return (
    <View style={[styles.modalCard, { maxWidth: 448, maxHeight: "100%", borderRadius: 16, borderWidth: 1, borderColor: border, overflow: "hidden", backgroundColor: surface }]}>
      <View style={{ flexShrink: 0, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: border }}>
        <Text style={{ color: mainText, fontSize: 18, fontWeight: "700" }}>Passenger Group</Text>
        <Text style={{ marginTop: 4, color: mutedText, fontSize: 12 }}>
          {pickupPoint?.name} → {dropoffPoint?.name}
        </Text>
      </View>

      <View accessibilityLiveRegion="polite" style={{ flexShrink: 0, borderBottomWidth: 1, borderBottomColor: border, backgroundColor: summarySurface, paddingHorizontal: 16, paddingVertical: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 16 }}>
          <View style={{ flexShrink: 0 }}>
            <Text style={{ color: mainText, fontSize: 44, lineHeight: 40, fontWeight: "700", letterSpacing: -1.5, fontVariant: ["tabular-nums"] }}>{groupEnteredCount}</Text>
            <Text style={{ marginTop: 4, color: mutedText, fontSize: 11 }}>{groupNoun}{isGCashGroup ? " + payer" : ""}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0, alignItems: "flex-end" }}>
            <Text style={{ color: mainText, fontSize: 22, lineHeight: 24, fontWeight: "700", fontVariant: ["tabular-nums"] }}>
              {showFareSummary && groupEnteredCount > 0 ? formatCurrency(groupTotalFare) : "—"}
            </Text>
            <Text style={{ marginTop: 4, color: mutedText, fontSize: 11, textAlign: "right" }}>
              {showFareSummary && groupDiscount > 0
                ? <><Text style={{ color: isLofi ? "#047857" : "#6EE7B7", fontVariant: ["tabular-nums"] }}>{formatCurrency(groupDiscount)}</Text> discount</>
                : groupEnteredCount > 0 ? "total" : ""}
            </Text>
          </View>
        </View>
        <Text numberOfLines={1} style={{ minHeight: 16, marginTop: 10, color: isLofi ? "#4B5563" : "rgba(255,255,255,0.55)", fontSize: 11 }}>
          {mix || (isGCashGroup ? "Payer is added when they scan the QR" : "Tap a tile for each passenger")}
        </Text>
      </View>

      <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 10, paddingHorizontal: 16, paddingVertical: 16 }}>
        {passengerTypes.map(({ type, label }) => {
          const count = groupCounts[type];
          const fare = type === "REGULAR" ? fareInfo?.regularFare ?? 0 : fareInfo?.discountedFare ?? 0;
          const showFare = !isGCashGroup || count > 0;
          const active = count > 0;
          return (
            <View key={type} style={{ width: "48%", minHeight: 104, position: "relative" }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Add ${label}, ${count} added`}
                disabled={count >= 50}
                onPress={() => {
                  appHaptics.medium();
                  setGroupCounts(current => ({ ...current, [type]: Math.min(50, current[type] + 1) }));
                }}
                style={{ minHeight: 104, justifyContent: "space-between", padding: 14, paddingRight: 42, borderWidth: 1, borderRadius: 12, borderColor: active ? (isLofi ? "#1A5FB4" : "rgba(98,160,234,0.45)") : border, backgroundColor: active ? (isLofi ? "#F0F7FF" : "rgba(26,95,180,0.14)") : (isLofi ? "#F9FAFB" : "rgba(255,255,255,0.03)") }}
              >
                <View>
                  <Text style={{ color: mainText, fontSize: 14, fontWeight: "600" }}>{label}</Text>
                  {showFare ? <Text style={{ marginTop: 2, color: mutedText, fontSize: 11, fontVariant: ["tabular-nums"] }}>{formatCurrency(fare)}</Text> : null}
                </View>
                <Text style={{ color: active ? mainText : mutedText, fontSize: 28, lineHeight: 32, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{count}</Text>
              </Pressable>
              {count > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${label}`}
                  onPress={() => {
                    appHaptics.medium();
                    setGroupCounts(current => ({ ...current, [type]: Math.max(0, current[type] - 1) }));
                  }}
                  style={{ position: "absolute", top: 8, right: 8, width: 32, height: 32, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: border, borderRadius: 8, backgroundColor: surface }}
                >
                  <Ionicons name="remove" size={16} color={isLofi ? "#374151" : "rgba(255,255,255,0.75)"} />
                </Pressable>
              ) : null}
            </View>
          );
        })}
        <Text style={{ width: "100%", color: mutedText, fontSize: 11 }}>
          Tap a tile to add one. Use the minus button to remove one.
        </Text>
      </ScrollView>

      <View style={{ flexShrink: 0, flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingBottom: 16 }}>
        <Pressable onPress={() => setStep("select")} style={{ flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: border, borderRadius: 12 }}>
          <Text style={{ color: isLofi ? "#4B5563" : "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: "600" }}>Back</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={actionDisabled}
          onPress={() => isGCashGroup ? handleConfirmPayment() : setStep("confirm")}
          style={{ flex: 2, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#1A5FB4", opacity: actionDisabled ? 0.4 : 1 }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}>
            {isInitiatingGcash
              ? "Starting…"
              : isGCashGroup
                ? groupEnteredCount > 0 ? `Generate QR · ${formatCurrency(groupTotalFare)}` : "Generate QR"
                : `Review · ${formatCurrency(groupTotalFare)}`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
