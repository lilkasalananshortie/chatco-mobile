import React, { useMemo } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import { appHaptics } from "../../core/utils/haptics";
import type { Transaction } from "../../core/domain/types";
import {
  computeTripStats,
  type TripCycleState,
  type TripRecord,
} from "../../core/utils/trip-cycle-tracker";
import { createTripLogbookStyles } from "./trip-logbook-styles";

interface TripLogbookModalProps {
  visible: boolean;
  onClose: () => void;
  state: TripCycleState;
  transactions: Transaction[];
  onAdvanceTrip: () => void;
  onSwitchDirection: () => void;
  onUndoTurnaround: () => void;
}

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

export function TripLogbookModal({
  visible,
  onClose,
  state,
  transactions,
  onAdvanceTrip,
  onSwitchDirection,
  onUndoTurnaround,
}: TripLogbookModalProps) {
  const { colors, isLofi, styles } = useAppTheme();

  const activeStats = useMemo(
    () => computeTripStats(state.activeTrip, transactions),
    [state.activeTrip, transactions]
  );

  const completedTripsWithStats = useMemo(() => {
    return state.completedTrips.map(trip => ({
      trip,
      stats: computeTripStats(trip, transactions),
    }));
  }, [state.completedTrips, transactions]);

  const summary = useMemo(() => {
    const totalTripsCompleted = state.completedTrips.length;
    const fullRounds = Math.floor(totalTripsCompleted / 2);
    const halfRounds = totalTripsCompleted % 2;
    const roundText =
      fullRounds > 0
        ? `${fullRounds} full ikot${halfRounds ? " + 1 half" : ""}`
        : `${totalTripsCompleted} half-trip${totalTripsCompleted === 1 ? "" : "s"}`;

    const totalRevenue = completedTripsWithStats.reduce((sum, item) => sum + item.stats.revenue, 0) + activeStats.revenue;
    const totalPax = completedTripsWithStats.reduce((sum, item) => sum + item.stats.paxCount, 0) + activeStats.paxCount;
    const totalTripsCount = totalTripsCompleted + 1;
    const avgPaxPerTrip = Math.round((totalPax / totalTripsCount) * 10) / 10;
    const avgRevPerTrip = Math.round(totalRevenue / totalTripsCount);

    return {
      totalTripsCompleted,
      roundText,
      totalRevenue,
      totalPax,
      avgPaxPerTrip,
      avgRevPerTrip,
    };
  }, [state.completedTrips.length, completedTripsWithStats, activeStats]);

  const modalStyles = useMemo(() => createTripLogbookStyles(colors, isLofi), [colors, isLofi]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          {/* Header */}
          <View style={modalStyles.headerRow}>
            <View>
              <Text style={modalStyles.title}>Trip Cycle Logbook</Text>
              <Text style={modalStyles.subtitle}>Automated Terminal Turnaround & "Ikot" Tracker</Text>
            </View>
            <Pressable
              onPress={() => {
                appHaptics.selection();
                onClose();
              }}
              style={modalStyles.closeButton}
            >
              <Ionicons name="close" size={18} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Top Shift Trip Summary Grid */}
            <View style={modalStyles.summaryGrid}>
              <View style={modalStyles.summaryCard}>
                <Text style={modalStyles.summaryCardLabel}>Shift Cycles</Text>
                <Text style={modalStyles.summaryCardValue}>
                  {state.currentTripNumber} {state.currentTripNumber === 1 ? "Trip" : "Trips"}
                </Text>
                <Text style={modalStyles.summaryCardSub}>{summary.roundText}</Text>
              </View>
              <View style={modalStyles.summaryCard}>
                <Text style={modalStyles.summaryCardLabel}>Avg Pax / Trip</Text>
                <Text style={modalStyles.summaryCardValue}>{summary.avgPaxPerTrip} pax</Text>
                <Text style={modalStyles.summaryCardSub}>Total: {summary.totalPax} pax</Text>
              </View>
              <View style={modalStyles.summaryCard}>
                <Text style={modalStyles.summaryCardLabel}>Avg Rev / Trip</Text>
                <Text style={modalStyles.summaryCardValue}>₱{summary.avgRevPerTrip}</Text>
                <Text style={modalStyles.summaryCardSub}>Shift ₱{summary.totalRevenue.toFixed(0)}</Text>
              </View>
            </View>

            {/* Active Trip Card */}
            <View style={modalStyles.activeTripBox}>
              <View style={modalStyles.activeTripHeader}>
                <View style={modalStyles.activeBadge}>
                  <Ionicons
                    name="radio-button-on"
                    size={12}
                    color={isLofi ? "#FFFFFF" : "#34D399"}
                  />
                  <Text style={modalStyles.activeBadgeText}>
                    Trip #{state.activeTrip.tripNumber} · Active
                  </Text>
                </View>
                <Text style={modalStyles.durationBadge}>
                  Started {formatTime(state.activeTrip.startedAt)} ({activeStats.durationMinutes}m ago)
                </Text>
              </View>

              <View style={modalStyles.routeDirectionRow}>
                <Ionicons
                  name={state.activeTrip.direction === "SOUTHBOUND" ? "arrow-down-circle" : "arrow-up-circle"}
                  size={18}
                  color={isLofi ? colors.primary : "#62A0EA"}
                />
                <Text style={modalStyles.routeDirectionText}>
                  {state.activeTrip.direction === "SOUTHBOUND"
                    ? "Southbound: Calumpit → Meycauayan"
                    : "Northbound: Meycauayan → Calumpit"}
                </Text>
              </View>

              <View style={modalStyles.statsRow}>
                <View style={modalStyles.statItem}>
                  <Text style={modalStyles.statItemLabel}>Passengers</Text>
                  <Text style={modalStyles.statItemValue}>{activeStats.paxCount} pax</Text>
                </View>
                <View style={modalStyles.statItem}>
                  <Text style={modalStyles.statItemLabel}>Cash</Text>
                  <Text style={modalStyles.statItemValue}>₱{activeStats.cashAmount.toFixed(0)}</Text>
                </View>
                <View style={modalStyles.statItem}>
                  <Text style={modalStyles.statItemLabel}>GCash</Text>
                  <Text style={modalStyles.statItemValue}>₱{activeStats.gcashAmount.toFixed(0)}</Text>
                </View>
                <View style={modalStyles.statItem}>
                  <Text style={modalStyles.statItemLabel}>Trip Total</Text>
                  <Text style={[modalStyles.statItemValue, { color: isLofi ? colors.success : "#34D399" }]}>
                    ₱{activeStats.revenue.toFixed(0)}
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={modalStyles.buttonRow}>
                <Pressable
                  onPress={() => {
                    appHaptics.success();
                    onAdvanceTrip();
                  }}
                  style={modalStyles.advanceButton}
                >
                  <Ionicons name="flag-outline" size={16} color="#FFFFFF" />
                  <Text style={modalStyles.advanceButtonText}>
                    Turnaround (Start #{state.currentTripNumber + 1})
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    appHaptics.medium();
                    onSwitchDirection();
                  }}
                  style={modalStyles.switchButton}
                >
                  <Ionicons name="swap-vertical" size={14} color={colors.text} />
                  <Text style={modalStyles.switchButtonText}>Flip Dir</Text>
                </Pressable>
              </View>
            </View>

            {/* Completed Trips History */}
            <Text style={modalStyles.historySectionTitle}>
              Completed Trips ({state.completedTrips.length})
            </Text>

            {completedTripsWithStats.length === 0 ? (
              <View style={modalStyles.emptyBox}>
                <Ionicons name="map-outline" size={32} color={colors.muted} />
                <Text style={modalStyles.emptyText}>
                  No completed trips yet for this shift. When you reach the opposite terminal and turnaround, each trip will appear here.
                </Text>
              </View>
            ) : (
              completedTripsWithStats.map(({ trip, stats }) => (
                <View key={trip.tripId} style={modalStyles.historyCard}>
                  <View style={modalStyles.historyCardTop}>
                    <Text style={modalStyles.historyTripNum}>
                      Trip #{trip.tripNumber} ({trip.direction === "SOUTHBOUND" ? "Southbound" : "Northbound"})
                    </Text>
                    <Text style={modalStyles.historyDuration}>
                      {formatTime(trip.startedAt)} – {formatTime(trip.completedAt || "")} ({stats.durationMinutes}m)
                    </Text>
                  </View>
                  <Text style={modalStyles.historyRoute}>
                    {trip.originTerminal} → {trip.destinationTerminal}
                  </Text>
                  <View style={modalStyles.historyBreakdownRow}>
                    <Text style={modalStyles.historyPaxBadge}>
                      👥 {stats.paxCount} passengers
                    </Text>
                    <Text style={modalStyles.historyRevBadge}>
                      ₱{stats.revenue.toFixed(2)} (₱{stats.cashAmount.toFixed(0)} Cash · ₱{stats.gcashAmount.toFixed(0)} GCash)
                    </Text>
                  </View>
                </View>
              ))
            )}

            {/* Undo Last Turnaround Option */}
            {state.completedTrips.length > 0 ? (
              <View style={modalStyles.undoRow}>
                <Pressable
                  onPress={() => {
                    appHaptics.selection();
                    onUndoTurnaround();
                  }}
                >
                  <Text style={modalStyles.undoButtonText}>
                    Undo last turnaround (Resume Trip #{state.completedTrips[0]?.tripNumber})
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
