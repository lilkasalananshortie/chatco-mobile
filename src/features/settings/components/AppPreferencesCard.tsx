import React from "react";
import { Text } from "../../../shared/ui/BrandText";
import { Pressable, View } from "react-native";

export interface AppPreferencesCardProps {
  styles: any;
  scanSound: boolean;
  onToggleScanSound: () => void;
  isLofi: boolean;
  onToggleLofi: () => void;
}

export function AppPreferencesCard({
  styles,
  scanSound,
  onToggleScanSound,
  isLofi,
  onToggleLofi,
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

      <View style={[styles.infoRow, { marginTop: 8, paddingVertical: 10 }]}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.prefTitle}>Lofi mode</Text>
          <Text style={styles.prefSubtitle}>Use the light color palette across the app</Text>
        </View>
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel="Lofi mode"
          accessibilityState={{ checked: isLofi }}
          onPress={onToggleLofi}
          style={[styles.toggleTrack, isLofi ? styles.toggleTrackActive : styles.toggleTrackInactive]}
        >
          <View style={[styles.toggleThumb, isLofi ? styles.toggleThumbActive : styles.toggleThumbInactive]} />
        </Pressable>
      </View>
    </View>
  );
}
