import React from "react";
import { Pressable, Text, View } from "react-native";
import { useAppTheme } from "../../../core/theme/ThemeProvider";
import type { Announcement, HailRequest, Shift } from "../../../core/domain/types";
import { LiveMap } from "../LiveMap";

export interface RouteMapSectionProps {
  shift: Shift;
  canOperate: boolean;
  announcements: Announcement[];
  onMarkAnnouncementRead: (id: string) => void;
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

      {/* Live Route Map Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 20,
          marginBottom: 8,
        }}
      >
        <Text style={styles.label}>Live Route</Text>
      </View>

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
