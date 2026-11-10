import { ActivityIndicator, Animated, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { Driver, Unit } from "../../../core/domain/types";
import { useAppTheme } from "../../../core/theme/ThemeProvider";
import { Text } from "../../../shared/ui/BrandText";
import { useWebEntrance } from "../../../shared/ui/useWebEntrance";

export interface ShiftSetupModalProps {
  visible: boolean;
  onClose: () => void;
  busy: boolean;
  unit: Unit | null;
  driver: Driver | null;
  conductorName: string;
  isOfflineDepot: boolean;
  error: string;
  onConfirm: () => void;
}

export function ShiftSetupModal({
  visible,
  onClose,
  busy,
  unit,
  driver,
  conductorName,
  isOfflineDepot,
  error,
  onConfirm,
}: ShiftSetupModalProps) {
  const { colors, styles, isLight, isLowFidelity } = useAppTheme();
  const entrance = useWebEntrance(visible, isLowFidelity);
  const borderColor = isLight ? "#E5E7EB" : "#1C3350";
  const detailBackground = isLight ? "#F9FAFB" : "#071A2E";
  const dismiss = () => { if (!busy) onClose(); };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss}>
      <SafeAreaView style={s.overlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss shift setup" disabled={busy} onPress={dismiss} style={StyleSheet.absoluteFill} />
        <Animated.View accessibilityViewIsModal style={[s.panel, { backgroundColor: colors.surface, borderColor, borderRadius: isLowFidelity ? 6 : 16 }, entrance]}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" bounces={false}>
      <View style={{ alignItems: "center" }}>
        <Ionicons name="checkmark-circle-outline" size={44} color={colors.primaryLight} accessible={false} />
        <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 18, fontWeight: "700", textAlign: "center", marginTop: 20 }}>Confirm Shift Setup</Text>
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 4 }}>
          Proceeding means your duty has officially begun.
        </Text>
      </View>

      <View style={{ backgroundColor: detailBackground, borderColor, borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 }}>
        <DetailRow label="Conductor" value={conductorName} colors={colors} />
        <View style={{ height: 1, backgroundColor: borderColor }} />
        <DetailRow label="Driver" value={driver?.name ?? "—"} colors={colors} />
        <View style={{ height: 1, backgroundColor: borderColor }} />
        <DetailRow label="Unit" value={unit?.unitNumber ?? "—"} colors={colors} />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: detailBackground, borderColor, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 }}>
        <Ionicons name="warning-outline" size={16} color={colors.muted} accessible={false} />
        <Text style={{ flex: 1, color: colors.muted, fontSize: 11, lineHeight: 16, fontWeight: "500" }}>
          {isOfflineDepot
            ? "Connect to CHATCO to verify the approved assignment and start this shift."
            : "Action cannot be undone without admin assistance."}
        </Text>
      </View>

      {error ? <Text accessibilityRole="alert" style={[styles.error, { marginTop: 10 }]}>{error}</Text> : null}

      <View style={{ flexDirection: "row", gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onClose}
          style={({ pressed }) => [s.button, { borderWidth: 1, borderColor, backgroundColor: isLight ? "#F3F4F6" : "#10273F", opacity: busy ? 0.5 : pressed ? 0.8 : 1 }]}
        >
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>Cancel</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy || isOfflineDepot}
          onPress={onConfirm}
          accessibilityState={{ disabled: busy || isOfflineDepot, busy }}
          style={({ pressed }) => [s.button, { backgroundColor: colors.primary, opacity: busy || isOfflineDepot ? 0.55 : pressed ? 0.8 : 1 }]}
        >
          {busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
          <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "700", textAlign: "center" }}>{busy ? "Starting…" : isOfflineDepot ? "Connect to Start" : "Start Shift"}</Text>
        </Pressable>
      </View>
        </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

function DetailRow({ label, value, colors }: {
  label: string;
  value: string;
  colors: { muted: string; text: string };
}) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <Text style={{ color: colors.muted, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600", flexShrink: 1, textAlign: "right" }}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16, backgroundColor: "rgba(0,0,0,0.7)" },
  panel: { width: "100%", maxWidth: 384, maxHeight: "100%", borderWidth: 1, overflow: "hidden" },
  content: { padding: 24, gap: 20 },
  button: { flex: 1, minHeight: 44, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
});
