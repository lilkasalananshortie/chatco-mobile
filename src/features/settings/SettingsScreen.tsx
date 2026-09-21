import { useEffect, useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import { api } from "../../core/api/chatco-api";
import { appStorage } from "../../core/storage/app-storage";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import { ScreenShell } from "../../shared/ui";
import { SosConfirmModal } from "../../shared/ui/SosConfirmModal";
import type { ConductorProfile, Remittance, Shift, Transaction, User } from "../../core/domain/types";
import { createSettingsStyles } from "./settings-styles";
import { ProfileCard } from "./components/ProfileCard";
import { ActiveAssignmentCard } from "./components/ActiveAssignmentCard";
import { AppPreferencesCard } from "./components/AppPreferencesCard";
import { AccountSessionSection } from "./components/AccountSessionSection";

const SCAN_SOUND_KEY = "conductor_scan_sound";

export function SettingsScreen({
  user,
  shift,
  onLogout,
}: {
  user: User;
  shift: Shift;
  onLogout: () => void;
}) {
  const { colors, isLofi, setLofi } = useAppTheme();
  const styles = useMemo(() => createSettingsStyles(colors, isLofi), [colors, isLofi]);

  const [profile, setProfile] = useState<ConductorProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [history, setHistory] = useState<Remittance[]>([]);
  const [scanSound, setScanSound] = useState(true);
  const [showSOS, setShowSOS] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    void Promise.all([
      api.profile().catch(() => null),
      api.transactions(shift.shiftId).catch(() => [] as Transaction[]),
      appStorage.getItem(SCAN_SOUND_KEY),
      api.remittances().catch(() => [] as Remittance[]),
    ]).then(([p, t, sound, r]) => {
      if (p) setProfile(p);
      setTransactions(t);
      setScanSound(sound !== "off");
      setHistory(r);
    });
  }, [shift.shiftId]);

  const toggleSound = async () => {
    const next = !scanSound;
    setScanSound(next);
    await appStorage.setItem(SCAN_SOUND_KEY, next ? "on" : "off");
  };

  const logoutLocked = useMemo(() => {
    if (!shift) return false;

    const hasPendingRemit = history.some((record) => {
      const st = String(record.remittance_status ?? record.status ?? "").toUpperCase();
      const cash = Number(record.cash_total) || 0;
      return (st === "FOR CASH DECLARATION" || st === "OVERDUE" || st === "PENDING") && cash > 0;
    });
    if (hasPendingRemit) return true;

    const totalCollections = transactions.reduce(
      (sum, txn) => sum + (Number(txn.finalAmount) || 0),
      0
    );
    const hasSubmitted = history.some((record) => {
      if (String(record.shift_id) !== String(shift.shiftId)) return false;
      const st = String(record.remittance_status ?? record.status ?? "").toUpperCase();
      return (
        st === "SETTLED" ||
        st === "SHORTAGE" ||
        st === "OVERAGE" ||
        st === "FOR CASH DECLARATION" ||
        st === "OVERDUE"
      );
    });
    if (totalCollections > 0 && !hasSubmitted) return true;

    return false;
  }, [shift, history, transactions]);

  const confirmLogout = async () => {
    if (logoutLocked) {
      setShowLogoutConfirm(false);
      Alert.alert("Remittance Required", "Remit all pending collections before logging out.");
      return;
    }
    setLoggingOut(true);
    let logoutAttempted = false;
    try {
      const pending = await api.pendingCashCount();
      if (pending > 0) {
        setShowLogoutConfirm(false);
        setLoggingOut(false);
        Alert.alert(
          "Pending offline cash",
          "Reconnect and synchronize the pending cash transactions before logging out."
        );
        return;
      }
      logoutAttempted = true;
      await api.logout();
    } catch (cause) {
      if (!logoutAttempted) {
        Alert.alert(
          "Unable to log out",
          cause instanceof Error ? cause.message : "Check your network and try again."
        );
      }
    } finally {
      setShowLogoutConfirm(false);
      setLoggingOut(false);
      if (logoutAttempted) onLogout();
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      "Clear App Cache?",
      "Temporary cached data will be removed. Transactions, ratings, shift history, and authentication are not affected.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Cache",
          style: "destructive",
          onPress: async () => {
            try {
              await appStorage.removeItem("conductor_app_cache");
              await appStorage.removeItem("leaflet_tile_cache");
              Alert.alert("Cache Cleared", "Temporary cached data has been removed successfully.");
            } catch {
              Alert.alert("Error", "Unable to clear cache at this time.");
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenShell>
      {/* Page Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage your app preferences and account</Text>
      </View>

      {/* Profile Section */}
      <ProfileCard styles={styles} user={user} shift={shift} profile={profile} />

      {/* Active Assignment */}
      <ActiveAssignmentCard styles={styles} shift={shift} colors={colors} isLofi={isLofi} />

      {/* App Preferences */}
      <AppPreferencesCard
        styles={styles}
        colors={colors}
        isLofi={isLofi}
        setLofi={setLofi}
        scanSound={scanSound}
        onToggleScanSound={() => void toggleSound()}
      />

      {/* Account & Session */}
      <AccountSessionSection
        styles={styles}
        colors={colors}
        isLofi={isLofi}
        onOpenSOS={() => setShowSOS(true)}
        onClearCache={handleClearCache}
        logoutLocked={logoutLocked}
        loggingOut={loggingOut}
        showLogoutConfirm={showLogoutConfirm}
        setShowLogoutConfirm={setShowLogoutConfirm}
        onConfirmLogout={() => void confirmLogout()}
      />

      {/* SOS Modal */}
      <SosConfirmModal isOpen={showSOS} onClose={() => setShowSOS(false)} />
    </ScreenShell>
  );
}
