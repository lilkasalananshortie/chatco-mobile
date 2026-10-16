import React from "react";
import { Pressable, Text, View } from "react-native";
import { useAppTheme } from "../../../core/theme/ThemeProvider";
import type { Shift } from "../../../core/domain/types";

export interface DeviceOwnershipBannerProps {
  shift: Shift;
  isOperatingDevice: boolean;
  canOperate: boolean;
  ownsShift: boolean;
  unclaimed: boolean;
  recoveredByAdmin: boolean;
  deviceBusy: boolean;
  deviceError: string;
  claimDevice: () => Promise<void>;
  releaseDevice: () => Promise<void>;
}

export function DeviceOwnershipBanner({
  shift,
  isOperatingDevice,
  canOperate,
  ownsShift,
  unclaimed,
  recoveredByAdmin,
  deviceBusy,
  deviceError,
  claimDevice,
  releaseDevice,
}: DeviceOwnershipBannerProps) {
  const { colors, styles, isLofi } = useAppTheme();

  if (isOperatingDevice && canOperate && !recoveredByAdmin) {
    return null;
  }

  return (
    <View
      style={{
        backgroundColor: ownsShift
          ? (isLofi ? "#E0F2FE" : "rgba(14, 165, 233, 0.12)")
          : (isLofi ? "#FEF3C7" : "rgba(245, 158, 11, 0.12)"),
        borderColor: ownsShift
          ? (isLofi ? "#0284C7" : "rgba(56, 189, 248, 0.35)")
          : (isLofi ? colors.warning : "rgba(251, 191, 36, 0.35)"),
        borderWidth: 1.5,
        borderRadius: isLofi ? 4 : 14,
        padding: 14,
        marginBottom: 12,
      }}
    >
      <Text
        style={{
          color: ownsShift
            ? (isLofi ? "#0369A1" : "#BAE6FD")
            : (isLofi ? "#92400E" : "#FDE68A"),
          fontSize: 14,
          fontWeight: "700",
        }}
      >
        {recoveredByAdmin
          ? "Admin released the unavailable device"
          : ownsShift
          ? "This is the operating device"
          : unclaimed
          ? "Shift Released"
          : "Shift active on another device"}
      </Text>
      <Text
        style={{
          color: ownsShift
            ? (isLofi ? "#0C4A6E" : "#E0F2FE")
            : (isLofi ? "#78350F" : "#FEF3C7"),
          fontSize: 12,
          marginTop: 4,
          lineHeight: 16,
        }}
      >
        {recoveredByAdmin
          ? "An administrator released this device from the shift. Please log in again."
          : ownsShift
          ? "Release only when moving the shift to Web or Mobile."
          : unclaimed
          ? "Shift is ready to be claimed by another device."
          : "Shift active on another device. Choose operating device to take over."}
      </Text>
      {deviceError ? (
        <Text style={{ color: colors.danger, fontSize: 12, marginTop: 6 }}>
          {deviceError}
        </Text>
      ) : null}
      {!ownsShift && !recoveredByAdmin ? (
        <Pressable
          disabled={deviceBusy}
          style={[styles.button, { marginTop: 10, backgroundColor: colors.primary }]}
          onPress={() => void claimDevice()}
        >
          <Text style={[styles.buttonText, { color: "#fff", fontWeight: "700" }]}>
            {deviceBusy ? "Claiming…" : "Claim Operating Device"}
          </Text>
        </Pressable>
      ) : ownsShift ? (
        <Pressable
          disabled={deviceBusy}
          style={[styles.button, styles.secondaryButton, { marginTop: 10 }]}
          onPress={() => void releaseDevice()}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText, { fontWeight: "700" }]}>
            {deviceBusy ? "Checking sync…" : "Release for handoff"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
