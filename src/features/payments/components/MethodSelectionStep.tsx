import { ActivityIndicator, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { Text } from "../../../shared/ui/BrandText";
import { Ionicons } from "@expo/vector-icons";
import { usePaymentTheme } from "../../../core/theme/payment-theme";
import type { SelectedPaymentMethod } from "../payment-types";

export interface MethodSelectionStepProps {
  styles: any;
  fullBottomSheet?: boolean;
  isOnline: boolean;
  fareReady: boolean;
  fareLoading: boolean;
  fareLoadFailed: boolean;
  fareNotice: string;
  onRetryFareLoad: () => void;
  onSelectMethod: (method: SelectedPaymentMethod) => void;
  onClose: () => void;
  onShowHistory: () => void;
  blockedReason?: string | null;
}

export function MethodSelectionStep({
  styles,
  fullBottomSheet = false,
  isOnline,
  fareReady,
  fareLoading,
  fareLoadFailed,
  fareNotice,
  onRetryFareLoad,
  onSelectMethod,
  onClose,
  onShowHistory,
  blockedReason,
}: MethodSelectionStepProps) {
  const { colors, isLofi } = usePaymentTheme();
  const { height: screenHeight } = useWindowDimensions();
  const sheetMaxHeight = Math.max(240, screenHeight - 24);
  const bodyMaxHeight = Math.max(160, sheetMaxHeight - 96);
  const methodSurface = isLofi ? "#F9FAFB" : "#15293B";
  const methodBorder = isLofi ? "#E5E7EB" : "rgba(255,255,255,0.1)";
  const iconStyle = { backgroundColor: "transparent", borderWidth: 0 };

  return (
    <View style={[styles.modalCard, { backgroundColor: isLofi ? "#FFFFFF" : "#071A2E", borderColor: methodBorder }, fullBottomSheet ? { maxWidth: "100%", maxHeight: sheetMaxHeight, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } : null]}>
      <View style={styles.modalHeader}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.modalTitle}>Collect Payment</Text>
          <Text style={styles.modalSubtitle}>Choose how the commuter is paying</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.iconButton} accessibilityLabel="Close payment methods">
          <Ionicons name="close" size={20} color={colors.muted} />
        </Pressable>
      </View>

      <ScrollView
        style={fullBottomSheet ? { flexGrow: 0, flexShrink: 1, maxHeight: bodyMaxHeight } : { flex: 1, minHeight: 0 }}
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

        {blockedReason ? <Text accessibilityRole="alert" style={[styles.footerNoteText, { color: colors.text, marginBottom: 12 }]}>{blockedReason}</Text> : null}

        {!blockedReason && fareNotice ? (
          <View accessibilityLiveRegion="polite" style={{ padding: 12, marginBottom: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2, flexDirection: "row", alignItems: "center", gap: 10 }}>
            {fareLoading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
            <Text style={[styles.footerNoteText, { color: colors.text, flex: 1 }]}>{fareNotice}</Text>
            {fareLoadFailed ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Retry loading fares" onPress={onRetryFareLoad} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 8 }}>
                <Text style={{ color: colors.primary, fontWeight: "700" }}>Retry</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* Cash Option */}
        <Pressable
          disabled={Boolean(blockedReason) || !fareReady}
          onPress={() => onSelectMethod("Cash")}
          style={[styles.methodOptionCard, { backgroundColor: methodSurface, borderColor: methodBorder }, blockedReason || !fareReady ? { opacity: 0.5 } : null]}
        >
          <View
            style={[
              styles.methodIconBox,
              {
                ...iconStyle,
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
          disabled={!isOnline || Boolean(blockedReason) || !fareReady}
          onPress={() => {
            if (!isOnline) return;
            onSelectMethod("GCash");
          }}
          style={[
            styles.methodOptionCard,
            { backgroundColor: methodSurface, borderColor: methodBorder },
            !isOnline || blockedReason || !fareReady ? { opacity: 0.5 } : null,
          ]}
        >
          <View
            style={[
              styles.methodIconBox,
              {
                ...iconStyle,
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

        <Pressable accessibilityRole="button" onPress={onShowHistory} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 44, borderWidth: 1, borderColor: methodBorder, backgroundColor: isLofi ? "#F3F4F6" : "#0E1628", borderRadius: 12, marginTop: 8, marginBottom: 12 }}>
          <Ionicons name="time-outline" size={18} color={colors.text} />
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>Payment History</Text>
        </Pressable>
        <Text style={styles.footerNoteText}>
          Both methods will be recorded in the shift transaction log for end-of-day remittance.
        </Text>
      </ScrollView>
    </View>
  );
}
