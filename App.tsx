import { Component, useCallback, useEffect, useMemo, useState, type ErrorInfo, type ReactNode } from "react";
import { StatusBar } from "expo-status-bar";
import { Alert, AppState, Pressable, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { api, setSessionEndedHandler, syncPendingCashTransactions } from "./src/core/api/chatco-api";
import { appStorage } from "./src/core/storage/app-storage";
import { ThemeProvider, useAppTheme } from "./src/core/theme/ThemeProvider";
import { BottomNav, Loading } from "./src/shared/ui";
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
import { audioCues } from "./src/core/utils/audio-cues";
import type { Screen, Shift, User } from "./src/core/domain/types";

export default function App() {
  return (
    <SafeAreaProvider>
      <BrandFonts>
      <ThemeProvider>
        <ThemedAppErrorBoundary>
          <AppRoot />
        </ThemedAppErrorBoundary>
      </ThemeProvider>
      </BrandFonts>
    </SafeAreaProvider>
  );
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
    console.error("ChatCo application error", error, info.componentStack);
  }

  private recover = async () => {
    await appStorage.removeItem("chatco_session");
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: this.props.colors.background, padding: 28, justifyContent: "center" }}>
        <Text style={{ color: this.props.colors.text, fontSize: 24, fontWeight: "900" }}>ChatCo could not open this screen</Text>
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
  const [deviceId, setDeviceId] = useState<string>("");
  const [screen, setScreen] = useState<Screen>("verify");
  const [payment, setPayment] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isOnline, setIsOnline] = useState(false);
  const dismissedReminderIds = useMemo(() => new Set<string>(), [user?.id]);

  useEffect(() => {
    void api.getDeviceId().then(setDeviceId);
  }, []);

  // A 401 ends authentication; a 403/device ownership change remains view-only.
  useEffect(() => setSessionEndedHandler(() => {
    setPayment(false);
    setUser(null);
    setShift(null);
    setScreen("verify");
    Alert.alert(
      "Session ended",
      "Please sign in again. Pending offline cash remains saved on this device.",
    );
  }), []);

  const loadSession = useCallback(async () => {
    try {
      const currentUser = await api.me();
      setUser(currentUser);
      if (currentUser && !currentUser.must_change_password) {
        const active = await api.activeShift().catch(() => null);
        setShift(active);
        setScreen(active ? "home" : "verify");
      }
    } catch {
      setUser(null);
      setShift(null);
      setScreen("verify");
    } finally {
      setBooting(false);
    }
  }, []);
  const handleLogin = useCallback(async (currentUser: User) => {
    setUser(currentUser);
    if (currentUser.must_change_password) return;
    const active = await api.activeShift().catch(() => null);
    setShift(active);
    setScreen(active ? "home" : "verify");
  }, []);
  useEffect(() => { void loadSession(); }, [loadSession]);
  // Periodically revalidate the shift so an ended/remitted shift returns
  // the conductor to the verification screen. Ownership is enforced by the
  // login policy, not here — a 401 on this poll signs the device out.
  useEffect(() => {
    if (!user || user.must_change_password) return;
    let active = true;
    const revalidate = async () => {
      try {
        if (shift?.isProvisional) {
          const promoted = await api.reconcileProvisionalShift().catch(() => null);
          if (!active) return;
          if (promoted) {
            setShift(promoted);
            return;
          }
        }
        const current = await api.activeShift();
        if (!active) return;
        if (!current) {
          setShift(null);
          setScreen(previous => previous === "report" || previous === "settings" || previous === "metrics" ? previous : "verify");
          setPayment(false);
        } else {
          setShift(current);
        }
      } catch {
        // Keep the current operational state during a temporary network outage.
      }
    };
    void revalidate();
    const timer = setInterval(() => void revalidate(), 30000);
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") void revalidate();
    });
    return () => {
      active = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, [shift?.isProvisional, user]);

  useEffect(() => {
    if (!user || user.must_change_password) return;
    let active = true;
    let running = false;
    const flush = async () => {
      if (running) return;
      running = true;
      try {
        const online = await api.checkConnectivity();
        if (!active) return;
        setIsOnline(online);
        if (!online) return;

        if (shift?.isProvisional) {
          const promoted = await api.reconcileProvisionalShift().catch(() => null);
          if (active && promoted) {
            setShift(promoted);
          }
        }

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
  const unclaimed = Boolean(shift && !shift.operatingDeviceId);
  const isOperatingDevice = ownsShift || unclaimed;
  const canOperate = Boolean(shift?.isActive && !shift.timeOut && isOperatingDevice);
  const isViewOnlyDevice = Boolean(shift?.operatingDeviceId && !ownsShift);
  const isPaymentDisabled = Boolean(shift?.isOnBreak) || isViewOnlyDevice || Boolean(!shift);

  if (booting || !ready) return <Loading label="Restoring secure session..." />;
  if (!user) return <LoginScreen onLogin={handleLogin} />;
  if (user.must_change_password) return <PasswordScreen setup onBack={() => { setUser(null); setShift(null); setScreen("verify"); }} />;
  const reminder = <RemittanceReminder key={user.id} dismissedIds={dismissedReminderIds} suspended={payment} onViewReport={() => setScreen("report")} />;
  if (!shift && screen === "report") return <><RemittanceOverview onBack={() => setScreen("verify")} />{reminder}</>;
  if (!shift && screen === "metrics") return <><MetricsScreen onBack={() => setScreen("verify")} />{reminder}</>;
  if (!shift && screen === "settings") return <View style={{ flex: 1, backgroundColor: colors.background }}><Pressable accessibilityRole="button" onPress={() => setScreen("verify")} style={{ padding: 20 }}><Text style={{ color: colors.primaryLight }}>Back to verification</Text></Pressable><SettingsScreen user={user} shift={null} onLogout={() => { setUser(null); setScreen("verify"); }} />{reminder}</View>;
  if (!shift || screen === "verify") {
    return (
      <>
      <VerificationScreen
        onViewMetrics={() => setScreen("metrics")}
        onViewSettings={() => setScreen("settings")}
        onStarted={s => { setShift(s); setScreen("home"); }}
        onLogout={() => { setUser(null); setShift(null); setScreen("verify"); }}
      />
      {reminder}
      </>
    );
  }

  return (
    <ShiftGpsProvider userId={user.id} shift={shift} canOperate={canOperate} refreshKey={refreshKey}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={isLofi ? "dark" : "light"} />
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
            onEnded={async () => {
              await api.logout().catch(() => undefined);
              setUser(null);
              setShift(null);
              setScreen("verify");
            }}
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
          onNavigate={setScreen}
          onPayment={() => {
            if (!shift || !shift.isActive || Boolean(shift.timeOut)) {
              Alert.alert(
                "Shift Ended",
                "The shift has already ended; no new transactions can be recorded."
              );
              return;
            }
            if (Boolean(shift?.isOnBreak)) {
              Alert.alert("Shift on Break", "Cannot collect payments while on an active break. Resume duty first.");
              return;
            }
            if (isViewOnlyDevice) {
              Alert.alert(
                "View-Only Mode",
                "This shift is active on another device. Sync and release that device before collecting fares here."
              );
              return;
            }
            setPayment(true);
          }}
          isPaymentDisabled={isPaymentDisabled}
        />
        {shift ? (
          <PaymentModal
            visible={payment && canOperate && !isPaymentDisabled}
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
