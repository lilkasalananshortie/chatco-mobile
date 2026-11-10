import { Component, useCallback, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import { StatusBar } from "expo-status-bar";
import { Alert, AppState, Pressable, View } from "react-native";
import { Text } from "./src/shared/ui/BrandText";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { api, setSessionEndedHandler, syncPendingCashTransactions } from "./src/core/api/chatco-api";
import { appStorage } from "./src/core/storage/app-storage";
import { endSessionForFareChange, setShiftEndedHandler, TOKEN_KEY } from "./src/core/api/api-client";
import { fareMatrixFingerprint } from "./src/core/api/fare-matrix-cache";
import { ThemeProvider, useAppTheme } from "./src/core/theme/ThemeProvider";
import { BottomNav, Loading, VerificationBackButton } from "./src/shared/ui";
import { DashboardScreen } from "./src/features/dashboard/DashboardScreen";
import { ShiftGpsProvider } from "./src/features/dashboard/ShiftGpsProvider";
import { LoginScreen } from "./src/features/auth/LoginScreen";
import { PasswordScreen } from "./src/features/auth/PasswordScreen";
import { MetricsScreen } from "./src/features/metrics/MetricsScreen";
import { PaymentModal } from "./src/features/payments/PaymentModal";
import { ReportScreen } from "./src/features/remittance/ReportScreen";
import { RemittanceReminder } from "./src/features/remittance/RemittanceReminder";
import { RemittanceOverview } from "./src/features/remittance/RemittanceOverview";
import { BrandFonts } from "./src/shared/ui/BrandFonts";
import { SettingsScreen } from "./src/features/settings/SettingsScreen";
import { VerificationScreen } from "./src/features/shift/VerificationScreen";
import { audioCues, initAudioCues, loadScanSoundSetting, preloadAudioCues } from "./src/core/utils/audio-cues";
import type { Remittance, Screen, Shift, User } from "./src/core/domain/types";
import { readShiftAccess, remittanceShift, ShiftAccessUnavailableError } from "./src/core/api/shift-access";

export default function App() {
  return (
    <SafeAreaProvider>
      <BrandFonts>
      <ThemeProvider>
        <AppSafeArea>
          <ThemedAppErrorBoundary>
            <AppRoot />
          </ThemedAppErrorBoundary>
        </AppSafeArea>
      </ThemeProvider>
      </BrandFonts>
    </SafeAreaProvider>
  );
}

function AppSafeArea({ children }: { children: ReactNode }) {
  const { colors, isLofi } = useAppTheme();
  return <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: colors.background }}>
    <StatusBar style={isLofi ? "dark" : "light"} />
    {children}
  </SafeAreaView>;
}

function ThemedAppErrorBoundary({ children }: { children: ReactNode }) {
  const { colors } = useAppTheme();
  return <AppErrorBoundary colors={colors}>{children}</AppErrorBoundary>;
}

type ErrorScreenColors = Pick<ReturnType<typeof useAppTheme>["colors"], "background" | "text" | "muted" | "danger" | "primary">;

class AppErrorBoundary extends Component<{ children: ReactNode; colors: ErrorScreenColors }, { error: string | null }> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { error: error.message || "Unexpected application error." };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("CHATCO application error", error, info.componentStack);
  }

  private recover = async () => {
    await appStorage.removeItem("chatco_session");
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: this.props.colors.background, padding: 28, justifyContent: "center" }}>
        <Text style={{ color: this.props.colors.text, fontSize: 24, fontWeight: "900" }}>CHATCO could not open this screen</Text>
        <Text style={{ color: this.props.colors.muted, fontSize: 14, lineHeight: 21, marginTop: 10 }}>
          The app stayed open so this error can be reported.
        </Text>
        <Text selectable style={{ color: this.props.colors.danger, fontSize: 12, lineHeight: 18, marginTop: 18 }}>
          {this.state.error}
        </Text>
        <Pressable onPress={() => void this.recover()} style={{ minHeight: 48, backgroundColor: this.props.colors.primary, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 22 }}>
          <Text style={{ color: "#fff", fontWeight: "800" }}>Clear session and return to login</Text>
        </Pressable>
      </View>
    );
  }
}

function AppRoot() {
  const { colors, isLofi, ready } = useAppTheme();
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [shift, setShift] = useState<Shift | null>(null);
  const [outstanding, setOutstanding] = useState<Remittance | null>(null);
  const remitting = useRef(false);
  const [remittanceBusy, setRemittanceBusy] = useState(false);
  const setRemitting = (value: boolean) => { remitting.current = value; setRemittanceBusy(value); };
  const [deviceId, setDeviceId] = useState<string>("");
  const [screen, setScreen] = useState<Screen>("verify");
  const [payment, setPayment] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isOnline, setIsOnline] = useState(false);
  const currentShiftRef = useRef(shift);
  const currentScreenRef = useRef(screen);
  currentShiftRef.current = shift;
  currentScreenRef.current = screen;
  const dismissedReminderIds = useMemo(() => new Set<string>(), [user?.id]);

  useEffect(() => {
    void api.getDeviceId().then(setDeviceId);
    void initAudioCues();
    void loadScanSoundSetting();
    preloadAudioCues();
  }, []);

  // A 401 ends authentication; a 403/device ownership change remains view-only.
  useEffect(() => setSessionEndedHandler((message?: string) => {
    setPayment(false);
    setUser(null);
    setShift(null);
    setOutstanding(null);
    setRemitting(false);
    setScreen("verify");
    Alert.alert(
      "Session ended",
      message ?? "Please sign in again. Pending offline cash remains saved on this device.",
    );
  }), []);

  useEffect(() => setShiftEndedHandler(() => {
    setPayment(false);
    setShift(null);
    setOutstanding(null);
    setRemitting(false);
    setScreen("verify");
    setRefreshKey(key => key + 1);
  }), []);

  // Mobile uses polling; token expiry still enforces signout if an update is missed.
  useEffect(() => {
    if (!user || user.must_change_password) return;
    let active = true;
    let running = false;
    let baseline: string | null = null;
    const refresh = async () => {
      if (!active || running || AppState.currentState === "background" || AppState.currentState === "inactive") return;
      running = true;
      try {
        const token = await appStorage.getItem(TOKEN_KEY);
        if (!token) return;
        const matrix = await api.fareMatrix(shift?.routeId);
        if (!active || matrix.isCached || await appStorage.getItem(TOKEN_KEY) !== token) return;
        const fingerprint = fareMatrixFingerprint(matrix);
        if (baseline !== null && baseline !== fingerprint) {
          await endSessionForFareChange(token);
        }
        baseline = fingerprint;
      } catch { /* Outages do not sign out a conductor or discard saved cash. */ }
      finally { running = false; }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 15000);
    const subscription = AppState.addEventListener("change", state => { if (state === "active") void refresh(); });
    return () => { active = false; clearInterval(timer); subscription.remove(); };
  }, [user?.id, user?.must_change_password, shift?.routeId]);

  const loadSession = useCallback(async () => {
    try {
      const currentUser = await api.me();
      if (currentUser && !currentUser.must_change_password) {
        const access = await readShiftAccess().catch(() => null);
        setShift(access?.kind === "active" ? access.shift : null);
        setOutstanding(access?.kind === "unremitted" ? access.remittance : null);
        setScreen(access?.kind === "active" ? "home" : access?.kind === "unremitted" ? "report" : "verify");
      }
      setUser(currentUser);
    } catch {
      setUser(null);
      setShift(null);
      setScreen("verify");
    } finally {
      setBooting(false);
    }
  }, []);
  const handleLogin = useCallback(async (currentUser: User) => {
    if (!currentUser.must_change_password) {
      const access = await readShiftAccess().catch(() => null);
      setShift(access?.kind === "active" ? access.shift : null);
      setOutstanding(access?.kind === "unremitted" ? access.remittance : null);
      setScreen(access?.kind === "active" ? "home" : access?.kind === "unremitted" ? "report" : "verify");
    }
    setUser(currentUser);
  }, []);
  useEffect(() => { void loadSession(); }, [loadSession]);
  // Periodically revalidate the shift so an ended/remitted shift returns
  // the conductor to the verification screen. Ownership is enforced by the
  // login policy, not here — a 401 on this poll signs the device out.
  useEffect(() => {
    if (!user || user.must_change_password) return;
    let active = true;
    let running = false;
    const revalidate = async () => {
      if (!active || running || remitting.current || AppState.currentState === "background" || AppState.currentState === "inactive") return;
      running = true;
      try {
        const access = await readShiftAccess();
        if (!active || remitting.current) return;
        const current = access.kind === "active" ? access.shift : null;
        if (!current) {
          const shiftJustEnded = Boolean(currentShiftRef.current?.isActive);
          setShift(null);
          setOutstanding(access.kind === "unremitted" ? access.remittance : null);
          setRefreshKey(key => key + 1);
          setScreen(previous => access.kind === "unremitted" ? "report" : previous === "report" || previous === "settings" || previous === "metrics" ? previous : "verify");
          setPayment(false);
          if (shiftJustEnded && currentScreenRef.current === "home") {
            Alert.alert("Shift Ended", "The shift has already ended. No new fares can be recorded.");
          }
        } else {
          setShift(current);
        }
      } catch (cause) {
        if (active && !remitting.current && cause instanceof ShiftAccessUnavailableError) {
          // History failure cannot undo the server's confirmation that the shift ended.
          setShift(null);
          setOutstanding(null);
          setPayment(false);
          setScreen("verify");
        }
        // A failed active-shift read preserves queued cash and the last known state.
      } finally {
        running = false;
      }
    };
    const timer = setInterval(() => void revalidate(), 30000);
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") void revalidate();
    });
    return () => {
      active = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, [user]);

  useEffect(() => {
    if (!user || user.must_change_password) return;
    let active = true;
    let running = false;
    const flush = async () => {
      if (!active || running || AppState.currentState === "background" || AppState.currentState === "inactive") return;
      running = true;
      try {
        const online = await api.checkConnectivity();
        if (!active) return;
        setIsOnline(online);
        if (!online) return;

        const synced = await syncPendingCashTransactions();
        if (active && synced > 0) setRefreshKey(key => key + 1);
      } catch {
        if (active) setIsOnline(false);
      } finally {
        running = false;
      }
    };
    void flush();
    const timer = setInterval(() => void flush(), 20000);
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") void flush();
    });
    return () => {
      active = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, [user]);
  const ownsShift = Boolean(shift?.operatingDeviceId && deviceId && shift.operatingDeviceId === deviceId);
  const isOperatingDevice = ownsShift;
  const canOperate = Boolean(shift?.isActive && !shift.timeOut && isOperatingDevice);
  const isViewOnlyDevice = Boolean(shift && !ownsShift);

  const finishRemittance = async (late: boolean) => {
    setOutstanding(null);
    setShift(null);
    setScreen("verify");
    if (!late) {
      try { await api.logout(); }
      catch { /* logout clears local authentication even during an outage */ }
      finally { setUser(null); setRemitting(false); }
    } else setRemitting(false);
  };

  if (booting || !ready) return <Loading label="Restoring secure session..." />;
  if (!user) return <LoginScreen onLogin={handleLogin} />;
  if (remittanceBusy && !shift && !outstanding) return <Loading label="Signing out…" />;
  if (user.must_change_password) return <PasswordScreen setup onBack={() => { setUser(null); setShift(null); setScreen("verify"); }} />;
  const reminder = <RemittanceReminder key={user.id} dismissedIds={dismissedReminderIds} suspended={payment} onViewReport={() => setScreen("report")} />;
  if (!shift && outstanding && screen === "report") return <ReportScreen
    key={outstanding.shift_id} shift={remittanceShift(outstanding)} outstanding={outstanding}
    refreshKey={refreshKey} canOperate={false}
    onSubmitting={setRemitting}
    onBack={() => { if (!remitting.current) { setOutstanding(null); setScreen("verify"); } }}
    onEnded={() => { void finishRemittance(true); }} />;
  if (!shift && screen === "report") return <><RemittanceOverview onBack={() => setScreen("verify")} />{reminder}</>;
  if (!shift && screen === "metrics") return <><MetricsScreen onBack={() => setScreen("verify")} />{reminder}</>;
  if (!shift && screen === "settings") return <View style={{ flex: 1, backgroundColor: colors.background }}><View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}><VerificationBackButton onPress={() => setScreen("verify")} /></View><SettingsScreen user={user} shift={null} onLogout={() => { setUser(null); setScreen("verify"); }} />{reminder}</View>;
  if (!shift || screen === "verify") {
    return (
      <>
      <VerificationScreen
        conductorName={user.name}
        onViewMetrics={() => setScreen("metrics")}
        onViewSettings={() => setScreen("settings")}
        onStarted={s => { setShift(s); setScreen("home"); }}
        onOutstanding={record => { setOutstanding(record); setScreen("report"); }}
        onLogout={() => { setUser(null); setShift(null); setScreen("verify"); }}
      />
      {reminder}
      </>
    );
  }

  return (
    <ShiftGpsProvider userId={user.id} shift={shift} canOperate={canOperate} refreshKey={refreshKey}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {reminder}
        {screen === "home" && shift ? (
          <DashboardScreen
            shift={shift}
            refreshKey={refreshKey}
            canOperate={canOperate}
            isOnline={isOnline}
            onShiftUpdated={setShift}
            onShiftEnded={() => { setShift(null); setScreen("verify"); }}
          />
        ) : null}
        {screen === "report" ? (
          <ReportScreen
            shift={shift}
            onBack={() => setScreen("home")}
            refreshKey={refreshKey}
            canOperate={canOperate}
            onSubmitting={setRemitting}
            onEnded={() => { void finishRemittance(false); }}
          />
        ) : null}
        {screen === "metrics" ? <MetricsScreen shift={shift} /> : null}
        {screen === "settings" ? (
          <SettingsScreen
            user={user}
            shift={shift}
            onShiftUpdated={setShift}
            onLogout={() => { setUser(null); setShift(null); setScreen("verify"); }}
          />
        ) : null}
        <BottomNav
          current={screen}
          onNavigate={next => { if (!remitting.current) setScreen(next); }}
          onPayment={() => {
            if (!shift || remitting.current) return;
            setPayment(true);
          }}
          isPaymentDisabled={!shift || remittanceBusy}
        />
        {shift ? (
          <PaymentModal
            visible={payment}
            blockedReason={!shift.isActive || shift.timeOut
              ? "This shift has ended. You can still view Payment History."
              : shift.isOnBreak
                ? "Resume duty to collect payments. Payment History is still available."
                : isViewOnlyDevice
                  ? "Claim this shift on this device to collect fares. Payment History is still available."
                  : null}
            shift={shift}
            isOnline={isOnline}
            onClose={() => setPayment(false)}
            onSaved={() => {
              audioCues.playPaymentSound();
              setRefreshKey(k => k + 1);
            }}
          />
        ) : null}
      </View>
    </ShiftGpsProvider>
  );
}
