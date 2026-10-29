import { Text } from "../../../shared/ui/BrandText";
import { ActivityIndicator, View } from "react-native";
import { usePaymentTheme } from "../../../core/theme/payment-theme";
import type { SelectedPaymentMethod } from "../payment-types";

export interface PaymentProcessingStepProps {
  styles: any;
  selectedMethod: SelectedPaymentMethod | null;
}

export function PaymentProcessingStep({ styles, selectedMethod }: PaymentProcessingStepProps) {
  const { colors } = usePaymentTheme();

  return (
    <View style={[styles.modalCard, { maxWidth: 320, alignItems: "center", padding: 32 }]}>
      <ActivityIndicator
        size="large"
        color={selectedMethod === "GCash" ? colors.primary : colors.success}
        style={{ marginBottom: 16 }}
      />
      <Text style={styles.modalTitle}>Processing Payment</Text>
      <Text style={[styles.modalSubtitle, { marginTop: 6 }]}>
        {selectedMethod === "GCash"
          ? "Charging fare via GCash..."
          : "Recording cash payment..."}
      </Text>
    </View>
  );
}
