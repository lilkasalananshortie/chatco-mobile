import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../../../shared/ui/BrandText";
import { Ionicons } from "@expo/vector-icons";
import { usePaymentTheme } from "../../../core/theme/payment-theme";
import type { SelectedPaymentMethod, Step } from "../payment-types";

export interface PaymentFailedStepProps {
  styles: any;
  gcashError: string | null;
  selectedMethod: SelectedPaymentMethod | null;
  isGroupMode: boolean;
  handleClose: () => void;
  setStep: (step: Step) => void;
}

export function PaymentFailedStep({
  styles,
  gcashError,
  selectedMethod,
  isGroupMode,
  handleClose,
  setStep,
}: PaymentFailedStepProps) {
  const { colors, isLofi } = usePaymentTheme();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const availableHeight = Math.max(260, height - insets.top - insets.bottom - 32);

  return (
    <View style={[styles.modalCard, { maxWidth: 384, maxHeight: availableHeight, flexShrink: 1 }]}>
      <ScrollView style={{ height: Math.min(300, availableHeight), flexShrink: 1 }} contentContainerStyle={{ padding: 24, alignItems: "center" }}>
        <View style={styles.failedCheckCircle}>
          <Ionicons name="close" size={32} color={isLofi ? colors.danger : "#F87171"} />
        </View>
        <Text style={styles.failedTitle}>Payment Failed</Text>
        <Text style={styles.failedSubtitle}>
          {gcashError
            ? gcashError
            : selectedMethod === "GCash"
            ? "Could not process the GCash payment. Please try again or pay cash to the conductor."
            : "Could not record the payment. Please try again."}
        </Text>
        <View style={[styles.actionButtonsRow, { width: "100%", marginTop: 16 }]}>
          <Pressable onPress={handleClose} style={styles.btnSecondary}>
            <Text style={styles.btnSecondaryText}>Close</Text>
          </Pressable>
          <Pressable
            onPress={() => setStep(isGroupMode ? "passengers" : "confirm")}
            style={[
              selectedMethod === "GCash"
                ? styles.gcashActionButton
                : styles.cashActionButton,
              { flex: 1 },
            ]}
          >
            <Text style={styles.cashActionButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
