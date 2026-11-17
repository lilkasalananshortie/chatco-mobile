import React from "react";
import { Text } from "../../../shared/ui/BrandText";
import { Pressable, View } from "react-native";

export interface AppPreferencesCardProps {
  styles: any;
  scanSound: boolean;
  onToggleScanSound: () => void;
  soundCues: boolean;
  onToggleSoundCues: () => void;
  onTestSound: () => void;
  isLofi: boolean;
  onToggleLofi: () => void;
}

export function AppPreferencesCard({
  styles,
  scanSound,
  onToggleScanSound,
  soundCues,
  onToggleSoundCues,
  onTestSound,
  isLofi,
  onToggleLofi,
}: AppPreferencesCardProps) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionHeaderTitle}>App Preferences</Text>

      <View style={[styles.infoRow, { marginTop: 12, paddingVertical: 10 }]}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.prefTitle}>Sound cues</Text>
          <Text style={styles.prefSubtitle}>Play payment, hail, warning, duty, capacity, and sync sounds</Text>
        </View>
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel="Sound cues"
          accessibilityState={{ checked: soundCues }}
          onPress={onToggleSoundCues}
          style={[styles.toggleTrack, soundCues ? styles.toggleTrackActive : styles.toggleTrackInactive]}
        >
          <View style={[styles.toggleThumb, soundCues ? styles.toggleThumbActive : styles.toggleThumbInactive]} />
        </Pressable>
      </View>
      <Pressable accessibilityRole="button" onPress={onTestSound} style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start", paddingHorizontal: 12 }}>
        <Text style={[styles.prefTitle, { color: "#3B82F6" }]}>Test sound and vibration</Text>
      </Pressable>

      <View style={[styles.infoRow, { marginTop: 12, paddingVertical: 10 }]}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.prefTitle}>Payment sound</Text>
          <Text style={styles.prefSubtitle}>
            Play a sound and vibration when a payment is saved
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
          <Text style={styles.prefSubtitle}>Use simpler styling and fewer animations</Text>
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
