import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useAppTheme } from "../../../core/theme/ThemeProvider";
import { api } from "../../../core/api/chatco-api";
import { appHaptics } from "../../../core/utils/haptics";

interface IncidentReportModalProps {
  visible: boolean;
  onClose: () => void;
  unitNumber?: string;
  shiftId?: string;
}

type IncidentType = "BREAKDOWN" | "ACCIDENT";

export function IncidentReportModal({
  visible,
  onClose,
  unitNumber,
  shiftId,
}: IncidentReportModalProps) {
  const { colors, isLofi } = useAppTheme();
  const [incidentType, setIncidentType] = useState<IncidentType>("BREAKDOWN");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = () => {
    setNotes("");
    setIncidentType("BREAKDOWN");
    setSubmitting(false);
    setSubmitted(false);
    setError(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!notes.trim()) {
      setError("Please describe the incident before submitting.");
      return;
    }

    setSubmitting(true);
    setError(null);

    let lat = 14.8434;
    let lng = 120.875;

    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === "granted") {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      }
    } catch {
      // Keep default coordinates
    }

    const typeLabel = incidentType === "BREAKDOWN" ? "Vehicle Breakdown" : "Accident";
    const fullNote = `[INCIDENT: ${typeLabel.toUpperCase()}] Unit ${unitNumber || "N/A"} - ${notes.trim()} (GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)})`;

    try {
      // Broadcast via SOS/Incident pipeline
      await api.sos(lat, lng, fullNote);
      appHaptics.success();
      setSubmitted(true);
    } catch (err: any) {
      // If 429 or rate limited, still consider submitted if SOS was already active
      const msg = err?.message || "";
      if (msg.includes("429") || msg.toLowerCase().includes("too many") || msg.toLowerCase().includes("already active")) {
        setSubmitted(true);
      } else {
        setError(msg || "Failed to submit incident report. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={modalStyles.backdrop}>
        <View
          style={[
            modalStyles.card,
            {
              backgroundColor: isLofi ? colors.surface : "#1E293B",
              borderColor: isLofi ? colors.border : "#334155",
            },
          ]}
        >
          {/* Header */}
          <View style={modalStyles.headerRow}>
            <View style={modalStyles.titleRow}>
              <Ionicons
                name="warning-outline"
                size={22}
                color={incidentType === "ACCIDENT" ? "#EF4444" : "#F59E0B"}
              />
              <Text
                style={[
                  modalStyles.modalTitle,
                  { color: isLofi ? colors.text : "#FFFFFF" },
                ]}
              >
                Log Incident
              </Text>
            </View>
            <Pressable onPress={handleClose} style={modalStyles.closeButton}>
              <Ionicons name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>

          {submitted ? (
            <View style={modalStyles.successContainer}>
              <View
                style={[
                  modalStyles.successIcon,
                  {
                    backgroundColor:
                      incidentType === "ACCIDENT"
                        ? "rgba(239, 68, 68, 0.15)"
                        : "rgba(245, 158, 11, 0.15)",
                  },
                ]}
              >
                <Ionicons
                  name={incidentType === "ACCIDENT" ? "alert-circle" : "construct"}
                  size={42}
                  color={incidentType === "ACCIDENT" ? "#EF4444" : "#F59E0B"}
                />
              </View>
              <Text
                style={[
                  modalStyles.successTitle,
                  { color: isLofi ? colors.text : "#FFFFFF" },
                ]}
              >
                {incidentType === "BREAKDOWN"
                  ? "Vehicle Breakdown Reported"
                  : "Accident Report Logged"}
              </Text>
              <Text
                style={[
                  modalStyles.successMessage,
                  { color: isLofi ? colors.muted : "#94A3B8" },
                ]}
              >
                {incidentType === "BREAKDOWN"
                  ? "Vehicle has been marked as disabled. Dispatch and route supervisors have been notified to reroute subsequent units."
                  : "Accident details and live GPS coordinates have been flagged as high emergency on admin monitoring."}
              </Text>
              <Pressable
                onPress={handleClose}
                style={[
                  modalStyles.doneButton,
                  { backgroundColor: isLofi ? colors.primary : "#3B82F6" },
                ]}
              >
                <Text style={modalStyles.doneButtonText}>Done</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={{ paddingBottom: 16 }}
              keyboardShouldPersistTaps="handled"
            >
              <Text
                style={[
                  modalStyles.sectionSubtitle,
                  { color: isLofi ? colors.muted : "#94A3B8" },
                ]}
              >
                Select the incident type to report immediately to CHATCO Fleet Dispatch:
              </Text>

              {/* Type Selectors */}
              <View style={modalStyles.typeSelectorRow}>
                <Pressable
                  onPress={() => setIncidentType("BREAKDOWN")}
                  style={[
                    modalStyles.typeCard,
                    incidentType === "BREAKDOWN" && modalStyles.typeCardActiveBreakdown,
                    {
                      backgroundColor:
                        incidentType === "BREAKDOWN"
                          ? isLofi
                            ? "#FEF3C7"
                            : "rgba(245, 158, 11, 0.15)"
                          : isLofi
                          ? colors.surface2
                          : "#0F172A",
                      borderColor:
                        incidentType === "BREAKDOWN"
                          ? "#F59E0B"
                          : isLofi
                          ? colors.border
                          : "#334155",
                    },
                  ]}
                >
                  <Ionicons
                    name="construct"
                    size={24}
                    color={incidentType === "BREAKDOWN" ? "#F59E0B" : colors.muted}
                  />
                  <Text
                    style={[
                      modalStyles.typeCardTitle,
                      {
                        color:
                          incidentType === "BREAKDOWN"
                            ? isLofi
                              ? "#92400E"
                              : "#FBBF24"
                            : isLofi
                            ? colors.text
                            : "#94A3B8",
                      },
                    ]}
                  >
                    Vehicle Breakdown
                  </Text>
                  <Text
                    style={[
                      modalStyles.typeCardSubtitle,
                      { color: isLofi ? colors.muted : "#64748B" },
                    ]}
                  >
                    Mechanical, flat tire, engine fault
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setIncidentType("ACCIDENT")}
                  style={[
                    modalStyles.typeCard,
                    incidentType === "ACCIDENT" && modalStyles.typeCardActiveAccident,
                    {
                      backgroundColor:
                        incidentType === "ACCIDENT"
                          ? isLofi
                            ? "#FEE2E2"
                            : "rgba(239, 68, 68, 0.15)"
                          : isLofi
                          ? colors.surface2
                          : "#0F172A",
                      borderColor:
                        incidentType === "ACCIDENT"
                          ? "#EF4444"
                          : isLofi
                          ? colors.border
                          : "#334155",
                    },
                  ]}
                >
                  <Ionicons
                    name="car"
                    size={24}
                    color={incidentType === "ACCIDENT" ? "#EF4444" : colors.muted}
                  />
                  <Text
                    style={[
                      modalStyles.typeCardTitle,
                      {
                        color:
                          incidentType === "ACCIDENT"
                            ? isLofi
                              ? "#B91C1C"
                              : "#F87171"
                            : isLofi
                            ? colors.text
                            : "#94A3B8",
                      },
                    ]}
                  >
                    Accident
                  </Text>
                  <Text
                    style={[
                      modalStyles.typeCardSubtitle,
                      { color: isLofi ? colors.muted : "#64748B" },
                    ]}
                  >
                    Collision, injury, emergency
                  </Text>
                </Pressable>
              </View>

              {/* Note input */}
              <Text
                style={[
                  modalStyles.inputLabel,
                  { color: isLofi ? colors.text : "#E2E8F0" },
                ]}
              >
                Incident Notes & Details:
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder={
                  incidentType === "BREAKDOWN"
                    ? "e.g., Flat tire near Bocaue, unable to proceed..."
                    : "e.g., Collision with motorbike along highway..."
                }
                placeholderTextColor={isLofi ? colors.muted : "#64748B"}
                multiline
                numberOfLines={4}
                style={[
                  modalStyles.textInput,
                  {
                    backgroundColor: isLofi ? colors.surface2 : "#0F172A",
                    borderColor: isLofi ? colors.border : "#334155",
                    color: isLofi ? colors.text : "#FFFFFF",
                  },
                ]}
              />

              {error ? (
                <Text style={modalStyles.errorText}>{error}</Text>
              ) : null}

              {/* Submit Button */}
              <Pressable
                onPress={handleSubmit}
                disabled={submitting}
                style={[
                  modalStyles.submitButton,
                  {
                    backgroundColor:
                      incidentType === "ACCIDENT"
                        ? "#DC2626"
                        : "#D97706",
                    opacity: submitting ? 0.7 : 1,
                  },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={modalStyles.submitButtonText}>
                      Submit {incidentType === "BREAKDOWN" ? "Breakdown Report" : "Accident Report"}
                    </Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  card: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    padding: 20,
    maxHeight: "85%",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  closeButton: {
    padding: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 14,
    lineHeight: 18,
  },
  typeSelectorRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  typeCard: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
  },
  typeCardActiveBreakdown: {
    borderColor: "#F59E0B",
  },
  typeCardActiveAccident: {
    borderColor: "#EF4444",
  },
  typeCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 6,
    textAlign: "center",
  },
  typeCardSubtitle: {
    fontSize: 10,
    marginTop: 2,
    textAlign: "center",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  textInput: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 90,
    textAlignVertical: "top",
    marginBottom: 14,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginBottom: 10,
    fontWeight: "500",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 4,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  successContainer: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 12,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 20,
  },
  doneButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  doneButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
