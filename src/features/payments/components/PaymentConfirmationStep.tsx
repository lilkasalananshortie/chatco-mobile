import type { ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "../../../shared/ui/BrandText";
import { usePaymentTheme } from "../../../core/theme/payment-theme";
import type { CommuterType, FarePoint } from "../../../core/domain/types";
import type { FareInfo, GroupPassengerRow, SelectedPaymentMethod, Step } from "../payment-types";
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
  groupDiscount: number;
  groupPassengers: GroupPassengerRow[];
  fareInfo: FareInfo | null;
  isInitiatingGcash: boolean;
  handleConfirmPayment: () => void;
  setStep: (step: Step) => void;
}

export function PaymentConfirmationStep({
  selectedMethod,
  pickupPoint,
  pickupLandmark,
  dropoffLandmark,
  commuterType,
  isGroupMode,
  groupPassengerCount,
  groupTotalFare,
  groupDiscount,
  groupPassengers,
  fareInfo,
  isInitiatingGcash,
  handleConfirmPayment,
  setStep,
}: PaymentConfirmationStepProps) {
  const { isLofi } = usePaymentTheme();
  const text = isLofi ? "#111827" : "#FFFFFF";
  const muted = isLofi ? "#6B7280" : "rgba(255,255,255,0.6)";
  const faint = isLofi ? "#6B7280" : "rgba(255,255,255,0.45)";
  const headingMuted = isLofi ? "#6B7280" : "rgba(255,255,255,0.4)";
  const border = isLofi ? "#E5E7EB" : "rgba(255,255,255,0.1)";
  const activeCommuterType = selectedMethod === "GCash" ? "REGULAR" : commuterType;
  const amount = isGroupMode
    ? groupTotalFare
    : selectedMethod === "GCash"
      ? fareInfo?.regularFare ?? 0
      : fareInfo?.finalFare ?? 0;
  const groupMix = groupPassengers.map(({ type, quantity }) => `${quantity} ${getCommuterTypeLabel(type)}`).join(" · ");
  const methodLabel = selectedMethod === "GCash" ? "Charge through GCash" : "Collect in cash";
  const instructions = selectedMethod === "GCash"
    ? "The commuter scans a QR and pays from their GCash account. No wallet balance needed."
    : "Collect the exact amount from the commuter. It's added to your shift log when you confirm.";
  const actionLabel = isInitiatingGcash
    ? "Starting…"
    : selectedMethod === "GCash"
      ? `Generate QR · ${formatCurrency(amount)}`
      : `Pay ${formatCurrency(amount)}`;
  const paymentIcon = selectedMethod === "GCash" ? "phone-portrait-outline" : "cash-outline";
  const distance = fareInfo?.barangaysTraveled ?? 0;
  const commuter = isGroupMode
    ? `${groupPassengerCount} ${groupPassengerCount === 1 ? "passenger" : "passengers"}`
    : getCommuterTypeLabel(activeCommuterType);
  const regularFare = (fareInfo?.regularFare ?? 0) * (isGroupMode ? groupPassengerCount : 1);
  const discount = isGroupMode
    ? groupDiscount
    : selectedMethod === "GCash"
      ? 0
      : fareInfo?.discountAmount ?? 0;
  const hasDiscount = isGroupMode
    ? groupDiscount > 0
    : selectedMethod !== "GCash" && Boolean(fareInfo?.hasDiscount && discount > 0);
  const backStep: Step = isGroupMode ? "passengers" : "select";
  const pickupLabel = pickupLandmark ?? pickupPoint?.name ?? null;

  const row = (label: string, value: ReactNode, extra?: ReactNode, showDivider = true) => (
    <View key={label} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12, borderBottomWidth: showDivider ? 1 : 0, borderBottomColor: border }}>
      <Text style={{ width: 84, paddingTop: 1, color: faint, fontSize: 12 }}>{label}</Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: text, fontSize: 13, fontWeight: "500" }}>{value}</Text>
        {extra ? (
          <View style={{ marginTop: 2 }}>
            {typeof extra === "string"
              ? <Text style={{ color: faint, fontSize: 11, lineHeight: 15 }}>{extra}</Text>
              : extra}
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={{ width: "100%", maxWidth: 384, maxHeight: "100%", flexShrink: 1, flexDirection: "column", overflow: "hidden", borderRadius: 16, borderWidth: 1, borderColor: border, backgroundColor: isLofi ? "#FFFFFF" : "#071A2E", shadowColor: "#000000", shadowOpacity: isLofi ? 0.1 : 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 16 }}>
      <ScrollView style={{ flex: 1, minHeight: 0 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Keep the web prompt's order: payment method, amount, then instruction. */}
        <View style={{ padding: 20 }}>
          <Text style={{ color: headingMuted, fontSize: 10, lineHeight: 15, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase" }}>Confirm Payment</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
            <Ionicons name={paymentIcon} size={16} color={isLofi ? "#6B7280" : "rgba(255,255,255,0.5)"} />
            <Text style={{ color: muted, fontSize: 12, fontWeight: "600" }}>{methodLabel}</Text>
          </View>
          <Text style={{ marginTop: 6, color: text, fontSize: 40, lineHeight: 50, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{formatCurrency(amount)}</Text>
          <Text style={{ maxWidth: 280, marginTop: 4, color: muted, fontSize: 13, lineHeight: 21 }}>{instructions}</Text>
        </View>

        <View style={{ borderTopWidth: 1, borderTopColor: border, paddingHorizontal: 20, paddingVertical: 4 }}>
          {pickupLabel ? row("Pickup", pickupLabel) : null}
          {dropoffLandmark ? row("Drop-off", dropoffLandmark) : null}
          {row("Distance", `${distance} ${distance === 1 ? "barangay" : "barangays"}`, (fareInfo?.succeedingCount ?? 0) > 0
            ? `Base fare covers first ${fareInfo?.baseBarangayCount} + ${fareInfo?.succeedingCount} succeeding`
            : "Base fare (within first 4 barangays)")}
          {row("Commuter", commuter, isGroupMode ? groupMix : undefined)}
          {row("Fare", <>{formatCurrency(regularFare)}{isGroupMode ? " full fare" : " regular"}</>, <>
            {isGroupMode ? <Text style={{ color: faint, fontSize: 11, fontWeight: "400" }}>{groupPassengerCount} × {formatCurrency(fareInfo?.regularFare ?? 0)}</Text> : null}
            {hasDiscount ? <Text style={{ color: faint, fontSize: 11, fontWeight: "400" }}>− {formatCurrency(discount)} {isGroupMode ? "" : `${getCommuterTypeLabel(commuterType).toLowerCase()} `}discount</Text> : null}
          </>, false)}
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              accessibilityRole="button"
              disabled={isInitiatingGcash}
              onPress={() => setStep(backStep)}
              style={{ flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: border, borderRadius: 12, opacity: isInitiatingGcash ? 0.5 : 1 }}
            >
              <Text style={{ color: isLofi ? "#4B5563" : "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: "600" }}>Back</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isInitiatingGcash}
              onPress={handleConfirmPayment}
              style={{ flex: 2, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#1A5FB4", opacity: isInitiatingGcash ? 0.6 : 1 }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}>{actionLabel}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
