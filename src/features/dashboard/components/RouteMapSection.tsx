import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../core/theme/ThemeProvider";
import type { Announcement, HailRequest, Shift } from "../../../core/domain/types";
import { SPEED_LIMIT_KMH, CORRIDOR_DEVIATION_THRESHOLD_METERS } from "../../../core/utils/corridor-guard";
import type { ThermalGuardState } from "../../../core/utils/thermal-guard";
import { LiveMap } from "../LiveMap";
import { RouteAdvisoryBanners } from "./RouteAdvisoryBanners";

export interface RouteMapSectionProps {
  shift: Shift;
  canOperate: boolean;
  announcements: Announcement[];
  onMarkAnnouncementRead: (id: string) => void;
  currentSpeedKmh: number;
  isOverspeeding: boolean;
  isNearSpeedLimit: boolean;
  thermalState: ThermalGuardState;
  voiceActive: boolean;
  onToggleVoice: () => void;
  corridorDeviationMeters: number;
  approachingStop: string | null;
  mapEnabled: boolean;
  setMapEnabled: (enabled: boolean) => void;
  position: { latitude: number; longitude: number } | null;
  hails: HailRequest[];
  routeCoordinates: Array<[number, number]>;
  routeSource: "backend" | "fallback";
  onHail: (id: string, action: "accept" | "reject") => void;
}

export function RouteMapSection({
  shift,
  canOperate,
  announcements,
  onMarkAnnouncementRead,
  currentSpeedKmh,
  isOverspeeding,
  isNearSpeedLimit,
  thermalState,
  voiceActive,
  onToggleVoice,
  corridorDeviationMeters,
  approachingStop,
  mapEnabled,
  setMapEnabled,
  position,
  hails,
  routeCoordinates,
  routeSource,
  onHail,
}: RouteMapSectionProps) {
  const { colors, styles, isLofi } = useAppTheme();

  return (
    <View>
      {/* Announcements */}
      {announcements.filter((item) => !item.isRead).slice(0, 3).map((item) => (
        <View
          key={item.id}
          style={[
            styles.card,
            {
              borderColor: isLofi ? colors.warning : "#F59E0B60",
              backgroundColor: isLofi ? "#FEF3C7" : "#78350F15",
              marginTop: 14,
            },
          ]}
        >
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.body}</Text>
          <Pressable
            style={[styles.button, styles.secondaryButton, { marginTop: 10 }]}
            onPress={() => onMarkAnnouncementRead(item.id)}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>Mark as read</Text>
          </Pressable>
        </View>
      ))}

      {/* Live Route Map Header with Speedometer & Voice Announcer Pill */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 20,
          marginBottom: 8,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={styles.label}>Live Route</Text>
          {/* Live Speedometer Reading */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: isLofi ? 2 : 6,
              backgroundColor: isOverspeeding
                ? isLofi
                  ? "#FEE2E2"
                  : "rgba(239, 68, 68, 0.2)"
                : isNearSpeedLimit
                ? isLofi
                  ? "#FEF3C7"
                  : "rgba(245, 158, 11, 0.15)"
                : isLofi
                ? colors.surface2
                : "rgba(16, 185, 129, 0.12)",
              borderWidth: 1,
              borderColor: isOverspeeding
                ? isLofi
                  ? colors.danger
                  : "rgba(239, 68, 68, 0.4)"
                : isNearSpeedLimit
                ? isLofi
                  ? colors.warning
                  : "rgba(245, 158, 11, 0.3)"
                : isLofi
                ? colors.border
                : "rgba(16, 185, 129, 0.25)",
            }}
          >
            <Ionicons
              name="speedometer-outline"
              size={12}
              color={
                isOverspeeding
                  ? isLofi
                    ? colors.danger
                    : "#F87171"
                  : isNearSpeedLimit
                  ? isLofi
                    ? colors.warning
                    : "#FBBF24"
                  : isLofi
                  ? colors.success
                  : "#34D399"
              }
            />
            <Text
              style={{
                fontSize: 10,
                fontWeight: "800",
                color: isOverspeeding
                  ? isLofi
                    ? colors.danger
                    : "#FCA5A5"
                  : isNearSpeedLimit
                  ? isLofi
                    ? colors.warning
                    : "#FDE68A"
                  : isLofi
                  ? colors.success
                  : "#A7F3D0",
              }}
            >
              {currentSpeedKmh} km/h
            </Text>
          </View>

          {/* Tropical Sun & Idle Duty Saver Indicator */}
          {thermalState.enabled && thermalState.thermalMode === "idle_power_save" ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingHorizontal: 7,
                paddingVertical: 3,
                borderRadius: isLofi ? 2 : 6,
                backgroundColor: isLofi ? colors.surface2 : "rgba(16, 185, 129, 0.12)",
                borderWidth: 1,
                borderColor: isLofi ? colors.border : "rgba(16, 185, 129, 0.25)",
              }}
            >
              <Ionicons name="leaf-outline" size={11} color={isLofi ? colors.success : "#34D399"} />
              <Text style={{ fontSize: 9, fontWeight: "800", color: isLofi ? colors.success : "#34D399" }}>
                IDLE SAVER
              </Text>
            </View>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={voiceActive ? "Mute automated voice announcer" : "Enable automated voice announcer"}
          onPress={onToggleVoice}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: isLofi ? 2 : 999,
            backgroundColor: voiceActive
              ? isLofi
                ? colors.surface2
                : "rgba(37, 99, 235, 0.15)"
              : isLofi
              ? colors.surface2
              : "rgba(255, 255, 255, 0.05)",
            borderWidth: 1,
            borderColor: voiceActive
              ? isLofi
                ? colors.primary
                : "rgba(59, 130, 246, 0.35)"
              : colors.border,
          }}
        >
          <Ionicons
            name={voiceActive ? "volume-high" : "volume-mute"}
            size={13}
            color={voiceActive ? (isLofi ? colors.primary : "#60A5FA") : colors.muted}
          />
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: voiceActive ? (isLofi ? colors.primary : "#93C5FD") : colors.muted,
            }}
          >
            {voiceActive ? "Voice: ON" : "Voice: OFF"}
          </Text>
        </Pressable>
      </View>

      {/* Route & Thermal Advisory Banners */}
      <RouteAdvisoryBanners
        currentSpeedKmh={currentSpeedKmh}
        isOverspeeding={isOverspeeding}
        corridorDeviationMeters={corridorDeviationMeters}
        thermalState={thermalState}
        approachingStop={approachingStop}
      />

      {/* Map or Paused card */}
      {mapEnabled ? (
        <LiveMap
          latitude={position?.latitude}
          longitude={position?.longitude}
          hails={hails}
          unitNumber={shift.unitNumber}
          routeCoordinates={routeCoordinates}
          routeSource={routeSource}
        />
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Live map is paused</Text>
          <Text style={styles.subtitle}>
            Load the map when you need route tracking. This prevents heavy map and GPS services from delaying app startup.
          </Text>
          <Pressable style={styles.button} onPress={() => setMapEnabled(true)}>
            <Text style={styles.buttonText}>Load live map</Text>
          </Pressable>
        </View>
      )}

      {/* Pickup Requests (Hails) */}
      {hails.length ? (
        <>
          <Text style={[styles.label, { marginTop: 22 }]}>Pickup Requests</Text>
          {hails.map((hail) => (
            <View key={hail.id} style={styles.card}>
              <Text style={styles.cardTitle}>{hail.commuterName}</Text>
              <Text style={styles.subtitle}>
                {hail.label || "Passenger waiting"}
                {hail.etaMinutes ? ` · ${hail.etaMinutes} min away` : ""}
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                <Pressable
                  disabled={!canOperate}
                  onPress={() => onHail(hail.id, "accept")}
                  style={[styles.button, { flex: 1, opacity: canOperate ? 1 : 0.45 }]}
                >
                  <Text style={styles.buttonText}>Accept</Text>
                </Pressable>
                <Pressable
                  disabled={!canOperate}
                  onPress={() => onHail(hail.id, "reject")}
                  style={[styles.button, styles.secondaryButton, { flex: 1, opacity: canOperate ? 1 : 0.45 }]}
                >
                  <Text style={styles.buttonText}>Reject</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}
