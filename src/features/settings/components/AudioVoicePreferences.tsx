import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { audioCues } from "../../../core/utils/audio-cues";
import { testVoiceAnnouncement } from "../../../core/utils/voice-announcer";

export interface AudioVoicePreferencesProps {
  styles: any;
  colors: any;
  isLofi: boolean;
  scanSound: boolean;
  onToggleScanSound: () => void;
  voiceAnnouncer: boolean;
  onToggleVoice: () => void;
  audioCuesEnabled: boolean;
  onToggleAudio: () => void;
}

export function AudioVoicePreferences({
  styles,
  colors,
  isLofi,
  scanSound,
  onToggleScanSound,
  voiceAnnouncer,
  onToggleVoice,
  audioCuesEnabled,
  onToggleAudio,
}: AudioVoicePreferencesProps) {
  return (
    <>
      {/* Scan Sound */}
      <View style={[styles.infoRow, { marginTop: 12, paddingVertical: 10 }]}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.prefTitle}>Scan Sound</Text>
          <Text style={styles.prefSubtitle}>Play sound on successful scan</Text>
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

      {/* Next-Stop Voice Announcer */}
      <View style={[styles.infoRow, { marginTop: 8, paddingVertical: 10 }]}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={styles.prefTitle}>Next-Stop Voice Announcer</Text>
            <View
              style={{
                backgroundColor: voiceAnnouncer
                  ? isLofi
                    ? "rgba(22, 112, 90, 0.15)"
                    : "rgba(16, 185, 129, 0.15)"
                  : colors.surface,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: voiceAnnouncer
                  ? isLofi
                    ? colors.success
                    : "rgba(16, 185, 129, 0.3)"
                  : colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: "800",
                  color: voiceAnnouncer ? (isLofi ? colors.success : "#34D399") : colors.muted,
                }}
              >
                {voiceAnnouncer ? "ACTIVE" : "MUTED"}
              </Text>
            </View>
          </View>
          <Text style={styles.prefSubtitle}>
            {voiceAnnouncer
              ? "Active: Clear female voice cues (Filipino/English) via device speaker"
              : "Muted: Next-stop visual notifications only"}
          </Text>
        </View>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: voiceAnnouncer }}
          onPress={onToggleVoice}
          style={[styles.toggleTrack, voiceAnnouncer ? styles.toggleTrackActive : styles.toggleTrackInactive]}
        >
          <View
            style={[styles.toggleThumb, voiceAnnouncer ? styles.toggleThumbActive : styles.toggleThumbInactive]}
          />
        </Pressable>
      </View>

      {/* Voice Announcement Test Button */}
      {voiceAnnouncer ? (
        <Pressable
          onPress={() => void testVoiceAnnouncement()}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginTop: 4,
            marginBottom: 8,
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: isLofi ? 2 : 10,
            backgroundColor: isLofi ? colors.surface2 : "rgba(37, 99, 235, 0.1)",
            borderWidth: 1,
            borderColor: isLofi ? colors.border : "rgba(59, 130, 246, 0.25)",
            alignSelf: "flex-start",
          }}
        >
          <Ionicons name="volume-medium-outline" size={16} color={isLofi ? colors.primary : "#60A5FA"} />
          <Text style={{ fontSize: 12, fontWeight: "700", color: isLofi ? colors.primary : "#93C5FD" }}>
            Test Female Voice Announcement
          </Text>
        </Pressable>
      ) : null}

      {/* No-Look Audio Cues */}
      <View style={[styles.infoRow, { marginTop: 8, paddingVertical: 10 }]}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={styles.prefTitle}>No-Look Audio Cues</Text>
            <View
              style={{
                backgroundColor: audioCuesEnabled
                  ? isLofi
                    ? "rgba(22, 112, 90, 0.15)"
                    : "rgba(16, 185, 129, 0.15)"
                  : colors.surface,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: audioCuesEnabled
                  ? isLofi
                    ? colors.success
                    : "rgba(16, 185, 129, 0.3)"
                  : colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: "800",
                  color: audioCuesEnabled ? (isLofi ? colors.success : "#34D399") : colors.muted,
                }}
              >
                {audioCuesEnabled ? "ACTIVE" : "MUTED"}
              </Text>
            </View>
          </View>
          <Text style={styles.prefSubtitle}>
            {audioCuesEnabled
              ? "Active: 6 unified audio cues for payments, capacity, hails, alerts, and duty"
              : "Muted: Sound cues disabled (silent operation)"}
          </Text>
        </View>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: audioCuesEnabled }}
          onPress={onToggleAudio}
          style={[styles.toggleTrack, audioCuesEnabled ? styles.toggleTrackActive : styles.toggleTrackInactive]}
        >
          <View
            style={[styles.toggleThumb, audioCuesEnabled ? styles.toggleThumbActive : styles.toggleThumbInactive]}
          />
        </Pressable>
      </View>

      {/* Test Audio Cues Quick Chips */}
      {audioCuesEnabled ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4, marginBottom: 8 }}>
          <Pressable
            onPress={() => audioCues.playPaymentSound()}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingHorizontal: 8,
              paddingVertical: 5,
              borderRadius: isLofi ? 2 : 6,
              backgroundColor: isLofi ? colors.surface2 : "rgba(255, 255, 255, 0.05)",
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: "700", color: colors.text }}>🪙 Kalansing (Fare)</Text>
          </Pressable>

          <Pressable
            onPress={() => audioCues.playHailSound()}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingHorizontal: 8,
              paddingVertical: 5,
              borderRadius: isLofi ? 2 : 6,
              backgroundColor: isLofi ? colors.surface2 : "rgba(255, 255, 255, 0.05)",
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: "700", color: colors.text }}>📣 Sipol (Hail)</Text>
          </Pressable>

          <Pressable
            onPress={() => audioCues.playCapacitySound()}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingHorizontal: 8,
              paddingVertical: 5,
              borderRadius: isLofi ? 2 : 6,
              backgroundColor: isLofi ? colors.surface2 : "rgba(255, 255, 255, 0.05)",
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: "700", color: colors.text }}>🚪 Tuk (Capacity)</Text>
          </Pressable>

          <Pressable
            onPress={() => audioCues.playDutySound()}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingHorizontal: 8,
              paddingVertical: 5,
              borderRadius: isLofi ? 2 : 6,
              backgroundColor: isLofi ? colors.surface2 : "rgba(255, 255, 255, 0.05)",
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: "700", color: colors.text }}>🔔 Ding-Dong (Duty)</Text>
          </Pressable>
        </View>
      ) : null}
    </>
  );
}
