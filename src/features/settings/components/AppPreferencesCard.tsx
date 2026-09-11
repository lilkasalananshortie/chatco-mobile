import React from "react";
import { Pressable, Text, View } from "react-native";
import type { ThermalGuardState } from "../../../core/utils/thermal-guard";
import { AudioVoicePreferences } from "./AudioVoicePreferences";
import { OperationalPreferences } from "./OperationalPreferences";

export interface AppPreferencesCardProps {
  styles: any;
  colors: any;
  isLofi: boolean;
  setLofi: (lofi: boolean) => void;
  scanSound: boolean;
  onToggleScanSound: () => void;
  voiceAnnouncer: boolean;
  onToggleVoice: () => void;
  audioCuesEnabled: boolean;
  onToggleAudio: () => void;
  headwayMins: number;
  onUpdateHeadway: (mins: number) => void;
  thermalState: ThermalGuardState;
  onToggleThermalGuard: () => void;
}

export function AppPreferencesCard({
  styles,
  colors,
  isLofi,
  setLofi,
  scanSound,
  onToggleScanSound,
  voiceAnnouncer,
  onToggleVoice,
  audioCuesEnabled,
  onToggleAudio,
  headwayMins,
  onUpdateHeadway,
  thermalState,
  onToggleThermalGuard,
}: AppPreferencesCardProps) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionHeaderTitle}>App Preferences</Text>

      {/* Lo-Fi Mode */}
      <View style={[styles.infoRow, { marginTop: 12, paddingVertical: 10 }]}>
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

      {/* Audio & Voice Announcer Preferences */}
      <AudioVoicePreferences
        styles={styles}
        colors={colors}
        isLofi={isLofi}
        scanSound={scanSound}
        onToggleScanSound={onToggleScanSound}
        voiceAnnouncer={voiceAnnouncer}
        onToggleVoice={onToggleVoice}
        audioCuesEnabled={audioCuesEnabled}
        onToggleAudio={onToggleAudio}
      />

      {/* Headway & Thermal Guard Operational Preferences */}
      <OperationalPreferences
        styles={styles}
        colors={colors}
        isLofi={isLofi}
        headwayMins={headwayMins}
        onUpdateHeadway={onUpdateHeadway}
        thermalState={thermalState}
        onToggleThermalGuard={onToggleThermalGuard}
      />
    </View>
  );
}
