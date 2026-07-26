import { useCallback, useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { api } from "./src/core/api/chatco-api";
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
        <AppRoot />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppRoot() {
  const { colors, isLofi, ready } = useAppTheme();
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [shift, setShift] = useState<Shift | null>(null);
  const [screen, setScreen] = useState<Screen>("verify");
  const [payment, setPayment] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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
  if (booting || !ready) return <Loading label="Restoring secure session..." />;
  if (!user) return <LoginScreen onLogin={handleLogin} />;
  if (!shift || screen === "verify") return <VerificationScreen onStarted={s => { setShift(s); setScreen("home"); }} />;

  return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={isLofi ? "dark" : "light"} />
        {screen === "home" ? <DashboardScreen shift={shift} refreshKey={refreshKey} /> : null}
        {screen === "report" ? <ReportScreen shift={shift} refreshKey={refreshKey} onEnded={() => { setShift(null); setScreen("verify"); }} /> : null}
        {screen === "metrics" ? <MetricsScreen shift={shift} /> : null}
        {screen === "settings" ? <SettingsScreen user={user} shift={shift} onLogout={() => { setUser(null); setShift(null); setScreen("verify"); }} /> : null}
        <BottomNav current={screen} onNavigate={setScreen} onPayment={() => setPayment(true)} />
        <PaymentModal visible={payment} shift={shift} onClose={() => setPayment(false)} onSaved={() => setRefreshKey(k => k + 1)} />
      </View>
  );
}
