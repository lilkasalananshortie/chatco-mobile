import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Capacity, Shift } from "../../../core/domain/types";

export interface DashboardHeaderCardProps {
  shift: Shift;
  dashStyles: any;
  colors: any;
  isLofi: boolean;
  canOperate: boolean;
  isOnBreak: boolean;
  breakPending: boolean;
  onOpenBreakConfirm: () => void;
  capacity: Capacity;
  onUpdateCapacity: (cap: Capacity) => void;
  onOpenHistory: () => void;
  totals: { total: number; cash: number; gcash: number; voucher?: number };
  transactionTotals: { voucher: number };
  pendingOfflineCount: number;
}

export function DashboardHeaderCard({
  shift,
  dashStyles,
  colors,
  isLofi,
  canOperate,
  isOnBreak,
  breakPending,
  onOpenBreakConfirm,
  capacity,
  onUpdateCapacity,
  onOpenHistory,
  totals,
  transactionTotals,
  pendingOfflineCount,
}: DashboardHeaderCardProps) {
  return (
    <View style={dashStyles.cardWrapper}>
      {/* Top Unit & Conductor Row */}
      <View style={dashStyles.topRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={dashStyles.unitTitle}>Unit: {shift.unitNumber}</Text>
          <Text style={dashStyles.routeSubtitle} numberOfLines={1}>
            {shift.route || "Regular Route"} · Driver: {shift.driverName}
          </Text>
        </View>
        <View
          style={[
            dashStyles.avatarCircle,
            isOnBreak ? dashStyles.avatarOnBreak : dashStyles.avatarOnDuty,
          ]}
        >
          <Text style={dashStyles.avatarInitial}>
            {(shift.conductorName || "C")[0]?.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Full-width Take a Break / Resume Duty Button */}
      <Pressable
        disabled={!canOperate || breakPending}
        onPress={onOpenBreakConfirm}
        style={[
          dashStyles.breakButton,
          isOnBreak ? dashStyles.breakButtonOnBreak : dashStyles.breakButtonOnDuty,
          (!canOperate || breakPending) && { opacity: 0.6 },
        ]}
      >
        <Text
          style={[
            dashStyles.breakButtonText,
            isOnBreak ? dashStyles.breakButtonTextOnBreak : dashStyles.breakButtonTextOnDuty,
          ]}
        >
          {breakPending ? "Updating..." : isOnBreak ? "Resume Duty" : "Take a Break"}
        </Text>
      </Pressable>

      {isOnBreak ? (
        <Text style={dashStyles.onBreakNotice}>
          Pickup requests and live operations are paused while on break.
        </Text>
      ) : null}

      {/* Status + History Row */}
      <View style={dashStyles.statusHistoryRow}>
        {/* Status Box with 3 Chips */}
        <View style={dashStyles.statusBox}>
          <View style={dashStyles.statusIndicatorRow}>
            <View
              style={[
                dashStyles.statusDot,
                {
                  backgroundColor: isOnBreak
                    ? "#38BDF8"
                    : capacity === "AVAILABLE"
                    ? "#34D399"
                    : capacity === "STANDING"
                    ? "#FBBF24"
                    : "#F87171",
                },
              ]}
            />
            <Text style={dashStyles.statusHeaderLabel}>Status</Text>
            <Text style={[dashStyles.statusCurrentValue, isOnBreak && { color: "#38BDF8" }]}>
              {isOnBreak
                ? "On Break"
                : capacity === "AVAILABLE"
                ? "Available"
                : capacity === "STANDING"
                ? "Standing"
                : "Full"}
            </Text>
          </View>
          <View style={dashStyles.chipsRow}>
            {(["AVAILABLE", "STANDING", "FULL"] as Capacity[]).map((val) => {
              const active = capacity === val && !isOnBreak;
              return (
                <Pressable
                  key={val}
                  disabled={isOnBreak || !canOperate}
                  onPress={() => onUpdateCapacity(val)}
                  style={[
                    dashStyles.chip,
                    active && val === "AVAILABLE" && dashStyles.chipAvailable,
                    active && val === "STANDING" && dashStyles.chipStanding,
                    active && val === "FULL" && dashStyles.chipFull,
                    (isOnBreak || !canOperate) && { opacity: 0.4 },
                  ]}
                >
                  <Text
                    style={[
                      dashStyles.chipText,
                      active && val === "AVAILABLE" && { color: colors.success },
                      active && val === "STANDING" && { color: colors.warning },
                      active && val === "FULL" && { color: colors.text },
                    ]}
                  >
                    {val === "AVAILABLE" ? "Available" : val === "STANDING" ? "Standing" : "Full"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* History Button */}
        <Pressable onPress={onOpenHistory} style={dashStyles.historyButton}>
          <Ionicons name="time-outline" size={16} color={colors.text} />
          <Text style={dashStyles.historyButtonText}>History</Text>
        </Pressable>
      </View>

      {/* Total Collected Card with 3 columns */}
      <View style={dashStyles.totalCollectedCard}>
        <View style={dashStyles.totalCollectedTop}>
          <Text style={dashStyles.totalCollectedLabel}>Total Collected</Text>
          <Text style={dashStyles.totalCollectedAmount}>{`₱${totals.total.toFixed(2)}`}</Text>
        </View>
        <View style={dashStyles.threeCols}>
          <View style={dashStyles.colCard}>
            <Text style={dashStyles.colLabelBlue}>GCash</Text>
            <Text style={dashStyles.colValueBlue}>{`₱${totals.gcash.toFixed(2)}`}</Text>
          </View>
          <View style={dashStyles.colCard}>
            <Text style={dashStyles.colLabelEmerald}>Cash</Text>
            <Text style={dashStyles.colValueEmerald}>{`₱${totals.cash.toFixed(2)}`}</Text>
          </View>
          <View style={dashStyles.colCard}>
            <Text style={dashStyles.colLabelAmber}>Voucher</Text>
            <Text style={dashStyles.colValueAmber}>{`₱${(transactionTotals.voucher ?? 0).toFixed(2)}`}</Text>
          </View>
        </View>
      </View>

      {pendingOfflineCount > 0 ? (
        <View style={dashStyles.syncPendingBox}>
          <Ionicons name="cloud-upload-outline" size={14} color={isLofi ? "#D97706" : "#FBBF24"} />
          <Text style={dashStyles.syncPendingText}>
            {pendingOfflineCount} cash transaction{pendingOfflineCount === 1 ? "" : "s"} waiting to sync
          </Text>
        </View>
      ) : null}
    </View>
  );
}
