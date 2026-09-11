import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../core/theme/ThemeProvider";
import { ModalShell } from "../../../shared/ui";
import { SlideToConfirm } from "../../../shared/ui/SlideToConfirm";

export interface BreakConfirmModalProps {
  visible: boolean;
  isOnBreak: boolean;
  breakPending: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function BreakConfirmModal({
  visible,
  isOnBreak,
  breakPending,
  onClose,
  onConfirm,
}: BreakConfirmModalProps) {
  const { colors, styles, isLofi } = useAppTheme();

  return (
    <ModalShell
      visible={visible}
      title={isOnBreak ? "Resume Duty?" : "Take a Break?"}
      onClose={() => !breakPending && onClose()}
    >
      <View style={{ alignItems: "center", marginBottom: 16 }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: isLofi ? 4 : 24,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
            backgroundColor: isOnBreak
              ? isLofi
                ? "rgba(22, 112, 90, 0.15)"
                : "rgba(52, 211, 153, 0.15)"
              : isLofi
              ? "#FEF3C7"
              : "rgba(245, 158, 11, 0.15)",
            borderWidth: isLofi ? 1.5 : 1,
            borderColor: isOnBreak ? colors.success : colors.warning,
          }}
        >
          <Ionicons
            name="time-outline"
            size={24}
            color={isOnBreak ? colors.success : colors.warning}
          />
        </View>
        <Text style={[styles.cardTitle, { fontSize: 16, textAlign: "center" }]}>
          {isOnBreak ? "Resume Duty?" : "Take a Break?"}
        </Text>
        <Text style={[styles.subtitle, { textAlign: "center", marginTop: 4, lineHeight: 18, maxWidth: 280 }]}>
          {isOnBreak
            ? "You'll be marked back on duty and visible to commuters and hails again."
            : "Your unit pauses from the live map while on break, and won't be flagged as inactive."}
        </Text>
      </View>
      <SlideToConfirm
        label={isOnBreak ? "Slide to resume duty" : "Slide to start break"}
        disabled={breakPending}
        onComplete={onConfirm}
      />
    </ModalShell>
  );
}
