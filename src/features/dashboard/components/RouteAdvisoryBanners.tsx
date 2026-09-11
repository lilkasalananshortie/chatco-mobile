import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../core/theme/ThemeProvider";
import { SPEED_LIMIT_KMH, CORRIDOR_DEVIATION_THRESHOLD_METERS } from "../../../core/utils/corridor-guard";
import type { ThermalGuardState } from "../../../core/utils/thermal-guard";

interface RouteAdvisoryBannersProps {
  currentSpeedKmh: number;
  isOverspeeding: boolean;
  corridorDeviationMeters: number;
  thermalState: ThermalGuardState;
  approachingStop: string | null;
}

export function RouteAdvisoryBanners({
  currentSpeedKmh,
  isOverspeeding,
  corridorDeviationMeters,
  thermalState,
  approachingStop,
}: RouteAdvisoryBannersProps) {
  const { colors, isLofi } = useAppTheme();

  return (
    <>
      {/* Real-Time Overspeed Warning Banner */}
      {isOverspeeding ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: isLofi ? "#FEE2E2" : "rgba(239, 68, 68, 0.2)",
            borderColor: isLofi ? "#DC2626" : "rgba(248, 113, 113, 0.6)",
            borderWidth: 1.5,
            borderRadius: isLofi ? 4 : 12,
            padding: 10,
            marginBottom: 10,
          }}
        >
          <Ionicons name="speedometer" size={22} color={isLofi ? "#DC2626" : "#F87171"} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: "800", color: isLofi ? "#991B1B" : "#FCA5A5" }}>
              OVERSPEED WARNING: {currentSpeedKmh} KM/H (LIMIT: {SPEED_LIMIT_KMH} KM/H)
            </Text>
            <Text style={{ fontSize: 11, color: isLofi ? "#7F1D1D" : "#FECACA", marginTop: 2 }}>
              Vehicle exceeds franchise speed threshold. Please slow down.
            </Text>
          </View>
        </View>
      ) : null}

      {/* Route Corridor Deviation Warning Banner */}
      {corridorDeviationMeters > CORRIDOR_DEVIATION_THRESHOLD_METERS ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: isLofi ? "#FEF3C7" : "rgba(245, 158, 11, 0.18)",
            borderColor: isLofi ? "#D97706" : "rgba(251, 191, 36, 0.5)",
            borderWidth: 1.5,
            borderRadius: isLofi ? 4 : 12,
            padding: 10,
            marginBottom: 10,
          }}
        >
          <Ionicons name="navigate-circle-outline" size={22} color={isLofi ? "#B45309" : "#FBBF24"} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: "800", color: isLofi ? "#92400E" : "#FDE68A" }}>
              ROUTE DEVIATION ({corridorDeviationMeters}m OFF CORRIDOR)
            </Text>
            <Text style={{ fontSize: 11, color: isLofi ? "#78350F" : "#FEF3C7", marginTop: 2 }}>
              Vehicle has moved outside the authorized franchise corridor.
            </Text>
          </View>
        </View>
      ) : null}

      {/* Tropical Sun & Battery Thermal Advisory Banner */}
      {thermalState.enabled && thermalState.thermalWarningMessage ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: isLofi ? "#FEF3C7" : "rgba(245, 158, 11, 0.18)",
            borderColor: isLofi ? "#D97706" : "rgba(251, 191, 36, 0.4)",
            borderWidth: 1.5,
            borderRadius: isLofi ? 4 : 12,
            padding: 10,
            marginBottom: 10,
          }}
        >
          <Ionicons name="sunny" size={22} color={isLofi ? "#B45309" : "#FBBF24"} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: "800", color: isLofi ? "#92400E" : "#FDE68A" }}>
              ALL-DAY DUTY & BATTERY ADVISORY
            </Text>
            <Text style={{ fontSize: 11, color: isLofi ? "#78350F" : "#FEF3C7", marginTop: 2 }}>
              {thermalState.thermalWarningMessage}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Approaching Station Visual HUD (Only Main Stops) */}
      {approachingStop ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: isLofi ? "#EFF6FF" : "rgba(37, 99, 235, 0.18)",
            borderColor: isLofi ? "#2563EB" : "rgba(59, 130, 246, 0.45)",
            borderWidth: 1.5,
            borderRadius: isLofi ? 3 : 12,
            padding: 10,
            marginBottom: 10,
          }}
        >
          <Ionicons name="megaphone-outline" size={20} color={isLofi ? "#1D4ED8" : "#60A5FA"} />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: isLofi ? "#1E40AF" : "#93C5FD",
                fontSize: 10,
                fontWeight: "800",
                textTransform: "uppercase",
                letterSpacing: 0.8,
              }}
            >
              Approaching Station (Main Stop)
            </Text>
            <Text
              style={{
                color: isLofi ? colors.text : "#FFFFFF",
                fontSize: 15,
                fontWeight: "800",
                marginTop: 1,
              }}
            >
              {approachingStop}
            </Text>
          </View>
        </View>
      ) : null}
    </>
  );
}
