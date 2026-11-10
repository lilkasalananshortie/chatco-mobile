import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, Image, Pressable, ScrollView, View } from "react-native";
import { Text } from "../../shared/ui/BrandText";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../core/api/chatco-api";
import type { Driver, Remittance, Shift, Unit } from "../../core/domain/types";
import { readShiftAccess } from "../../core/api/shift-access";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import { Header, Loading, ScreenShell } from "../../shared/ui";
import { AssignmentCard } from "./components/AssignmentCard";
import { SelectionFade } from "./components/SelectionFade";
import { OfflineDepotNotice } from "./components/OfflineDepotNotice";
import { ShiftSetupModal } from "./components/ShiftSetupModal";
import { MinibusFrontIcon } from "./components/MinibusFrontIcon";

type Step = "select-unit" | "select-driver";

export function VerificationScreen({
  conductorName = "Conductor",
  onStarted,
  onLogout,
  onViewMetrics,
  onViewSettings,
  onOutstanding,
}: {
  conductorName?: string;
  onStarted: (shift: Shift) => void;
  onLogout?: () => void;
  onViewMetrics?: () => void;
  onViewSettings?: () => void;
  onOutstanding: (record: Remittance) => void;
}) {
  const { colors, styles, isLofi } = useAppTheme();
  const [units, setUnits] = useState<Unit[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [step, setStep] = useState<Step>("select-unit");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectionError, setSelectionError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isOfflineDepot, setIsOfflineDepot] = useState(false);
  const [waiting, setWaiting] = useState<Remittance | null>(null);
  const checking = useRef(false);
  const starting = useRef(false);
  const mounted = useRef(true);
  const callbacks = useRef({ onStarted, onOutstanding });
  callbacks.current = { onStarted, onOutstanding };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await api.logout();
    } catch (cause) {
      Alert.alert("Notice", cause instanceof Error ? cause.message : "Signed out.");
    } finally {
      setLoggingOut(false);
      onLogout?.();
    }
  };

  const load = useCallback(async () => {
    if (checking.current || starting.current) return;
    checking.current = true;
    setLoading(true);
    setLoadError("");
    setShowConfirmModal(false);
    setUnit(null); setDriver(null); setStep("select-unit");
    setWaiting(null); setUnits([]); setDrivers([]);
    try {
      const access = await readShiftAccess();
      if (!mounted.current) return;
      if (access.kind === "active") { callbacks.current.onStarted(access.shift); return; }
      if (access.kind === "unremitted") { callbacks.current.onOutstanding(access.remittance); return; }
      if (access.kind === "waiting") { setWaiting(access.remittance); return; }
      setIsOfflineDepot(false);
      const [availableUnits, availableDrivers] = await Promise.all([
        api.units(),
        api.drivers(),
      ]);
      if (mounted.current) { setUnits(availableUnits); setDrivers(availableDrivers); }
    } catch (cause) {
      if (mounted.current) setLoadError(cause instanceof Error ? cause.message : "Unable to verify remittances. Reconnect and check again.");
    } finally {
      checking.current = false;
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void load();
    const subscription = AppState.addEventListener("change", state => { if (state === "active") void load(); });
    return () => { mounted.current = false; subscription.remove(); };
  }, [load]);

  if (loading) return <Loading label="Checking assigned units…" />;

  const handleUnavailable = (reason: string | null | undefined, fallback: string) => {
    setSelectionError(reason || fallback);
  };

  const handleSelectUnit = (selected: Unit) => {
    if (selected.status !== "available" || selected.unavailableReason) {
      handleUnavailable(
        selected.unavailableReason,
        selected.status === "maintenance"
          ? "This vehicle is currently under maintenance and cannot be operated."
          : selected.status === "in-use"
          ? "Vehicle is already assigned to an active shift."
          : "This vehicle is unavailable for assignment."
      );
      return;
    }

    setSelectionError("");
    setSubmitError("");
    setUnit(selected);
    setDriver(null);
    setStep("select-driver");
  };

  const handleSelectDriver = (selected: Driver) => {
    if (selected.status !== "available" || selected.unavailableReason) {
      handleUnavailable(
        selected.unavailableReason,
        selected.status === "on-shift"
          ? "Driver is already on an active shift."
          : "This driver is unavailable for assignment."
      );
      return;
    }

    setSelectionError("");
    setSubmitError("");
    setDriver(selected);
    setShowConfirmModal(true);
  };

  const handleBackToUnits = () => {
    setSelectionError("");
    setSubmitError("");
    setDriver(null);
    setShowConfirmModal(false);
    setStep("select-unit");
  };

  const handleCloseConfirm = () => {
    if (busy) return;
    setShowConfirmModal(false);
    setSubmitError("");
  };

  const handleConfirmShiftSetup = async () => {
    if (starting.current || checking.current || waiting || loadError) return;
    setSubmitError("");
    if (!unit || !driver) return;

    if (unit.status !== "available" || unit.unavailableReason) {
      setSubmitError(unit.unavailableReason || "This vehicle is unavailable for assignment.");
      return;
    }
    if (driver.status !== "available" || driver.unavailableReason) {
      setSubmitError(driver.unavailableReason || "This driver is unavailable for assignment.");
      return;
    }

    starting.current = true;
    setBusy(true);
    try {
      const access = await readShiftAccess();
      if (!mounted.current) return;
      if (access.kind === "active") { onStarted(access.shift); return; }
      if (access.kind !== "ready") {
        setShowConfirmModal(false);
        if (access.kind === "unremitted") onOutstanding(access.remittance);
        else setWaiting(access.remittance);
        return;
      }
      const startedShift = await api.startShift(unit, driver);
      if (mounted.current) onStarted(startedShift);
    } catch (cause: unknown) {
      const msg = cause instanceof Error ? cause.message : String(cause || "");
      starting.current = false;
      // A 409 may mean the overnight reset ended a stale shift or assignment.
      // Refresh all access and assignment state; failed reads leave selection blocked.
      await load();
      if (mounted.current) setLoadError(msg || "Unable to start shift. Check again.");
    } finally {
      starting.current = false;
      setBusy(false);
    }
  };

  return (
    <>
      <ScreenShell scrollable={false} contentStyle={{ paddingBottom: 24 }}>
        <View style={{ paddingBottom: 8, flex: 1, minHeight: 0 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <View accessible accessibilityLabel="Chatco logo, Conductor Portal" style={{ flexDirection: "row", alignItems: "center", gap: 12, flexShrink: 1, minWidth: 0 }}>
              <Image source={require("../../../assets/logo-transparent.png")} style={{ width: 40, height: 40 }} resizeMode="contain" accessible={false} />
              <View style={{ flexShrink: 1, minWidth: 0 }}>
                <Text style={{ color: colors.text, fontSize: 24, fontWeight: "800", letterSpacing: -0.6 }}>CHATCO<Text style={{ color: colors.primaryLight }}>.</Text></Text>
                <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "600", letterSpacing: 2, marginTop: 4 }}>CONDUCTOR PORTAL</Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Log out"
              disabled={loggingOut}
              onPress={() => void handleLogout()}
              style={[
                styles.button,
                styles.secondaryButton,
                {
                  minHeight: 36,
                  paddingHorizontal: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                },
              ]}
            >
              <Ionicons name="log-out-outline" size={16} color={colors.text} />
              <Text style={[styles.buttonText, styles.secondaryButtonText, { fontSize: 12 }]}>
                {loggingOut ? "Signing out…" : "Sign out"}
              </Text>
            </Pressable>
          </View>

          {loadError ? (
            <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 12, borderRadius: 12, marginBottom: 14 }}>
              <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 13 }}>{loadError}</Text>
              <Pressable accessibilityRole="button" onPress={() => void load()} style={{ marginTop: 8, alignSelf: "flex-start" }}>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "700" }}>Retry</Text>
              </Pressable>
            </View>
          ) : null}

          {waiting || loadError ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{waiting ? "Awaiting cash declaration" : "Shift access unavailable"}</Text>
              <Text style={styles.subtitle}>{waiting
                ? `Your remittance for the ${waiting.date?.slice(0, 10) || "previous"} shift is awaiting the admin's cash declaration. Coordinate with admin before starting a new shift.`
                : "Reconnect to verify your shift and remittances before selecting a unit."}</Text>
              <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.button}><Text style={styles.buttonText}>Check again</Text></Pressable>
            </View>
          ) : <SelectionFade key={step}>
          <Header
            eyebrow={step === "select-unit" ? "STEP 1 OF 2" : "STEP 2 OF 2"}
            title={step === "select-unit" ? "Select your unit" : "Select your driver"}
            subtitle={step === "select-unit"
              ? "Choose the vehicle unit assigned to you for this shift."
              : "Choose the driver you will be assisting for today’s shift."}
          />

          <View style={{ flexDirection: "row", gap: 8, marginTop: 12, marginBottom: 4 }}>
            {onViewMetrics ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="View all-time performance"
                accessibilityHint="Opens your conductor metrics."
                hitSlop={4}
                onPress={onViewMetrics}
                style={[styles.secondaryButton, { flex: 1, minHeight: 48, borderRadius: 10, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }]}
              >
                <Ionicons name="bar-chart-outline" size={17} color={colors.muted} />
                <Text numberOfLines={2} style={[styles.subtitle, { marginTop: 0, fontSize: 11, flexShrink: 1 }]}>All-time performance</Text>
              </Pressable>
            ) : null}
            {onViewSettings ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Account settings"
                accessibilityHint="Opens your account settings."
                hitSlop={4}
                onPress={onViewSettings}
                style={[styles.secondaryButton, { flex: 1, minHeight: 48, borderRadius: 10, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }]}
              >
                <Ionicons name="settings-outline" size={17} color={colors.muted} />
                <Text numberOfLines={1} style={[styles.subtitle, { marginTop: 0, fontSize: 11, flexShrink: 1 }]}>Account settings</Text>
              </Pressable>
            ) : null}
          </View>

          {step === "select-unit" ? (
            <>
              <OfflineDepotNotice isOfflineDepot={isOfflineDepot} onRetry={() => void load()} />
              {selectionError ? (
                <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 12, marginVertical: 10 }}>
                  {selectionError}
                </Text>
              ) : null}
              {units.length > 0 ? (
                <ScrollView
                  style={{ flex: 1, minHeight: 0, marginTop: 12 }}
                  contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator
                >
                  {units.map(item => (
                    <AssignmentCard key={item.id} item={item} onSelect={() => handleSelectUnit(item)} />
                  ))}
                </ScrollView>
              ) : (
                <View style={[styles.card, { padding: 20, alignItems: "center", marginTop: 12 }]}>
                  <Text style={{ color: colors.text, fontWeight: "700", textAlign: "center" }}>No units available</Text>
                  <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 6 }}>
                    Active units will appear here when they are assigned and available for a shift.
                  </Text>
                </View>
              )}
            </>
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to unit selection"
                onPress={handleBackToUnits}
                style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8, marginBottom: 10, minHeight: 40 }}
              >
                <Ionicons name="chevron-back" size={19} color={colors.muted} />
                <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "600" }}>Back</Text>
              </Pressable>

              {unit ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 12, marginBottom: 14 }}>
                  <MinibusFrontIcon size={32} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { fontSize: 10 }]}>YOUR UNIT</Text>
                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700", marginTop: 2 }}>
                      {unit.unitNumber}<Text style={{ color: colors.muted, fontWeight: "500" }}>  {unit.plateNumber}</Text>
                    </Text>
                  </View>
                </View>
              ) : null}

              {selectionError ? (
                <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 12, marginBottom: 10 }}>
                  {selectionError}
                </Text>
              ) : null}
              {drivers.length > 0 ? (
                <ScrollView
                  style={{ flex: 1, minHeight: 0 }}
                  contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator
                  nestedScrollEnabled
                >
                  {drivers.map(item => (
                    <AssignmentCard key={item.id} item={item} onSelect={() => handleSelectDriver(item)} />
                  ))}
                </ScrollView>
              ) : (
                <View style={[styles.card, { padding: 20, alignItems: "center" }]}>
                  <Text style={{ color: colors.text, fontWeight: "700", textAlign: "center" }}>No drivers available</Text>
                  <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 6 }}>
                    Driver assignments will appear here when the backend connection is active.
                  </Text>
                </View>
              )}
            </>
          )}
          </SelectionFade>}
        </View>
      </ScreenShell>

      <ShiftSetupModal
        visible={showConfirmModal}
        onClose={handleCloseConfirm}
        busy={busy}
        unit={unit}
        driver={driver}
        conductorName={conductorName}
        isOfflineDepot={isOfflineDepot}
        error={submitError}
        onConfirm={() => void handleConfirmShiftSetup()}
      />
    </>
  );
}
