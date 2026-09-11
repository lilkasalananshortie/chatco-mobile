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
  isOfflineDepot,
  error,
  onConfirm,
}: ShiftSetupModalProps) {
  const { colors, isLofi, styles } = useAppTheme();

  return (
    <ModalShell visible={visible} title="Confirm Shift Setup" onClose={onClose}>
      <View style={{ alignItems: "center", marginBottom: 12 }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: isLofi ? 4 : 28,
            backgroundColor: isLofi ? colors.surface2 : "rgba(26, 95, 180, 0.15)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 10,
          }}
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={32}
            color={isLofi ? colors.primary : "#62A0EA"}
          />
        </View>
        <Text style={[styles.cardTitle, { fontSize: 17, textAlign: "center" }]}>Confirm Shift Setup</Text>
        <Text style={[styles.subtitle, { fontSize: 12, textAlign: "center", marginTop: 2 }]}>
          Proceeding means your duty has officially begun.
        </Text>
      </View>

      <View
        style={[
          styles.card,
          {
            backgroundColor: isLofi ? colors.surface2 : "rgba(255,255,255,0.03)",
            borderColor: colors.border,
            borderRadius: isLofi ? 3 : 14,
            padding: 14,
            gap: 10,
            marginTop: 4,
          },
        ]}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: colors.muted, fontSize: 13 }}>Driver</Text>
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }}>{driver?.name}</Text>
        </View>
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: colors.muted, fontSize: 13 }}>Unit</Text>
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }}>
            {unit?.unitNumber} ({unit?.plateNumber})
          </Text>
        </View>
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: colors.muted, fontSize: 13 }}>Route</Text>
          <Text
            style={{ color: colors.text, fontSize: 13, fontWeight: "700", textAlign: "right", maxWidth: 180 }}
            numberOfLines={1}
          >
            {unit?.route}
          </Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: isLofi ? "#FEF3C7" : "rgba(245, 158, 11, 0.1)",
          borderColor: isLofi ? "#F59E0B" : "rgba(245, 158, 11, 0.2)",
          borderWidth: 1,
          borderRadius: isLofi ? 3 : 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          marginTop: 12,
        }}
      >
        <Ionicons name="warning-outline" size={16} color={isLofi ? "#B45309" : "#FBBF24"} />
        <Text
          style={{
            color: isLofi ? "#92400E" : "rgba(251, 191, 36, 0.9)",
            fontSize: 11,
            fontWeight: "600",
            flex: 1,
          }}
        >
          {isOfflineDepot
            ? "Starting duty offline. Shift will be saved locally and auto-register with server once online."
            : "Action cannot be undone without admin assistance."}
        </Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
        <Pressable
          disabled={busy}
          onPress={onClose}
          style={[styles.button, styles.secondaryButton, { flex: 1, minHeight: 44 }]}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>Cancel</Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={onConfirm}
          style={[styles.button, { flex: 1, minHeight: 44 }, busy && { opacity: 0.55 }]}
        >
          <Text style={styles.buttonText}>
            {busy ? "Starting…" : isOfflineDepot ? "Start Duty (Offline)" : "Start Duty"}
          </Text>
        </Pressable>
      </View>
    </ModalShell>
  );
}
