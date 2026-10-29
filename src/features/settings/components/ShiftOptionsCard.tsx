import React, { useEffect, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../core/api/chatco-api";
import { Text } from "../../../shared/ui/BrandText";
import type { Shift } from "../../../core/domain/types";

export interface ShiftOptionsCardProps {
  styles: any;
  shift: Shift;
  colors: any;
  isLofi: boolean;
  onShiftUpdated?: (shift: Shift | null) => void;
}

export function ShiftOptionsCard({
  styles,
  shift,
  colors,
  isLofi,
  onShiftUpdated,
}: ShiftOptionsCardProps) {
  const [deviceId, setDeviceId] = useState("");
  const [busy, setBusy] = useState(false);
  const [handoffNotice, setHandoffNotice] = useState<string | null>(null);
  const [handoffError, setHandoffError] = useState<string | null>(null);

  useEffect(() => {
    void api.getDeviceId().then(setDeviceId);
  }, []);

  const ownsShift = Boolean(
    shift?.operatingDeviceId && deviceId && shift.operatingDeviceId === deviceId
  );
  const unclaimed = Boolean(shift && !shift.operatingDeviceId);

  const handleReleasePress = async () => {
    setHandoffError(null);
    setHandoffNotice(null);

    try {
      setBusy(true);
      const pending = await api.pendingCashCount(shift.shiftId).catch(() => 0);
      const online = await api.checkConnectivity().catch(() => false);

      // TC-COND-DEV-127: Block handoff when offline cash is unsynced or offline
      if (pending > 0 || !online) {
        const errorMsg =
          "Offline cash fares are still waiting to sync. Reconnect device to sync before handoff.";
        setHandoffError(errorMsg);
        Alert.alert("Handoff Blocked", errorMsg);
        setBusy(false);
        return;
      }

      setBusy(false);

      // TC-COND-DEV-124: Confirm handoff release
      Alert.alert(
        "Release for Handoff",
        "Sync all transactions and release shift ownership so another device can claim it?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Release",
            style: "destructive",
            onPress: async () => {
              try {
                setBusy(true);
                await api.syncPendingCashTransactions().catch(() => null);
                const updated = await api.releaseShiftDevice(shift.shiftId);
                onShiftUpdated?.(updated);
                const noticeMsg = "Shift is ready to be claimed by another device.";
                setHandoffNotice(noticeMsg);
                Alert.alert("Shift Released", noticeMsg);
              } catch (err: any) {
                const msg = err?.message || "Unable to release shift at this time.";
                setHandoffError(msg);
                Alert.alert("Release Error", msg);
              } finally {
                setBusy(false);
              }
            },
          },
        ]
      );
    } catch (err: any) {
      setBusy(false);
      const msg = err?.message || "Check your network connection and try again.";
      setHandoffError(msg);
      Alert.alert("Error", msg);
    }
  };

  const handleClaimPress = async () => {
    setHandoffError(null);
    setHandoffNotice(null);
    try {
      setBusy(true);
      const updated = await api.claimShiftDevice(shift.shiftId);
      onShiftUpdated?.(updated);
      Alert.alert("Device Claimed", "This device is now the operating device for the shift.");
    } catch (err: any) {
      const msg = err?.message || "Unable to claim shift.";
      setHandoffError(msg);
      Alert.alert("Claim Error", msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.sectionCard}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={styles.sectionHeaderTitle}>Shift Options</Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
            backgroundColor: ownsShift
              ? (isLofi ? "#DCFCE7" : "rgba(16, 185, 129, 0.15)")
              : (isLofi ? "#FEF3C7" : "rgba(245, 158, 11, 0.15)"),
          }}
        >
          <Ionicons
            name={ownsShift ? "shield-checkmark" : "phone-portrait-outline"}
            size={12}
            color={ownsShift ? (isLofi ? colors.success : "#34D399") : (isLofi ? colors.warning : "#FBBF24")}
          />
          <Text
            style={{
              fontSize: 10,
              fontWeight: "700",
              color: ownsShift
                ? (isLofi ? colors.success : "#34D399")
                : (isLofi ? colors.warning : "#FBBF24"),
            }}
          >
            {ownsShift ? "Operating Device" : unclaimed ? "Unclaimed" : "View-Only"}
          </Text>
        </View>
      </View>

      <Text style={[styles.sectionSubtitle, { marginTop: 4, marginBottom: 12 }]}>
        Device ownership and multi-device shift handoff
      </Text>

      {handoffNotice ? (
        <View
          style={{
            backgroundColor: isLofi ? "#DCFCE7" : "rgba(16, 185, 129, 0.15)",
            borderWidth: 1,
            borderColor: isLofi ? colors.success : "rgba(16, 185, 129, 0.3)",
            borderRadius: 8,
            padding: 10,
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: isLofi ? colors.success : "#34D399",
            }}
          >
            {handoffNotice}
          </Text>
        </View>
      ) : null}

      {handoffError ? (
        <View
          style={{
            backgroundColor: isLofi ? "#FEE2E2" : "rgba(239, 68, 68, 0.15)",
            borderWidth: 1,
            borderColor: isLofi ? colors.danger : "rgba(239, 68, 68, 0.3)",
            borderRadius: 8,
            padding: 10,
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: isLofi ? colors.danger : "#F87171",
            }}
          >
            {handoffError}
          </Text>
        </View>
      ) : null}

      {ownsShift ? (
        <Pressable
          disabled={busy}
          onPress={() => void handleReleasePress()}
          style={[
            styles.button,
            styles.secondaryButton,
            {
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: busy ? 0.6 : 1,
            },
          ]}
        >
          <Ionicons name="arrow-redo-outline" size={16} color={colors.text} />
          <Text style={[styles.buttonText, styles.secondaryButtonText, { fontWeight: "700" }]}>
            {busy ? "Checking sync…" : "Release for Handoff"}
          </Text>
        </Pressable>
      ) : (
        <Pressable
          disabled={busy}
          onPress={() => void handleClaimPress()}
          style={[
            styles.button,
            {
              backgroundColor: colors.primary,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: busy ? 0.6 : 1,
            },
          ]}
        >
          <Ionicons name="hand-right-outline" size={16} color="#FFFFFF" />
          <Text style={[styles.buttonText, { color: "#FFFFFF", fontWeight: "700" }]}>
            {busy ? "Claiming…" : "Claim Operating Device"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
