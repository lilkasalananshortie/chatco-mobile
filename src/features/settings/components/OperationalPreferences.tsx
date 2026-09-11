import { Pressable, Text, View } from "react-native";
import type { ThermalGuardState } from "../../../core/utils/thermal-guard";

export interface OperationalPreferencesProps {
  styles: any;
  colors: any;
  isLofi: boolean;
  headwayMins: number;
  onUpdateHeadway: (mins: number) => void;
  thermalState: ThermalGuardState;
  onToggleThermalGuard: () => void;
}

export function OperationalPreferences({
  styles,
  colors,
  isLofi,
  headwayMins,
  onUpdateHeadway,
  thermalState,
  onToggleThermalGuard,
}: OperationalPreferencesProps) {
  return (
    <>
      {/* Terminal Headway Timer */}
      <View style={[styles.infoRow, { marginTop: 8, paddingVertical: 10 }]}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={styles.prefTitle}>Terminal Headway Timer</Text>
            <View
              style={{
                backgroundColor: isLofi ? colors.surface2 : "rgba(245, 158, 11, 0.15)",
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: isLofi ? colors.border : "rgba(245, 158, 11, 0.3)",
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: "800", color: isLofi ? "#D97706" : "#FBBF24" }}>
                {headwayMins} MIN
              </Text>
            </View>
          </View>
          <Text style={styles.prefSubtitle}>Wait time between trips at terminal before next departure</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 0 }}>
          <Pressable
            onPress={() => onUpdateHeadway(Math.max(1, headwayMins - 1))}
            style={{
              width: 32,
              height: 32,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isLofi ? colors.surface2 : "rgba(255,255,255,0.06)",
              borderWidth: 1,
              borderColor: colors.border,
              borderTopLeftRadius: isLofi ? 3 : 8,
              borderBottomLeftRadius: isLofi ? 3 : 8,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text }}>−</Text>
          </Pressable>
          <View
            style={{
              width: 42,
              height: 32,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isLofi ? colors.surface : "rgba(255,255,255,0.03)",
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "900",
                color: colors.text,
                fontVariant: ["tabular-nums"],
              }}
            >
              {headwayMins}
            </Text>
          </View>
          <Pressable
            onPress={() => onUpdateHeadway(Math.min(60, headwayMins + 1))}
            style={{
              width: 32,
              height: 32,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isLofi ? colors.surface2 : "rgba(255,255,255,0.06)",
              borderWidth: 1,
              borderColor: colors.border,
              borderTopRightRadius: isLofi ? 3 : 8,
              borderBottomRightRadius: isLofi ? 3 : 8,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text }}>+</Text>
          </Pressable>
        </View>
      </View>

      {/* Tropical Sun & Battery Thermal Guard */}
      <View style={[styles.infoRow, { marginTop: 8, paddingVertical: 10 }]}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={styles.prefTitle}>Tropical Sun & Thermal Guard</Text>
            <View
              style={{
                backgroundColor: isLofi ? colors.surface : "rgba(245, 158, 11, 0.15)",
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: isLofi ? colors.border : "rgba(245, 158, 11, 0.3)",
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: "800", color: isLofi ? colors.text : "#FBBF24" }}>
                ALL-DAY DUTY
              </Text>
            </View>
          </View>
          <Text style={styles.prefSubtitle}>
            {thermalState.enabled
              ? `Active · Battery: ${thermalState.batteryLevel}% (${thermalState.batteryState}) · Throttles GPS during terminal idle`
              : "Disabled · Fixed 5s GPS polling without terminal idle power-saving"}
          </Text>
          {thermalState.thermalWarningMessage ? (
            <Text
              style={{
                fontSize: 11,
                color: isLofi ? colors.danger : "#F87171",
                marginTop: 4,
                fontWeight: "600",
              }}
            >
              {thermalState.thermalWarningMessage}
            </Text>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: thermalState.enabled }}
          onPress={onToggleThermalGuard}
          style={[
            styles.toggleTrack,
            thermalState.enabled ? styles.toggleTrackActive : styles.toggleTrackInactive,
          ]}
        >
          <View
            style={[
              styles.toggleThumb,
              thermalState.enabled ? styles.toggleThumbActive : styles.toggleThumbInactive,
            ]}
          />
        </Pressable>
      </View>
    </>
  );
}
