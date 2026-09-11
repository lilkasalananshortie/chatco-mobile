import { ActivityIndicator, Text, View } from "react-native";
import { useAppTheme } from "../../../core/theme/ThemeProvider";
import type { SelectedPaymentMethod } from "../payment-types";

export interface PaymentProcessingStepProps {
  styles: any;
  selectedMethod: SelectedPaymentMethod | null;
}

export function PaymentProcessingStep({ styles, selectedMethod }: PaymentProcessingStepProps) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.modalCard, { alignItems: "center", paddingVertical: 36 }]}>
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
