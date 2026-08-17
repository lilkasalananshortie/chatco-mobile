import { Component, useCallback, useEffect, useState, type ErrorInfo, type ReactNode } from "react";
import { StatusBar } from "expo-status-bar";
import { Alert, AppState, Pressable, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { api, syncPendingCashTransactions } from "./src/core/api/chatco-api";
import { appStorage } from "./src/core/storage/app-storage";
import { getConductorDeviceId } from "./src/core/storage/device-id";
import { ThemeProvider, useAppTheme } from "./src/core/theme/ThemeProvider";
import { BottomNav, Loading } from "./src/shared/ui";
import { DashboardScreen } from "./src/features/dashboard/DashboardScreen";
import { LoginScreen } from "./src/features/auth/LoginScreen";
import { MetricsScreen } from "./src/features/metrics/MetricsScreen";
import { PaymentModal } from "./src/features/payments/PaymentModal";
import { ReportScreen } from "./src/features/remittance/ReportScreen";
import { SettingsScreen } from "./src/features/settings/SettingsScreen";
import { VerificationScreen } from "./src/features/shift/VerificationScreen";
import type { Screen, Shift, User } from "./src/core/domain/types";

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppErrorBoundary>
          <AppRoot />
        </AppErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
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
      <View style={{ flex: 1, backgroundColor: "#050F1A", padding: 28, justifyContent: "center" }}>
        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "900" }}>ChatCo could not open this screen</Text>
        <Text style={{ color: "#91A0B4", fontSize: 14, lineHeight: 21, marginTop: 10 }}>
          The app stayed open so this error can be reported.
        </Text>
        <Text selectable style={{ color: "#FB7185", fontSize: 12, lineHeight: 18, marginTop: 18 }}>
          {this.state.error}
        </Text>
        <Pressable onPress={() => void this.recover()} style={{ minHeight: 48, backgroundColor: "#1A5FB4", borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 22 }}>
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
  const [screen, setScreen] = useState<Screen>("verify");
  const [payment, setPayment] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deviceId, setDeviceId] = useState("");
  const [deviceBusy, setDeviceBusy] = useState(false);
  const [deviceError, setDeviceError] = useState("");

  useEffect(() => { void getConductorDeviceId().then(setDeviceId); }, []);

  const loadSession = useCallback(async () => {
    try {
      const currentUser = await api.me();
      setUser(currentUser);
      if (currentUser) {
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
    const active = await api.activeShift().catch(() => null);
    setShift(active);
    setScreen(active ? "home" : "verify");
  }, []);
  useEffect(() => { void loadSession(); }, [loadSession]);
  useEffect(() => {
    if (!user) return;
    let active = true;
    const revalidate = async () => {
      try {
        const current = await api.activeShift();
        if (!active) return;
        if (!current) {
          setShift(null);
          setScreen("verify");
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
  }, [user]);
  const canOperate = Boolean(shift && (!shift.operatingDeviceId || shift.operatingDeviceId === deviceId));

  const claimDevice = async () => {
    if (!shift) return;
    setDeviceBusy(true);
    setDeviceError("");
    try {
      setShift(await api.claimShiftDevice(shift.shiftId));
    } catch (cause) {
      setDeviceError(cause instanceof Error ? cause.message : "Unable to claim this shift.");
    } finally {
      setDeviceBusy(false);
    }
  };

  const releaseDevice = async () => {
    if (!shift) return;
    setDeviceBusy(true);
    setDeviceError("");
    try {
      await syncPendingCashTransactions();
      if (await api.pendingCashCount(shift.shiftId)) {
        throw new Error("Offline cash is still waiting to sync. Keep this device connected and try again.");
      }
      setPayment(false);
      setShift(await api.releaseShiftDevice(shift.shiftId));
    } catch (cause) {
      setDeviceError(cause instanceof Error ? cause.message : "Unable to release this shift.");
    } finally {
      setDeviceBusy(false);
    }
  };

  const confirmRelease = () => Alert.alert(
    "Move shift to another device?",
    "All offline cash will be synchronized before this device releases the shift.",
    [
      { text: "Cancel", style: "cancel" },
      { text: "Release", onPress: () => void releaseDevice() },
    ],
  );
  useEffect(() => {
    if (!user) return;
    const flush = async () => {
      const synced = await syncPendingCashTransactions();
      if (synced > 0) setRefreshKey(key => key + 1);
    };
    void flush();
    const timer = setInterval(() => void flush(), 20000);
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") void flush();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [user]);
  if (booting || !ready) return <Loading label="Restoring secure session..." />;
  if (!user) return <LoginScreen onLogin={handleLogin} />;
  if (!shift || screen === "verify") return <VerificationScreen onStarted={s => { setShift(s); setScreen("home"); }} />;

  return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={isLofi ? "dark" : "light"} />
        <View style={{ marginHorizontal: 14, marginTop: 8, padding: 12, borderRadius: 14, backgroundColor: canOperate ? colors.surface2 : "#3B2A10" }}>
          <Text style={{ color: canOperate ? colors.primaryLight : colors.warning, fontWeight: "800" }}>
            {!shift.operatingDeviceId ? "Choose the operating device" : canOperate ? "This is the operating device" : "View-only on this device"}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
            {!shift.operatingDeviceId
              ? "Claim this shift before collecting fares."
              : canOperate
                ? "Release only after offline cash is synchronized for a Web/Mobile handoff."
                : `The ${shift.operatingDeviceType?.toLowerCase() ?? "other"} device must sync and release the shift first.`}
          </Text>
          {!shift.operatingDeviceId ? (
            <Pressable disabled={deviceBusy} onPress={() => void claimDevice()} style={{ marginTop: 10 }}>
              <Text style={{ color: colors.primaryLight, fontWeight: "800" }}>{deviceBusy ? "Claiming..." : "Use this device"}</Text>
            </Pressable>
          ) : canOperate ? (
            <Pressable disabled={deviceBusy} onPress={confirmRelease} style={{ marginTop: 10 }}>
              <Text style={{ color: colors.primaryLight, fontWeight: "800" }}>{deviceBusy ? "Checking sync..." : "Release for handoff"}</Text>
            </Pressable>
          ) : null}
          {deviceError ? <Text style={{ color: "#FB7185", fontSize: 12, marginTop: 8 }}>{deviceError}</Text> : null}
        </View>
        {screen === "home" ? <DashboardScreen shift={shift} refreshKey={refreshKey} onShiftUpdated={setShift} onShiftEnded={() => { setShift(null); setScreen("verify"); }} /> : null}
        {screen === "report" ? <ReportScreen shift={shift} refreshKey={refreshKey} canOperate={canOperate} onEnded={() => { setShift(null); setScreen("verify"); }} /> : null}
        {screen === "metrics" ? <MetricsScreen shift={shift} /> : null}
        {screen === "settings" ? <SettingsScreen user={user} shift={shift} onLogout={() => { setUser(null); setShift(null); setScreen("verify"); }} /> : null}
        <BottomNav current={screen} onNavigate={setScreen} onPayment={() => {
          if (!canOperate) {
            setDeviceError("This shift is active on another device. Release it there before collecting fares here.");
            return;
          }
          setPayment(true);
        }} />
        <PaymentModal visible={payment && canOperate} shift={shift} onClose={() => setPayment(false)} onSaved={() => setRefreshKey(k => k + 1)} />
      </View>
  );
}
