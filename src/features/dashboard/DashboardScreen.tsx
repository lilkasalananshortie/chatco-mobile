import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState, Linking, Pressable, Text, View } from "react-native";
import { api } from "../../core/api/chatco-api";
import { useKeepAwake } from "expo-keep-awake";
import { Ionicons } from "@expo/vector-icons";
import type { Shift } from "../../core/domain/types";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import { Header, ScreenShell } from "../../shared/ui";
import { SosConfirmModal } from "../../shared/ui/SosConfirmModal";
import { TransactionHistoryModal } from "./TransactionHistoryModal";
import { createDashStyles } from "./dashboard-styles";
import { useDashboardShift } from "./hooks/useDashboardShift";
import { useShiftGps } from "./ShiftGpsProvider";
import { DeviceOwnershipBanner } from "./components/DeviceOwnershipBanner";
import { DashboardHeaderCard } from "./components/DashboardHeaderCard";
import { RouteMapSection } from "./components/RouteMapSection";
import { BreakConfirmModal } from "./components/BreakConfirmModal";
import {
  completeAndAdvanceTrip,
  computeTripStats,
  loadTripCycleState,
  saveTripCycleState,
  switchActiveTripDirection,
  undoLastTurnaround,
  type TripCycleState,
} from "../../core/utils/trip-cycle-tracker";
import { audioCues } from "../../core/utils/audio-cues";
import { appHaptics } from "../../core/utils/haptics";
import { TripLogbookModal } from "./TripLogbookModal";
import { RouteAdvisoryBanners } from "./components/RouteAdvisoryBanners";
import { IncidentReportModal } from "./components/IncidentReportModal";

export function DashboardScreen({
  shift,
  refreshKey,
  canOperate,
  isOnline,
  onShiftUpdated,
  onShiftEnded,
}: {
  shift: Shift;
  refreshKey: number;
  canOperate: boolean;
  isOnline: boolean;
  onShiftUpdated?: (shift: Shift) => void;
  onShiftEnded?: () => void;
}) {
  const { colors, styles, isLofi } = useAppTheme();
  useKeepAwake();
  const dashStyles = useMemo(() => createDashStyles(colors, isLofi), [colors, isLofi]);

  const [history, setHistory] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true, running = false;
    const load = async () => {
      if (running || AppState.currentState !== "active") return;
      running = true;
      try { const profile = await api.profile(); if (active) setProfilePictureUrl(profile.profilePictureUrl ?? null); }
      catch { /* Keep the last confirmed avatar during a network outage. */ }
      finally { running = false; }
    };
    void load();
    const timer = setInterval(() => void load(), 30000);
    const listener = AppState.addEventListener("change", state => { if (state === "active") void load(); });
    return () => { active = false; clearInterval(timer); listener.remove(); };
  }, [shift.shiftId]);
  const [sos, setSos] = useState(false);
  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const [tripModalOpen, setTripModalOpen] = useState(false);
  const [tripCycleState, setTripCycleState] = useState<TripCycleState | null>(null);
  const tripCycleStateRef = useRef<TripCycleState | null>(null);

  const shiftData = useDashboardShift({
    shift,
    refreshKey,
    canOperate,
    isOnline,
    onShiftUpdated,
    onShiftEnded,
  });

  const gpsData = useShiftGps();

  useEffect(() => {
    tripCycleStateRef.current = tripCycleState;
  }, [tripCycleState]);

  useEffect(() => {
    if (shift?.shiftId) {
      void loadTripCycleState(shift.shiftId, shift.timeIn).then((state) => {
        setTripCycleState(state);
        tripCycleStateRef.current = state;
      });
    }
  }, [shift?.shiftId, shift?.timeIn]);

  const handleAdvanceTrip = useCallback(async () => {
    if (!tripCycleStateRef.current) return;
    audioCues.playDutySound();
    const nextState = completeAndAdvanceTrip(tripCycleStateRef.current, shiftData.transactions);
    setTripCycleState(nextState);
    tripCycleStateRef.current = nextState;
    await saveTripCycleState(nextState);
  }, [shiftData.transactions]);

  const handleSwitchDirection = useCallback(async () => {
    if (!tripCycleStateRef.current) return;
    audioCues.playDutySound();
    const nextState = switchActiveTripDirection(tripCycleStateRef.current);
    setTripCycleState(nextState);
    tripCycleStateRef.current = nextState;
    await saveTripCycleState(nextState);
  }, []);

  const handleUndoTurnaround = useCallback(async () => {
    if (!tripCycleStateRef.current) return;
    const nextState = undoLastTurnaround(tripCycleStateRef.current);
    setTripCycleState(nextState);
    tripCycleStateRef.current = nextState;
    await saveTripCycleState(nextState);
  }, []);

  const currentTripStats = useMemo(() => {
    if (!tripCycleState) {
      return { paxCount: 0, revenue: 0, durationMinutes: 1, cashAmount: 0, gcashAmount: 0 };
    }
    return computeTripStats(tripCycleState.activeTrip, shiftData.transactions);
  }, [tripCycleState, shiftData.transactions]);

  const combinedError = shiftData.error || gpsData.gpsError;

  return (
    <ScreenShell>
      <Header
        title={`Unit ${shift.unitNumber}`}
        subtitle={`${shift.route || "Active route"} · ${shift.driverName}`}
        eyebrow="Conductor Dashboard"
      />

      {/* Sync Status Banner */}
      {shiftData.syncState === "syncing" ? (
        <View
          style={[
            dashStyles.syncBar,
            {
              backgroundColor: isLofi ? "#FEF3C7" : "rgba(245, 158, 11, 0.1)",
              borderColor: isLofi ? colors.warning : "rgba(245, 158, 11, 0.3)",
            },
          ]}
        >
          <Ionicons name="sync" size={14} color={isLofi ? colors.warning : "#FBBF24"} />
          <Text style={[dashStyles.syncBarText, { color: isLofi ? "#92400E" : "#FDE68A" }]}>
            Syncing offline transactions with cloud…
          </Text>
        </View>
      ) : null}

      {/* Live sync pill */}
      {isOnline ? (
        <View
          style={[
            dashStyles.liveSyncPill,
            {
              backgroundColor: isLofi ? colors.surface2 : "rgba(22, 112, 90, 0.15)",
              borderColor: isLofi ? colors.success : "rgba(52, 211, 153, 0.3)",
            },
          ]}
        >
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: isLofi ? colors.success : "#34D399",
            }}
          />
          <Text
            style={{
              color: isLofi ? colors.success : "#34D399",
              fontSize: 10,
              fontWeight: "700",
              textTransform: "uppercase",
            }}
          >
            Internet connected
          </Text>
        </View>
      ) : (
        <View style={dashStyles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color={isLofi ? colors.warning : "#FBBF24"} />
          <Text style={dashStyles.offlineBannerText}>
            You are offline. Cash transactions are saved on this device for synchronization. Vehicle location may not reach Admin or commuters until you reconnect.
          </Text>
        </View>
      )}

      <View style={{ padding: 16, marginVertical: 12, gap: 8, borderRadius: 14, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }}>
        <Text accessibilityRole="header" style={{ color: colors.text, fontWeight: "700" }}>Vehicle location</Text>
        <Text style={{ color: colors.muted }}>{gpsData.permissionStatus === "inactive" ? "Tracking paused or awaiting location acknowledgement." : gpsData.lastUploadAt ? `Last foreground upload accepted: ${new Date(gpsData.lastUploadAt).toLocaleTimeString()}` : "No successful foreground upload confirmed for this tracking session yet."}</Text>
        {gpsData.backgroundWarning ? <Text style={{ color: colors.warning }}>{gpsData.backgroundWarning}</Text> : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
          <Pressable accessibilityRole="button" onPress={gpsData.retryTracking} style={{ minHeight: 48, justifyContent: "center" }}><Text style={{ color: colors.primaryLight }}>Retry tracking</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings().catch(() => Alert.alert("Open device Settings", "Open ChatCo's permissions in device Settings to manage location access."))} style={{ minHeight: 48, justifyContent: "center" }}><Text style={{ color: colors.primaryLight }}>Device permissions</Text></Pressable>
        </View>
      </View>

      {/* Device Ownership / Multi-Device Handoff Banner */}
      <DeviceOwnershipBanner
        shift={shift}
        isOperatingDevice={shiftData.isOperatingDevice}
        canOperate={canOperate}
        ownsShift={shiftData.ownsShift}
        unclaimed={shiftData.unclaimed}
        recoveredByAdmin={shiftData.recoveredByAdmin}
        deviceBusy={shiftData.deviceBusy}
        deviceError={shiftData.deviceError}
        claimDevice={shiftData.claimDevice}
        releaseDevice={shiftData.releaseDevice}
      />

      {/* Route Advisory Banners (Corridor Deviation & Speed Warning) */}
      <RouteAdvisoryBanners
        currentSpeedKmh={gpsData.currentSpeedKmh}
        isOverspeeding={gpsData.isOverspeeding}
        corridorDeviationMeters={gpsData.corridorDeviationMeters}
        thermalState={{ enabled: false }}
        approachingStop={null}
      />

      {/* Conductor Mobile Dashboard Header Card */}
      <DashboardHeaderCard
        profilePictureUrl={profilePictureUrl}
        shift={shift}
        dashStyles={dashStyles}
        colors={colors}
        isLofi={isLofi}
        canOperate={canOperate}
        isOnBreak={shiftData.isOnBreak}
        breakPending={shiftData.breakPending}
        onOpenBreakConfirm={() => shiftData.setBreakConfirmOpen(true)}
        capacity={shiftData.capacity}
        onUpdateCapacity={(cap) => void shiftData.updateCapacity(cap)}
        onOpenHistory={() => setHistory(true)}
        totals={shiftData.totals}
        transactionTotals={shiftData.transactionTotals}
        pendingOfflineCount={shiftData.pendingOfflineCount}
        tripCycleState={tripCycleState}
        currentTripStats={currentTripStats}
        onOpenTripLogbook={() => {
          appHaptics.selection();
          setTripModalOpen(true);
        }}
      />

      {/* Route Map and Pickup Hails */}
      <RouteMapSection
        shift={shift}
        canOperate={canOperate}
        announcements={shiftData.announcements}
        onMarkAnnouncementRead={shiftData.handleMarkAnnouncementRead}
        mapEnabled={gpsData.mapEnabled}
        setMapEnabled={gpsData.setMapEnabled}
        position={gpsData.position}
        hails={shiftData.hails}
        routeCoordinates={gpsData.routeCoordinates}
        routeSource={gpsData.routeSource}
        onHail={(id, action) => void shiftData.handleHail(id, action)}
      />

      {combinedError ? <Text style={styles.error}>{combinedError}</Text> : null}

      {/* Emergency & Incident Action Row */}
      <View style={{ flexDirection: "row", gap: 10, marginVertical: 8 }}>
        <Pressable onPress={() => setSos(true)} style={[dashStyles.sosTriggerButton, { flex: 1, marginVertical: 0 }]}>
          <Ionicons name="warning-outline" size={18} color={colors.danger} />
          <Text style={dashStyles.sosTriggerText}>Emergency SOS</Text>
        </Pressable>

        <Pressable
          onPress={() => setIncidentModalOpen(true)}
          style={[
            dashStyles.sosTriggerButton,
            {
              flex: 1,
              marginVertical: 0,
              backgroundColor: isLofi ? colors.surface : "#1E293B",
              borderColor: isLofi ? colors.border : "#334155",
            },
          ]}
        >
          <Ionicons name="construct-outline" size={18} color={isLofi ? colors.warning : "#F59E0B"} />
          <Text style={[dashStyles.sosTriggerText, { color: isLofi ? colors.text : "#E2E8F0" }]}>
            Log Incident
          </Text>
        </Pressable>
      </View>

      {/* Transaction History Modal */}
      <TransactionHistoryModal
        visible={history}
        shiftId={shift.shiftId}
        transactions={shiftData.transactions}
        onClose={() => setHistory(false)}
      />

      {/* Break Confirm Modal */}
      <BreakConfirmModal
        visible={shiftData.breakConfirmOpen}
        isOnBreak={shiftData.isOnBreak}
        breakPending={shiftData.breakPending}
        onClose={() => shiftData.setBreakConfirmOpen(false)}
        onConfirm={async () => {
          if (await shiftData.updateBreak()) {
            shiftData.setBreakConfirmOpen(false);
          }
        }}
      />

      {/* Emergency SOS Modal */}
      <SosConfirmModal isOpen={sos} onClose={() => setSos(false)} />

      {/* Incident Report Modal (Vehicle Breakdown / Accident) */}
      <IncidentReportModal
        visible={incidentModalOpen}
        onClose={() => setIncidentModalOpen(false)}
        unitNumber={shift.unitNumber}
        shiftId={shift.shiftId}
      />

      {/* Trip Turnaround Logbook Modal ("Ikot" Tracker) */}
      {tripCycleState ? (
        <TripLogbookModal
          visible={tripModalOpen}
          onClose={() => setTripModalOpen(false)}
          state={tripCycleState}
          transactions={shiftData.transactions}
          onAdvanceTrip={() => void handleAdvanceTrip()}
          onSwitchDirection={() => void handleSwitchDirection()}
          onUndoTurnaround={() => void handleUndoTurnaround()}
        />
      ) : null}
    </ScreenShell>
  );
}
