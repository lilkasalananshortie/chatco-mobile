import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePaymentTheme } from "../../../core/theme/payment-theme";
import type { SelectedPaymentMethod } from "../payment-types";

export interface MethodSelectionStepProps {
  styles: any;
  fullBottomSheet?: boolean;
  isOnline: boolean;
  onSelectMethod: (method: SelectedPaymentMethod) => void;
  onClose: () => void;
}

export function MethodSelectionStep({
  styles,
  fullBottomSheet = false,
  isOnline,
  onSelectMethod,
  onClose,
}: MethodSelectionStepProps) {
  const { colors, isLofi } = usePaymentTheme();

  return (
    <View style={[styles.modalCard, fullBottomSheet ? { maxWidth: "100%", borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } : null]}>
      <View style={styles.modalHeader}>
        <View>
          <Text style={styles.modalTitle}>Collect Payment</Text>
          <Text style={styles.modalSubtitle}>Choose how the commuter is paying</Text>
        </View>
        <Pressable onPress={onClose} style={styles.iconButton} accessibilityLabel="Close">
          <Ionicons name="close" size={20} color={colors.muted} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1, minHeight: 0 }}
        contentContainerStyle={styles.modalBody}
        keyboardShouldPersistTaps="handled"
      >
        {!isOnline ? (
          <View style={styles.offlineNotice}>
            <Text style={styles.offlineNoticeText}>
              Offline mode: cash fares are saved on this device and queued for synchronization.
              GCash is unavailable.
            </Text>
          </View>
        ) : null}

        {/* Cash Option */}
        <Pressable
          onPress={() => onSelectMethod("Cash")}
          style={styles.methodOptionCard}
        >
          <View
            style={[
              styles.methodIconBox,
              {
                backgroundColor: isLofi ? "#F0F7FF" : "rgba(98, 160, 234, 0.1)",
                borderColor: isLofi ? "#DAEEFF" : "rgba(98, 160, 234, 0.2)",
              },
            ]}
          >
            <Ionicons name="cash-outline" size={24} color={isLofi ? "#1A5FB4" : "#62A0EA"} />
          </View>
          <View style={styles.methodTextBox}>
            <Text style={[styles.methodTitle, { color: colors.text }]}>Cash Payment</Text>
            <Text style={styles.methodDescription}>
              Collect physical cash from the commuter and record the transaction
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>

        {/* GCash Option */}
        <Pressable
          disabled={!isOnline}
          onPress={() => {
            if (!isOnline) return;
            onSelectMethod("GCash");
          }}
          style={[
            styles.methodOptionCard,
            !isOnline ? { opacity: 0.5 } : null,
          ]}
        >
          <View
            style={[
              styles.methodIconBox,
              {
                backgroundColor: isLofi ? "#F0F7FF" : "rgba(98, 160, 234, 0.1)",
                borderColor: isLofi ? "#DAEEFF" : "rgba(98, 160, 234, 0.2)",
              },
            ]}
          >
            <Ionicons name="phone-portrait-outline" size={24} color={isLofi ? "#1A5FB4" : "#62A0EA"} />
          </View>
          <View style={styles.methodTextBox}>
            <Text style={[styles.methodTitle, { color: colors.text }]}>GCash Payment</Text>
            <Text style={styles.methodDescription}>
              {isOnline
                ? "Digital payment via GCash — commuter scans QR to pay from their account"
                : "Unavailable offline. Reconnect to generate a payment QR."}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>

        <Text style={styles.footerNoteText}>
          Both methods will be recorded in the shift transaction log for end-of-day remittance.
        </Text>
      </ScrollView>
    </View>
  );
}
