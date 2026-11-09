import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../core/api/chatco-api";
import type { Driver, Shift, Unit } from "../../core/domain/types";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import { Header, Loading, ScreenShell } from "../../shared/ui";
import { AssignmentCard } from "./components/AssignmentCard";
import { OfflineDepotNotice } from "./components/OfflineDepotNotice";
import { ShiftSetupModal } from "./components/ShiftSetupModal";

type Step = "select-unit" | "select-driver";

export function VerificationScreen({
  conductorName = "Conductor",
  onStarted,
  onLogout,
  onViewMetrics,
  onViewSettings,
}: {
  conductorName?: string;
  onStarted: (shift: Shift) => void;
  onLogout?: () => void;
  onViewMetrics?: () => void;
  onViewSettings?: () => void;
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

  const load = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const isConnected = await api.checkConnectivity().catch(() => false);
      setIsOfflineDepot(!isConnected);
      const [availableUnits, availableDrivers] = await Promise.all([
        api.units(),
        api.drivers(),
      ]);
      setUnits(availableUnits);
      setDrivers(availableDrivers);
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : "Unable to load assignments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

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

    setBusy(true);
    try {
      const startedShift = await api.startShift(unit, driver);
      onStarted(startedShift);
    } catch (cause: unknown) {
      const msg = cause instanceof Error ? cause.message : String(cause || "");
      if (msg.toLowerCase().includes("maintenance")) {
        if (msg.toLowerCase().includes("chatco")) {
          setSubmitError("CHATCO is under maintenance right now. Shifts cannot be started until complete.");
        } else {
          setSubmitError("This vehicle is currently under maintenance and cannot be operated.");
        }
      } else if (msg.toLowerCase().includes("driver") && msg.toLowerCase().includes("shift")) {
        setSubmitError("Driver is already on an active shift.");
      } else if (msg.toLowerCase().includes("vehicle") && msg.toLowerCase().includes("shift")) {
        setSubmitError("Vehicle is already assigned to an active shift.");
      } else {
        setSubmitError(msg || "Unable to start shift.");
      }
    } finally {
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
            <View>
              <Text style={styles.title}>CHATCO.</Text>
              <Text style={[styles.label, { marginTop: 2 }]}>Conductor Portal</Text>
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
                  <Ionicons name="bus-outline" size={27} color={colors.primaryLight} />
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
