import React from "react";
import { Pressable, Text, View } from "react-native";

export interface AppPreferencesCardProps {
  styles: any;
  colors: any;
  isLofi: boolean;
  setLofi: (lofi: boolean) => void;
  scanSound: boolean;
  onToggleScanSound: () => void;
}

export function AppPreferencesCard({
  styles,
  colors,
  isLofi,
  setLofi,
  scanSound,
  onToggleScanSound,
}: AppPreferencesCardProps) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionHeaderTitle}>App Preferences</Text>

      {/* Scan Sound (1:1 with web: "Play sound on successful scan") */}
      <View style={[styles.infoRow, { marginTop: 12, paddingVertical: 10 }]}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.prefTitle}>Scan Sound</Text>
          <Text style={styles.prefSubtitle}>
            Play sound on successful scan
          </Text>
        </View>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: scanSound }}
          onPress={onToggleScanSound}
          style={[styles.toggleTrack, scanSound ? styles.toggleTrackActive : styles.toggleTrackInactive]}
        >
          <View style={[styles.toggleThumb, scanSound ? styles.toggleThumbActive : styles.toggleThumbInactive]} />
        </Pressable>
      </View>

      {/* Lo-Fi Mode */}
      <View style={[styles.infoRow, { paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border }]}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.prefTitle}>Lo-Fi Mode</Text>
          <Text style={styles.prefSubtitle}>
            {isLofi
              ? "Active: High-contrast theme for outdoor daylight & battery"
              : "Low-distraction visual system for battery & sunlight"}
          </Text>
        </View>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: isLofi }}
          onPress={() => setLofi(!isLofi)}
          style={[styles.toggleTrack, isLofi ? styles.toggleTrackActive : styles.toggleTrackInactive]}
        >
          <View style={[styles.toggleThumb, isLofi ? styles.toggleThumbActive : styles.toggleThumbInactive]} />
        </Pressable>
      </View>
    </View>
  );
}
