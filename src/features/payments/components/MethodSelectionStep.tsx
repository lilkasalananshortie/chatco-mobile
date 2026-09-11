import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../core/theme/ThemeProvider";
import type { SelectedPaymentMethod } from "../payment-types";

export interface MethodSelectionStepProps {
  styles: any;
  isOnline: boolean;
  onSelectMethod: (method: SelectedPaymentMethod) => void;
  onClose: () => void;
}

export function MethodSelectionStep({
  styles,
  isOnline,
  onSelectMethod,
  onClose,
}: MethodSelectionStepProps) {
  const { colors, isLofi } = useAppTheme();

  return (
    <View style={styles.modalCard}>
      <View style={styles.modalHeader}>
        <View>
          <Text style={styles.modalTitle}>Collect Payment</Text>
          <Text style={styles.modalSubtitle}>Choose how the commuter is paying</Text>
        </View>
        <Pressable onPress={onClose} style={styles.iconButton} accessibilityLabel="Close">
          <Ionicons name="close" size={20} color={colors.muted} />
        </Pressable>
      </View>

      <View style={styles.modalBody}>
        {!isOnline ? (
          <View style={styles.offlineNotice}>
            <Text style={styles.offlineNoticeText}>
              Offline mode: cash fares are saved on this device and queued for synchronization.
              GCash and vouchers are disabled.
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
                backgroundColor: isLofi ? colors.surface2 : "rgba(16, 185, 129, 0.15)",
                borderColor: isLofi ? colors.success : "rgba(16, 185, 129, 0.2)",
              },
            ]}
          >
            <Ionicons name="cash-outline" size={24} color={isLofi ? colors.success : "#34D399"} />
          </View>
          <View style={styles.methodTextBox}>
            <Text style={[styles.methodTitle, { color: isLofi ? colors.success : "#34D399" }]}>Cash Payment</Text>
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
                backgroundColor: isLofi ? colors.surface2 : "rgba(59, 130, 246, 0.15)",
                borderColor: isLofi ? colors.primary : "rgba(59, 130, 246, 0.2)",
              },
            ]}
          >
            <Ionicons name="phone-portrait-outline" size={24} color={isLofi ? colors.primary : "#60A5FA"} />
          </View>
          <View style={styles.methodTextBox}>
            <Text style={[styles.methodTitle, { color: isLofi ? colors.primary : "#60A5FA" }]}>GCash Payment</Text>
            <Text style={styles.methodDescription}>
              {isOnline
                ? "Digital payment via GCash — commuter scans QR to pay from their account"
                : "Unavailable offline. Reconnect to generate a payment QR."}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>

        {/* Voucher Option */}
        <Pressable
          disabled={!isOnline}
          onPress={() => {
            if (!isOnline) return;
            onSelectMethod("Voucher");
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
                backgroundColor: isLofi ? colors.surface2 : "rgba(139, 92, 246, 0.15)",
                borderColor: isLofi ? "#6D28D9" : "rgba(139, 92, 246, 0.2)",
              },
            ]}
          >
            <Ionicons name="ticket-outline" size={24} color={isLofi ? "#6D28D9" : "#A78BFA"} />
          </View>
          <View style={styles.methodTextBox}>
            <Text style={[styles.methodTitle, { color: isLofi ? "#6D28D9" : "#A78BFA" }]}>Voucher / Free Ride</Text>
            <Text style={styles.methodDescription}>
              Commuter shows their reward voucher code — enter it to apply a free ride
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>

        <Text style={styles.footerNoteText}>
          Both methods will be recorded in the shift transaction log for end-of-day remittance.
        </Text>
      </View>
    </View>
  );
}
