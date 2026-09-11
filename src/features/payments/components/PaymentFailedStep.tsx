import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../core/theme/ThemeProvider";
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
  const { colors, isLofi } = useAppTheme();

  return (
    <View style={styles.modalCard}>
      <View style={{ padding: 24, alignItems: "center" }}>
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
      </View>
    </View>
  );
}
