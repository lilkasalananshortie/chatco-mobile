import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState, Linking, Platform, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import Constants from "expo-constants";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeepAwake } from "expo-keep-awake";
import { Text } from "../../shared/ui/BrandText";
import { api } from "../../core/api/chatco-api";
import type { Shift } from "../../core/domain/types";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import { ModalShell } from "../../shared/ui";
import { SosConfirmModal } from "../../shared/ui/SosConfirmModal";
import { TransactionHistoryModal } from "./TransactionHistoryModal";
import { createDashStyles } from "./dashboard-styles";
import { useDashboardShift } from "./hooks/useDashboardShift";
import { useShiftGps } from "./ShiftGpsProvider";
import { DeviceOwnershipBanner } from "./components/DeviceOwnershipBanner";
import { DashboardHeaderCard } from "./components/DashboardHeaderCard";
import { LiveMap } from "./LiveMap";
import { BreakConfirmModal } from "./components/BreakConfirmModal";
import { completeAndAdvanceTrip, loadTripCycleState, saveTripCycleState, switchActiveTripDirection, undoLastTurnaround, type TripCycleState } from "../../core/utils/trip-cycle-tracker";
import { audioCues } from "../../core/utils/audio-cues";
import { TripLogbookModal } from "./TripLogbookModal";
import { RouteAdvisoryBanners } from "./components/RouteAdvisoryBanners";
import { IncidentReportModal } from "./components/IncidentReportModal";

export function DashboardScreen({ shift, refreshKey, canOperate, isOnline, onShiftUpdated, onShiftEnded }: {
  shift: Shift; refreshKey: number; canOperate: boolean; isOnline: boolean;
  onShiftUpdated?: (shift: Shift) => void; onShiftEnded?: () => void;
}) {
  const { colors, styles, isLofi } = useAppTheme();
  const safeInsets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [dashboardHeight, setDashboardHeight] = useState(0);
  const bottomNavigationHeight = 64 + safeInsets.bottom;
  const availableHeight = windowHeight - safeInsets.top;
  const dashboardMaxHeight = Math.max(90, Math.min(availableHeight * 0.75, availableHeight - bottomNavigationHeight - 160));
  const usesWebMapFallback = Platform.OS === "android" && Constants.expoConfig?.extra?.googleMapsConfigured !== true;
  useKeepAwake();
  const dashStyles = useMemo(() => createDashStyles(colors, isLofi), [colors, isLofi]);
  const [history, setHistory] = useState(false);
  const [actions, setActions] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);
  const [sos, setSos] = useState(false);
  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const [tripModalOpen, setTripModalOpen] = useState(false);
  const [tripCycleState, setTripCycleState] = useState<TripCycleState | null>(null);
  const tripCycleStateRef = useRef<TripCycleState | null>(null);
  const shiftData = useDashboardShift({ shift, refreshKey, canOperate, isOnline, onShiftUpdated, onShiftEnded });
  const gpsData = useShiftGps();

  useEffect(() => {
    let active = true, running = false;
    const load = async () => {
      if (running || AppState.currentState !== "active") return;
      running = true;
      try { const profile = await api.profile(); if (active) setProfilePictureUrl(profile.profilePictureUrl ?? null); }
      catch { /* Retain the last confirmed photo during an outage. */ }
      finally { running = false; }
    };
    void load();
    const timer = setInterval(() => void load(), 30000);
    const listener = AppState.addEventListener("change", state => { if (state === "active") void load(); });
    return () => { active = false; clearInterval(timer); listener.remove(); };
  }, [shift.shiftId]);

  useEffect(() => { tripCycleStateRef.current = tripCycleState; }, [tripCycleState]);
  useEffect(() => {
    let active = true;
    void loadTripCycleState(shift.shiftId, shift.timeIn).then(state => {
      if (active) { setTripCycleState(state); tripCycleStateRef.current = state; }
    });
    return () => { active = false; };
  }, [shift.shiftId, shift.timeIn]);

  const handleAdvanceTrip = useCallback(async () => {
    if (!tripCycleStateRef.current) return;
    audioCues.playDutySound();
    const next = completeAndAdvanceTrip(tripCycleStateRef.current, shiftData.transactions);
    setTripCycleState(next); tripCycleStateRef.current = next; await saveTripCycleState(next);
  }, [shiftData.transactions]);
  const handleSwitchDirection = useCallback(async () => {
    if (!tripCycleStateRef.current) return;
    audioCues.playDutySound();
    const next = switchActiveTripDirection(tripCycleStateRef.current);
    setTripCycleState(next); tripCycleStateRef.current = next; await saveTripCycleState(next);
  }, []);
  const handleUndoTurnaround = useCallback(async () => {
    if (!tripCycleStateRef.current) return;
    const next = undoLastTurnaround(tripCycleStateRef.current);
    setTripCycleState(next); tripCycleStateRef.current = next; await saveTripCycleState(next);
  }, []);
  const combinedError = shiftData.error || gpsData.gpsError;
  const openAction = (action: () => void) => { setActions(false); action(); };
  const dashboardContent = <ScrollView bounces={false} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={usesWebMapFallback ? { maxHeight: dashboardMaxHeight, flexGrow: 0, flexShrink: 1 } : undefined}>
    {!isOnline ? <View accessibilityRole="alert" style={{ backgroundColor: isLofi ? "#FEF3C7" : "#451A03", borderBottomWidth: 1, borderColor: isLofi ? "#FDE68A" : "rgba(251,191,36,0.3)", paddingHorizontal: 16, paddingVertical: 8 }}>
      <Text style={{ color: isLofi ? "#78350F" : "#FEF3C7", textAlign: "center", fontSize: 12, fontWeight: "500", lineHeight: 18 }}>Offline mode: cash fares are saved on this device and will sync when the connection returns. GCash is unavailable.</Text>
    </View> : null}
    {shiftData.syncState === "syncing" ? <View style={{ backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 8 }}><Text style={{ color: colors.text, fontSize: 12 }}>Syncing offline transactions…</Text></View> : null}
    <DeviceOwnershipBanner shift={shift} isOperatingDevice={shiftData.isOperatingDevice} canOperate={canOperate} ownsShift={shiftData.ownsShift} unclaimed={shiftData.unclaimed} recoveredByAdmin={shiftData.recoveredByAdmin} deviceBusy={shiftData.deviceBusy} deviceError={shiftData.deviceError} claimDevice={shiftData.claimDevice} releaseDevice={shiftData.releaseDevice} />
    {Platform.OS !== "web" && !usesWebMapFallback && shiftData.hails.length ? <View style={{ marginHorizontal: 12, marginTop: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: isLofi ? "#E5E7EB" : "rgba(255,255,255,0.1)", backgroundColor: isLofi ? "rgba(255,255,255,0.97)" : "rgba(7,26,46,0.97)", gap: 8 }}>
      <Text style={{ color: isLofi ? "#374151" : "rgba(255,255,255,0.55)", fontSize: 10, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" }}>Passenger requests</Text>
      {shiftData.hails.map(hail => <View key={hail.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: isLofi ? "#111827" : "#FFFFFF", fontSize: 12, fontWeight: "600" }}>{hail.commuterName}</Text>
          <Text numberOfLines={1} style={{ color: isLofi ? "#6B7280" : "rgba(255,255,255,0.45)", fontSize: 10, marginTop: 2 }}>{hail.label || "Passenger waiting"}{hail.etaMinutes ? ` · ${hail.etaMinutes} min away` : ""}</Text>
        </View>
        <Pressable accessibilityRole="button" disabled={!canOperate} onPress={() => void shiftData.handleHail(hail.id, "reject")} style={{ minHeight: 34, paddingHorizontal: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: isLofi ? "#D1D5DB" : "rgba(255,255,255,0.15)", borderRadius: 8, opacity: canOperate ? 1 : 0.5 }}><Text style={{ color: isLofi ? "#374151" : "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: "600" }}>Reject</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={!canOperate} onPress={() => void shiftData.handleHail(hail.id, "accept")} style={{ minHeight: 34, paddingHorizontal: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#1A5FB4", borderRadius: 8, opacity: canOperate ? 1 : 0.5 }}><Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "700" }}>Accept</Text></Pressable>
      </View>)}
    </View> : null}
    <DashboardHeaderCard
      profilePictureUrl={profilePictureUrl} shift={shift} dashStyles={dashStyles} colors={colors} isLofi={isLofi}
      canOperate={canOperate} isOnBreak={shiftData.isOnBreak} breakPending={shiftData.breakPending}
      onOpenBreakConfirm={() => shiftData.setBreakConfirmOpen(true)}
      capacity={shiftData.capacity} onUpdateCapacity={value => void shiftData.updateCapacity(value)}
      onOpenHistory={() => setHistory(true)} onOpenActions={() => setActions(true)}
      totals={shiftData.totals} pendingOfflineCount={shiftData.pendingOfflineCount}
    />
    <RouteAdvisoryBanners currentSpeedKmh={gpsData.currentSpeedKmh} isOverspeeding={gpsData.isOverspeeding} corridorDeviationMeters={gpsData.corridorDeviationMeters} thermalState={{ enabled: false }} approachingStop={null} />
  </ScrollView>;

  return <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.background }}>
    <View style={{ flex: 1, paddingBottom: usesWebMapFallback ? 64 + safeInsets.bottom : 0 }}>
      {usesWebMapFallback ? <>
        {dashboardContent}
        <View style={{ flex: 1, minHeight: 120, position: "relative" }}>
          <LiveMap fill latitude={gpsData.position?.latitude} longitude={gpsData.position?.longitude} hails={shiftData.hails} unitNumber={shift.unitNumber} routeCoordinates={gpsData.routeCoordinates} routeSource={gpsData.routeSource} capacity={shiftData.capacity} isOnBreak={shiftData.isOnBreak} canOperate={canOperate} onHail={(id, action) => shiftData.handleHail(id, action)} />
        </View>
      </> : <>
        <LiveMap fill latitude={gpsData.position?.latitude} longitude={gpsData.position?.longitude} hails={shiftData.hails} unitNumber={shift.unitNumber} routeCoordinates={gpsData.routeCoordinates} routeSource={gpsData.routeSource} viewportInsets={{ top: dashboardHeight, bottom: bottomNavigationHeight }} capacity={shiftData.capacity} isOnBreak={shiftData.isOnBreak} canOperate={canOperate} onHail={(id, action) => shiftData.handleHail(id, action)} />
        <View renderToHardwareTextureAndroid onLayout={event => setDashboardHeight(event.nativeEvent.layout.height)} style={{ pointerEvents: "box-none", position: "absolute", top: 0, left: 0, right: 0, maxHeight: dashboardMaxHeight, zIndex: 10, elevation: 10 }}>
          {dashboardContent}
        </View>
      </>}
      {combinedError ? <View accessibilityRole="alert" style={{ position: "absolute", bottom: bottomNavigationHeight + 16, left: 16, right: 16, padding: 12, borderRadius: 8, backgroundColor: isLofi ? "#FEF2F2" : "#450A0A", zIndex: 15 }}><Text style={{ color: isLofi ? "#B91C1C" : "#FECACA", fontSize: 12 }}>{combinedError}</Text></View> : null}
    </View>

    <ModalShell visible={actions} title="Conductor actions" onClose={() => setActions(false)}>
      <Text style={styles.subtitle}>Unit {shift.unitNumber} · {shift.conductorName}</Text>
      <Pressable onPress={() => openAction(() => setSos(true))} style={[styles.button, { backgroundColor: "#B91C1C" }]}><Text style={styles.buttonText}>Emergency SOS</Text></Pressable>
      <Pressable onPress={() => openAction(() => setIncidentModalOpen(true))} style={[styles.button, styles.secondaryButton]}><Text style={[styles.buttonText, styles.secondaryButtonText]}>Log Incident</Text></Pressable>
      <Pressable onPress={() => openAction(() => setTripModalOpen(true))} style={[styles.button, styles.secondaryButton]}><Text style={[styles.buttonText, styles.secondaryButtonText]}>Trip Logbook</Text></Pressable>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Vehicle location</Text>
        <Text style={styles.subtitle}>{gpsData.permissionStatus === "inactive" ? "Tracking paused or awaiting location acknowledgement." : gpsData.lastUploadAt ? `Last foreground upload accepted: ${new Date(gpsData.lastUploadAt).toLocaleTimeString()}` : "No successful foreground upload confirmed for this tracking session yet."}</Text>
        {gpsData.backgroundWarning ? <Text style={[styles.subtitle, { color: colors.warning }]}>{gpsData.backgroundWarning}</Text> : null}
        <Pressable onPress={gpsData.retryTracking} style={[styles.button, styles.secondaryButton]}><Text style={[styles.buttonText, styles.secondaryButtonText]}>Retry tracking</Text></Pressable>
        <Pressable onPress={() => void Linking.openSettings().catch(() => Alert.alert("Open device Settings", "Open ChatCo's permissions in device Settings to manage location access."))} style={[styles.button, styles.secondaryButton]}><Text style={[styles.buttonText, styles.secondaryButtonText]}>Device permissions</Text></Pressable>
      </View>
    </ModalShell>
    <TransactionHistoryModal visible={history} shiftId={shift.shiftId} transactions={shiftData.transactions} tripCycleState={tripCycleState} onClose={() => setHistory(false)} />
    {shiftData.breakConfirmOpen ? <BreakConfirmModal visible isOnBreak={shiftData.isOnBreak} breakPending={shiftData.breakPending} error={shiftData.error} onClose={() => shiftData.setBreakConfirmOpen(false)} onConfirm={shiftData.updateBreak} /> : null}
    <SosConfirmModal isOpen={sos} onClose={() => setSos(false)} />
    <IncidentReportModal visible={incidentModalOpen} onClose={() => setIncidentModalOpen(false)} unitNumber={shift.unitNumber} shiftId={shift.shiftId} />
    {tripCycleState ? <TripLogbookModal visible={tripModalOpen} onClose={() => setTripModalOpen(false)} state={tripCycleState} transactions={shiftData.transactions} onAdvanceTrip={() => void handleAdvanceTrip()} onSwitchDirection={() => void handleSwitchDirection()} onUndoTurnaround={() => void handleUndoTurnaround()} /> : null}
  </SafeAreaView>;
}
