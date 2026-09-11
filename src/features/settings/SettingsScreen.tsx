import { useEffect, useMemo, useState } from "react";
import { Alert, Text, View } from "react-native";
import { api } from "../../core/api/chatco-api";
import { appStorage } from "../../core/storage/app-storage";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import { ScreenShell } from "../../shared/ui";
import { SosConfirmModal } from "../../shared/ui/SosConfirmModal";
import type { ConductorProfile, Remittance, Shift, Transaction, User } from "../../core/domain/types";
import {
  initVoiceAnnouncer,
  isVoiceAnnouncerActive,
  setVoiceAnnouncerActive,
  subscribeVoiceAnnouncer,
} from "../../core/utils/voice-announcer";
import { thermalPrinter, type PrinterStatus } from "../../core/utils/thermal-printer";
import { thermalGuard, type ThermalGuardState } from "../../core/utils/thermal-guard";
import { audioCues, initAudioCues, isAudioCuesActive, toggleAudioCues } from "../../core/utils/audio-cues";
import { getHeadwayMinutes, setHeadwayMinutes } from "../../core/utils/terminal-headway";
import { createSettingsStyles } from "./settings-styles";
import { ProfileCard } from "./components/ProfileCard";
import { ActiveAssignmentCard } from "./components/ActiveAssignmentCard";
import { AppPreferencesCard } from "./components/AppPreferencesCard";
import { BluetoothPrinterCard } from "./components/BluetoothPrinterCard";
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
  const [voiceAnnouncer, setVoiceAnnouncer] = useState(isVoiceAnnouncerActive());
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus>(thermalPrinter.getStatus());
  const [printerName, setPrinterName] = useState<string | null>(thermalPrinter.getPairedDeviceName());
  const [autoPrint, setAutoPrint] = useState(thermalPrinter.isAutoPrintEnabled());
  const [isConnectingPrinter, setIsConnectingPrinter] = useState(false);
  const [isTestingPrinter, setIsTestingPrinter] = useState(false);
  const [thermalState, setThermalState] = useState<ThermalGuardState>(thermalGuard.getState());
  const [audioCuesEnabled, setAudioCuesEnabled] = useState(isAudioCuesActive());
  const [headwayMins, setHeadwayMins] = useState(15);
  const [showSOS, setShowSOS] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    void initAudioCues().then(setAudioCuesEnabled);
    void getHeadwayMinutes().then(setHeadwayMins);
  }, []);

  const handleToggleAudio = async () => {
    const next = await toggleAudioCues();
    setAudioCuesEnabled(next);
    if (next) {
      audioCues.playPaymentSound();
    }
  };

  useEffect(() => {
    void initVoiceAnnouncer().then(setVoiceAnnouncer);
    return subscribeVoiceAnnouncer(setVoiceAnnouncer);
  }, []);

  useEffect(() => {
    return thermalPrinter.subscribe((status, name) => {
      setPrinterStatus(status);
      setPrinterName(name);
      setAutoPrint(thermalPrinter.isAutoPrintEnabled());
    });
  }, []);

  useEffect(() => {
    return thermalGuard.subscribe(setThermalState);
  }, []);

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

  const toggleVoice = async () => {
    const next = !voiceAnnouncer;
    setVoiceAnnouncer(next);
    await setVoiceAnnouncerActive(next);
  };

  const toggleAutoPrint = async () => {
    const next = !autoPrint;
    setAutoPrint(next);
    await thermalPrinter.setAutoPrintEnabled(next);
  };

  const toggleThermalGuard = async () => {
    const next = !thermalState.enabled;
    await thermalGuard.setEnabled(next);
  };

  const handleConnectPrinter = async () => {
    setIsConnectingPrinter(true);
    try {
      const res = await thermalPrinter.connect();
      if (res.success) {
        Alert.alert(
          "Goojprt Paired",
          `Successfully connected to ${res.deviceName || "Goojprt 58mm Belt Printer"}.`
        );
      } else if (res.error) {
        Alert.alert("Connection Note", res.error);
      }
    } catch (err: any) {
      Alert.alert("Bluetooth Error", err?.message || "Could not connect to Goojprt printer.");
    } finally {
      setIsConnectingPrinter(false);
    }
  };

  const handleDisconnectPrinter = () => {
    thermalPrinter.disconnect();
    Alert.alert("Printer Disconnected", "Goojprt belt printer disconnected.");
  };

  const handleTestPrint = async () => {
    setIsTestingPrinter(true);
    try {
      const res = await thermalPrinter.printTestSlip(
        shift?.unitNumber,
        profile?.name || shift?.conductorName || user.name
      );
      if (res.success) {
        Alert.alert("Test Slip Printed", "Check your Goojprt belt printer for the diagnostic ticket.");
      } else {
        Alert.alert(
          "Printer Not Connected",
          res.error || "Please connect your Goojprt belt printer before running a test print.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Connect Now", onPress: () => void handleConnectPrinter() },
          ]
        );
      }
    } catch (err: any) {
      Alert.alert("Print Error", err?.message || "Failed to print test slip.");
    } finally {
      setIsTestingPrinter(false);
    }
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
        voiceAnnouncer={voiceAnnouncer}
        onToggleVoice={() => void toggleVoice()}
        audioCuesEnabled={audioCuesEnabled}
        onToggleAudio={() => void handleToggleAudio()}
        headwayMins={headwayMins}
        onUpdateHeadway={(mins) => {
          setHeadwayMins(mins);
          void setHeadwayMinutes(mins);
        }}
        thermalState={thermalState}
        onToggleThermalGuard={() => void toggleThermalGuard()}
      />

      {/* Bluetooth Belt Printer */}
      <BluetoothPrinterCard
        styles={styles}
        colors={colors}
        isLofi={isLofi}
        printerStatus={printerStatus}
        printerName={printerName}
        isConnectingPrinter={isConnectingPrinter}
        onConnectPrinter={() => void handleConnectPrinter()}
        onDisconnectPrinter={handleDisconnectPrinter}
        autoPrint={autoPrint}
        onToggleAutoPrint={() => void toggleAutoPrint()}
        isTestingPrinter={isTestingPrinter}
        onTestPrint={() => void handleTestPrint()}
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
