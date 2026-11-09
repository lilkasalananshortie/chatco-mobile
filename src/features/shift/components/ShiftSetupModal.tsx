import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Driver, Unit } from "../../../core/domain/types";
import { useAppTheme } from "../../../core/theme/ThemeProvider";
import { ModalShell } from "../../../shared/ui";

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
  const { colors, styles } = useAppTheme();

  return (
    <ModalShell visible={visible} title="Confirm Shift Setup" onClose={onClose}>
      <View style={{ alignItems: "center", marginBottom: 12 }}>
        <Ionicons name="checkmark-circle-outline" size={44} color={colors.primary} />
        <Text style={[styles.subtitle, { fontSize: 12, textAlign: "center", marginTop: 8 }]}>
          Proceeding means your duty has officially begun.
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface2, borderColor: colors.border, padding: 14, gap: 10, marginTop: 4 }]}>
        <DetailRow label="Conductor" value={conductorName} colors={colors} />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <DetailRow label="Driver" value={driver?.name ?? "—"} colors={colors} />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <DetailRow label="Unit" value={unit?.unitNumber ?? "—"} colors={colors} />
      </View>

      <View style={{ backgroundColor: colors.surface2, borderColor: colors.border, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, marginTop: 12 }}>
        <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "600" }}>
          {isOfflineDepot
            ? "Connect to ChatCo to verify the approved assignment and start this shift."
            : "Action cannot be undone without admin assistance."}
        </Text>
      </View>

      {error ? <Text accessibilityRole="alert" style={[styles.error, { marginTop: 10 }]}>{error}</Text> : null}

      <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onClose}
          style={[styles.button, styles.secondaryButton, { flex: 1, minHeight: 44 }]}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>Cancel</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy || isOfflineDepot}
          onPress={onConfirm}
          style={[styles.button, { flex: 1, minHeight: 44, backgroundColor: colors.primary }, (busy || isOfflineDepot) && { opacity: 0.55 }]}
        >
          <Text style={styles.buttonText}>{busy ? "Starting…" : isOfflineDepot ? "Connect to Start" : "Start Shift"}</Text>
        </Pressable>
      </View>
    </ModalShell>
  );
}

function DetailRow({ label, value, colors }: {
  label: string;
  value: string;
  colors: { muted: string; text: string };
}) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <Text style={{ color: colors.muted, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700", flexShrink: 1, textAlign: "right" }}>{value}</Text>
    </View>
  );
}
