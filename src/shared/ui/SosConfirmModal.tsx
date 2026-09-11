import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { api } from "../../core/api/chatco-api";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import { sosModalStyles as styles } from "./sos-modal-styles";

interface SosConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SosStatus = "confirming" | "locating" | "sending" | "active" | "responded" | "error";

const DEFAULT_LOCATION = { lat: 14.8434, lng: 120.875 };
const POLL_INTERVAL_MS = 3000;

export function SosConfirmModal({ isOpen, onClose }: SosConfirmModalProps) {
  const { colors, isLofi } = useAppTheme();
  const [status, setStatus] = useState<SosStatus>("confirming");
  const [activeSeconds, setActiveSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [alertId, setAlertId] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStatus("confirming");
      setActiveSeconds(0);
      setErrorMessage("");
      setAlertId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (status === "active") {
      timerRef.current = setInterval(() => setActiveSeconds(p => p + 1), 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollAlert = useCallback(async (id: string) => {
    try {
      const alert = await api.sosStatus(id);
      if (alert.status === "ACKNOWLEDGED" || alert.status === "RESOLVED") {
        stopPolling();
        setStatus("responded");
      }
    } catch {
      // Network hiccup — keep polling
    }
  }, [stopPolling]);

  useEffect(() => {
    if (status === "active" && alertId) {
      pollRef.current = setInterval(() => void pollAlert(alertId), POLL_INTERVAL_MS);
    }
    return stopPolling;
  }, [status, alertId, pollAlert, stopPolling]);

  useEffect(() => stopPolling, [stopPolling]);

  const sendSos = useCallback(async (lat: number, lng: number) => {
    setStatus("sending");
    try {
      const alert = await api.sos(lat, lng, "Emergency alert from conductor");
      if (alert.status === "ACKNOWLEDGED" || alert.status === "RESOLVED") {
        setStatus("responded");
        return;
      }
      setAlertId(alert.id);
      setStatus("active");
    } catch (cause) {
      setStatus("error");
      setErrorMessage(cause instanceof Error ? cause.message : "Unable to send the SOS signal. Please try again.");
    }
  }, []);

  const handleActivate = useCallback(async () => {
    setStatus("locating");
    setErrorMessage("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        // Fallback to default Meycauayan location
        void sendSos(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng);
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      void sendSos(position.coords.latitude, position.coords.longitude);
    } catch {
      void sendSos(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng);
    }
  }, [sendSos]);

  const handleRetry = () => {
    setErrorMessage("");
    setAlertId(null);
    setActiveSeconds(0);
    setStatus("confirming");
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const isLocked = status === "locating" || status === "sending" || status === "active";

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={status === "confirming" ? onClose : undefined}>
      <View style={[styles.backdrop, isLocked ? styles.backdropLocked : (isLofi ? { backgroundColor: colors.overlay } : styles.backdropNormal)]}>
        <View style={[
          styles.modalCard,
          isLofi && { borderRadius: 4, elevation: 0, shadowOpacity: 0 },
          status === "active" || status === "locating" || status === "sending"
            ? styles.cardActive
            : [
                styles.cardNormal,
                isLofi && { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1.5 },
              ],
        ]}>
          {status === "confirming" && (
            <View style={styles.content}>
              <View style={[styles.iconCircleRed, isLofi && { backgroundColor: "#FEE2E2", borderColor: "#FCA5A5" }]}>
                <Ionicons name="warning-outline" size={40} color={isLofi ? "#DC2626" : "#F87171"} />
              </View>
              <Text style={[styles.title, isLofi && { color: colors.text }]}>Send Emergency SOS?</Text>
              <Text style={[styles.description, isLofi && { color: colors.muted }]}>
                This will immediately share your <Text style={[styles.boldWhite, isLofi && { color: colors.text }]}>real-time live location</Text> with the CHATCO Admin dispatch team.{"\n\n"}
                <Text style={[styles.warningRed, isLofi && { color: colors.danger }]}>Only use this in actual emergencies.</Text>
              </Text>
              <View style={styles.buttonRow}>
                <Pressable
                  onPress={onClose}
                  style={[
                    styles.button,
                    styles.cancelButton,
                    isLofi && { backgroundColor: colors.surface2, borderColor: colors.border, borderRadius: 3, borderWidth: 1.5 },
                  ]}
                >
                  <Text style={[styles.cancelText, isLofi && { color: colors.text }]}>Cancel</Text>
                </Pressable>
                <Pressable onPress={() => void handleActivate()} style={[styles.button, styles.sosButton, isLofi && { borderRadius: 3 }]}>
                  <Ionicons name="warning" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.sosButtonText}>Send SOS</Text>
                </Pressable>
              </View>
            </View>
          )}

          {status === "locating" && (
            <View style={styles.content}>
              <View style={[styles.iconCircleRed, { backgroundColor: "rgba(239, 68, 68, 0.1)" }]}>
                <Ionicons name="location-outline" size={38} color="#EF4444" />
              </View>
              <Text style={styles.titleDark}>Getting your location…</Text>
              <Text style={styles.descriptionDark}>
                Please allow location access. We need your GPS coordinates to direct respondents to you.
              </Text>
            </View>
          )}

          {status === "sending" && (
            <View style={styles.content}>
              <View style={[styles.iconCircleRed, { backgroundColor: "rgba(239, 68, 68, 0.1)" }]}>
                <Ionicons name="navigate-outline" size={36} color="#EF4444" />
              </View>
              <Text style={styles.titleDark}>Sending distress signal…</Text>
              <Text style={styles.descriptionDark}>
                Transmitting your location to the CHATCO Admin team.
              </Text>
            </View>
          )}

          {status === "active" && (
            <View style={styles.content}>
              <View style={styles.pulseRadar}>
                <Ionicons name="warning" size={36} color="#FFFFFF" />
              </View>
              <Text style={styles.sosActiveTitle}>SOS IS ACTIVE</Text>
              <Text style={styles.descriptionDark}>Admin dispatch is tracking your live location</Text>
              <View style={styles.timerBadge}>
                <Ionicons name="time-outline" size={20} color="#B91C1C" style={{ marginRight: 6 }} />
                <Text style={styles.timerText}>{formatTimer(activeSeconds)}</Text>
              </View>
              <Text style={styles.subtextDark}>
                Please keep the app open. This screen will automatically update once the admin responds.
              </Text>
            </View>
          )}

          {status === "responded" && (
            <View style={styles.content}>
              <View style={[styles.iconCircleGreen, isLofi && { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" }]}>
                <Ionicons name="shield-checkmark-outline" size={40} color={isLofi ? "#16A34A" : "#22C55E"} />
              </View>
              <Text style={[styles.title, isLofi && { color: colors.text }]}>Signal Received</Text>
              <Text style={[styles.description, isLofi && { color: colors.muted }]}>
                The CHATCO Admin dispatch team has successfully received your distress signal.{"\n\n"}
                <Text style={[styles.boldWhite, isLofi && { color: colors.text }]}>
                  Respondents are being dispatched to your location. Please stay calm and keep your location services turned on.
                </Text>
              </Text>
              <Pressable onPress={onClose} style={[styles.button, styles.understoodButton, isLofi && { borderRadius: 3 }]}>
                <Text style={styles.understoodText}>Understood</Text>
              </Pressable>
            </View>
          )}

          {status === "error" && (
            <View style={styles.content}>
              <View style={[styles.iconCircleRed, isLofi && { backgroundColor: "#FEE2E2", borderColor: "#FCA5A5" }]}>
                <Ionicons name="warning-outline" size={40} color={isLofi ? "#DC2626" : "#F87171"} />
              </View>
              <Text style={[styles.title, isLofi && { color: colors.text }]}>SOS Could Not Be Sent</Text>
              <Text style={[styles.description, { color: isLofi ? colors.danger : "#FCA5A5" }]}>
                {errorMessage || "Network error. Please check your connection and try again."}
              </Text>
              <View style={styles.buttonRow}>
                <Pressable
                  onPress={onClose}
                  style={[
                    styles.button,
                    styles.cancelButton,
                    isLofi && { backgroundColor: colors.surface2, borderColor: colors.border, borderRadius: 3, borderWidth: 1.5 },
                  ]}
                >
                  <Text style={[styles.cancelText, isLofi && { color: colors.text }]}>Close</Text>
                </Pressable>
                <Pressable onPress={handleRetry} style={[styles.button, styles.sosButton, isLofi && { borderRadius: 3 }]}>
                  <Text style={styles.sosButtonText}>Try Again</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
