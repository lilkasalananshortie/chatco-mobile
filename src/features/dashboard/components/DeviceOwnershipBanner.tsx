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
  const { colors, styles, isLofi , isLowFidelity } = useAppTheme();

  if (isOperatingDevice && canOperate) {
    return null;
  }

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1.5,
        borderRadius: isLowFidelity ? 4 : 14,
        padding: 14,
        marginBottom: 12,
      }}
    >
      <Text
        style={{
          color: colors.text,
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
          color: colors.muted,
          fontSize: 12,
          marginTop: 4,
          lineHeight: 16,
        }}
      >
        {recoveredByAdmin
          ? "An administrator released the previous device. Claim the shift here to continue."
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
      {!ownsShift ? (
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
