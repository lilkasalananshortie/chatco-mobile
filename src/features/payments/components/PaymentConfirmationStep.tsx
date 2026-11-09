import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";
import { Text } from "../../../shared/ui/BrandText";
import { usePaymentTheme } from "../../../core/theme/payment-theme";
import type { FareInfo, SelectedPaymentMethod } from "../payment-types";
import { formatCurrency } from "../fare-helpers";

export interface PaymentConfirmationStepProps {
  selectedMethod: SelectedPaymentMethod | null;
  isGroupMode: boolean;
  groupTotalFare: number;
  fareInfo: FareInfo | null;
  isInitiatingGcash: boolean;
  handleConfirmPayment: () => void;
  onClose: () => void;
}

export function PaymentConfirmationStep({ selectedMethod, isGroupMode, groupTotalFare, fareInfo, isInitiatingGcash, handleConfirmPayment, onClose }: PaymentConfirmationStepProps) {
  const { isLofi } = usePaymentTheme();
  const text = isLofi ? "#111827" : "#FFFFFF";
  const muted = isLofi ? "#6B7280" : "rgba(255,255,255,0.6)";
  const border = isLofi ? "#E5E7EB" : "rgba(255,255,255,0.1)";
  const amount = isGroupMode ? groupTotalFare : selectedMethod === "GCash" ? fareInfo?.regularFare ?? 0 : fareInfo?.finalFare ?? 0;
  const methodLabel = selectedMethod === "GCash" ? "Charge through GCash" : "Collect in cash";
  const instructions = selectedMethod === "GCash"
    ? "The commuter scans a QR and pays from their GCash account. No wallet balance needed."
    : "Collect the exact amount from the commuter. It's added to your shift log when you confirm.";
  const actionLabel = isInitiatingGcash ? "Starting…" : selectedMethod === "GCash" ? `Generate QR · ${formatCurrency(amount)}` : `Pay ${formatCurrency(amount)}`;

  return (
    <View style={{ width: "100%", maxWidth: 384, borderRadius: 16, borderWidth: 1, borderColor: border, backgroundColor: isLofi ? "#FFFFFF" : "#071A2E", padding: 20, shadowColor: "#000000", shadowOpacity: isLofi ? 0.1 : 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: muted, fontSize: 10, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase" }}>Confirm Payment</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close payment confirmation" disabled={isInitiatingGcash} onPress={onClose} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="close" size={20} color={muted} />
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
        <Ionicons name={selectedMethod === "GCash" ? "phone-portrait-outline" : "cash-outline"} size={16} color={muted} />
        <Text style={{ color: muted, fontSize: 12, fontWeight: "600" }}>{methodLabel}</Text>
      </View>
      <Text style={{ marginTop: 6, color: text, fontSize: 40, lineHeight: 50, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{formatCurrency(amount)}</Text>
      <Text style={{ marginTop: 4, color: muted, fontSize: 13, lineHeight: 21 }}>{instructions}</Text>
      <Pressable accessibilityRole="button" disabled={isInitiatingGcash} onPress={handleConfirmPayment} style={{ marginTop: 20, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#1A5FB4", opacity: isInitiatingGcash ? 0.6 : 1 }}>
        <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700" }}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}
