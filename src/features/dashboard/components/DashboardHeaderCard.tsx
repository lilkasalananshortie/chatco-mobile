import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Capacity, Shift } from "../../../core/domain/types";
import { SlideToConfirm } from "../../../shared/ui/SlideToConfirm";
import type { TripCycleState } from "../../../core/utils/trip-cycle-tracker";
import {
  formatCountdown,
  headwayProgress,
  type HeadwayTimerState,
} from "../../../core/utils/terminal-headway";

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
  tripCycleState: TripCycleState | null;
  currentTripStats: { paxCount: number; revenue: number; durationMinutes: number };
  onOpenTripLogbook: () => void;
  headway: HeadwayTimerState;
  onStartNextTrip: () => void;
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
  tripCycleState,
  currentTripStats,
  onOpenTripLogbook,
  headway,
  onStartNextTrip,
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

      {/* Trip Cycle Counter & Turnaround HUD Bar */}
      {tripCycleState ? (
        <Pressable
          onPress={onOpenTripLogbook}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: colors.surface2,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginTop: 10,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 6,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="repeat" size={16} color={colors.primaryLight} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: "800", color: colors.text }}>
                  Trip #{tripCycleState.activeTrip.tripNumber}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "800",
                    color: colors.primaryLight,
                    textTransform: "uppercase",
                    letterSpacing: 0.3,
                  }}
                >
                  {tripCycleState.activeTrip.direction === "SOUTHBOUND" ? "SB (to Meyc)" : "NB (to Clmp)"}
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
                {currentTripStats.paxCount} pax · ₱{currentTripStats.revenue.toFixed(0)} ({currentTripStats.durationMinutes}m elapsed)
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: "800", color: colors.primaryLight, textTransform: "uppercase", letterSpacing: 0.4 }}>
              Logbook
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.muted} />
          </View>
        </Pressable>
      ) : null}

      {/* Terminal Headway Timer */}
      {headway.phase === "WAITING" ? (
        <View
          style={{
            backgroundColor: colors.surface2,
            borderWidth: 1,
            borderColor: isLofi ? colors.warning : "rgba(245, 158, 11, 0.3)",
            borderRadius: 8,
            padding: 12,
            marginTop: 10,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="time-outline" size={18} color={isLofi ? "#D97706" : "#FBBF24"} />
              <Text style={{ fontSize: 12, fontWeight: "800", color: colors.text, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Terminal Wait
              </Text>
            </View>
            <Text style={{ fontSize: 20, fontWeight: "900", color: isLofi ? "#D97706" : "#FBBF24", fontVariant: ["tabular-nums"] }}>
              {formatCountdown(headway.remainingSeconds)}
            </Text>
          </View>
          {/* Progress bar */}
          <View style={{ height: 4, backgroundColor: isLofi ? colors.border : "rgba(255,255,255,0.08)", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: isLofi ? "#D97706" : "#FBBF24", width: `${Math.round(headwayProgress(headway) * 100)}%` }} />
          </View>
          <Text style={{ fontSize: 11, color: colors.muted, marginTop: 6 }}>
            Hold at terminal · Auto-starts when vehicle begins moving
          </Text>
          {/* Early departure button */}
          <Pressable
            onPress={onStartNextTrip}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 6,
              paddingVertical: 8,
              marginTop: 10,
            }}
          >
            <Ionicons name="play" size={14} color={colors.text} />
            <Text style={{ fontSize: 11, fontWeight: "700", color: colors.text }}>
              Start Trip Early
            </Text>
          </Pressable>
        </View>
      ) : headway.phase === "READY" ? (
        <View
          style={{
            backgroundColor: colors.surface2,
            borderWidth: 1,
            borderColor: isLofi ? colors.success : "rgba(16, 185, 129, 0.4)",
            borderRadius: 8,
            padding: 12,
            marginTop: 10,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Ionicons name="checkmark-circle" size={18} color={isLofi ? colors.success : "#34D399"} />
            <Text style={{ fontSize: 13, fontWeight: "800", color: isLofi ? colors.success : "#34D399", textTransform: "uppercase", letterSpacing: 0.4 }}>
              Ready to Depart
            </Text>
          </View>
          <SlideToConfirm
            label="Slide to start next trip"
            onComplete={onStartNextTrip}
          />
          <Text style={{ fontSize: 10, color: colors.muted, marginTop: 6, textAlign: "center" }}>
            Or drive to auto-start at 8+ km/h
          </Text>
        </View>
      ) : null}

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
