import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "../../../shared/ui/BrandText";
import { usePaymentTheme } from "../../../core/theme/payment-theme";
import type { FareInfo, GroupPassengerRow, SelectedPaymentMethod } from "../payment-types";
import type { CommuterType } from "../../../core/domain/types";
import { formatCurrency, getCommuterTypeLabel } from "../fare-helpers";

export interface PaymentConfirmationStepProps {
  selectedMethod: SelectedPaymentMethod | null;
  isGroupMode: boolean;
  groupTotalFare: number;
  groupGrossFare: number;
  groupDiscount: number;
  groupPassengers: GroupPassengerRow[];
  commuterType: CommuterType;
  pickupLandmark: string | null;
  dropoffLandmark: string | null;
  fareInfo: FareInfo | null;
  isInitiatingGcash: boolean;
  handleConfirmPayment: () => void;
  onBack: () => void;
}

export function PaymentConfirmationStep({ selectedMethod, isGroupMode, groupTotalFare, groupGrossFare, groupDiscount, groupPassengers, commuterType, pickupLandmark, dropoffLandmark, fareInfo, isInitiatingGcash, handleConfirmPayment, onBack }: PaymentConfirmationStepProps) {
  const { isLofi, isLowFidelity } = usePaymentTheme();
  const text = isLofi ? "#111827" : "#FFFFFF";
  const muted = isLofi ? "#6B7280" : "rgba(255,255,255,0.6)";
  const border = isLofi ? "#E5E7EB" : "rgba(255,255,255,0.1)";
  const amount = isGroupMode ? groupTotalFare : selectedMethod === "GCash" ? fareInfo?.regularFare ?? 0 : fareInfo?.finalFare ?? 0;
  const methodLabel = selectedMethod === "GCash" ? "Charge through GCash" : "Collect in cash";
  const instructions = selectedMethod === "GCash"
    ? "The commuter scans a QR and pays from their GCash account. No wallet balance needed."
    : "Collect the exact amount from the commuter. It's added to your shift log when you confirm.";
  const actionLabel = isInitiatingGcash ? "Starting…" : selectedMethod === "GCash" ? `Generate QR · ${formatCurrency(amount)}` : `Pay ${formatCurrency(amount)}`;
  const passengerCount = groupPassengers.reduce((sum, passenger) => sum + passenger.quantity, 0);
  const activeCommuterType = selectedMethod === "GCash" ? "REGULAR" : commuterType;
  const discount = isGroupMode ? groupDiscount : selectedMethod !== "GCash" && fareInfo?.hasDiscount ? fareInfo.discountAmount : 0;
  const details = [
    ...(pickupLandmark ? [{ label: "Pickup", value: pickupLandmark }] : []),
    ...(dropoffLandmark ? [{ label: "Drop-off", value: dropoffLandmark }] : []),
    { label: "Distance", value: `${fareInfo?.barangaysTraveled ?? 0} ${(fareInfo?.barangaysTraveled ?? 0) === 1 ? "barangay" : "barangays"}`,
      supporting: fareInfo?.succeedingCount ? `Base fare covers first ${fareInfo.baseBarangayCount} + ${fareInfo.succeedingCount} succeeding` : `Base fare (within first ${fareInfo?.baseBarangayCount ?? 4} barangays)` },
    { label: "Commuter", value: isGroupMode ? `${passengerCount} ${passengerCount === 1 ? "passenger" : "passengers"}` : getCommuterTypeLabel(activeCommuterType),
      supporting: isGroupMode ? groupPassengers.map(passenger => `${passenger.quantity} ${getCommuterTypeLabel(passenger.type)}`).join(" · ") : undefined },
    { label: "Fare", value: `${formatCurrency(isGroupMode ? groupGrossFare : fareInfo?.regularFare ?? 0)} ${isGroupMode ? "full fare" : "regular"}`,
      supporting: discount > 0 ? `− ${formatCurrency(discount)} ${isGroupMode ? "" : `${getCommuterTypeLabel(activeCommuterType).toLowerCase()} `}discount` : undefined },
  ];

  return (
    <View style={{ width: "100%", maxWidth: 512, maxHeight: "100%", borderRadius: isLowFidelity ? 6 : 16, borderWidth: 1, borderColor: border, backgroundColor: isLofi ? "#FFFFFF" : "#071A2E", overflow: "hidden" }}>
      <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
      <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: border }}>
        <Text accessibilityRole="header" style={{ color: muted, fontSize: 10, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase" }}>Confirm Payment</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
        <Ionicons name={selectedMethod === "GCash" ? "phone-portrait-outline" : "cash-outline"} size={16} color={muted} />
        <Text style={{ color: muted, fontSize: 12, fontWeight: "600" }}>{methodLabel}</Text>
      </View>
      <Text style={{ marginTop: 6, color: text, fontSize: 40, lineHeight: 50, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{formatCurrency(amount)}</Text>
      <Text style={{ marginTop: 4, maxWidth: 260, color: muted, fontSize: 13, lineHeight: 21 }}>{instructions}</Text>
      </View>
      <View style={{ paddingHorizontal: 20, paddingVertical: 4 }}>
        {details.map((detail, index) => <View key={detail.label} style={{ flexDirection: "row", gap: 12, paddingVertical: 12, borderTopWidth: index ? 1 : 0, borderTopColor: border }}>
          <Text style={{ width: 76, color: muted, fontSize: 12, lineHeight: 19 }}>{detail.label}</Text>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: text, fontSize: 13, fontWeight: "600", lineHeight: 20 }}>{detail.value}</Text>
            {detail.supporting ? <Text style={{ color: muted, fontSize: 11, lineHeight: 17, marginTop: 2 }}>{detail.supporting}</Text> : null}
          </View>
        </View>)}
      </View>
      <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 }}>
      <Pressable accessibilityRole="button" disabled={isInitiatingGcash} onPress={onBack} style={({ pressed }) => ({ flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: border, borderRadius: 12, opacity: isInitiatingGcash ? 0.5 : pressed ? 0.7 : 1 })}>
        <Text style={{ color: muted, fontSize: 14, fontWeight: "600" }}>Back</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: isInitiatingGcash, busy: isInitiatingGcash }} disabled={isInitiatingGcash} onPress={handleConfirmPayment} style={({ pressed }) => ({ flex: 2, paddingHorizontal: 8, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#1A5FB4", opacity: isInitiatingGcash ? 0.6 : pressed ? 0.85 : 1 })}>
        <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}>{actionLabel}</Text>
      </Pressable>
      </View>
      </ScrollView>
    </View>
  );
}
