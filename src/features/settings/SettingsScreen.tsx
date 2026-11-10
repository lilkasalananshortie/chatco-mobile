import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../shared/ui/BrandText";
import { api } from "../../core/api/chatco-api";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import { ScreenShell } from "../../shared/ui";
import type { ConductorProfile, Remittance, Shift, Transaction, User } from "../../core/domain/types";
import { createSettingsStyles } from "./settings-styles";
import { PersonalDetailsCard, ProfileCard } from "./components/ProfileCard";
import { ActiveAssignmentCard } from "./components/ActiveAssignmentCard";
import { AppPreferencesCard } from "./components/AppPreferencesCard";
import { BluetoothPrinterCard } from "./components/BluetoothPrinterCard";
import { AccountSessionSection } from "./components/AccountSessionSection";
import { thermalPrinter, type PrinterStatus } from "../../core/utils/thermal-printer";
import { pickProfilePhotoSelection } from "./profile-photo";
import { transactionSummary } from "../../core/domain/transaction-summary";
import { loadScanSoundSetting, setScanSoundEnabled } from "../../core/utils/audio-cues";

export function SettingsScreen({
  user,
  shift,
  onLogout,
}: {
  user: User;
  shift?: Shift | null;
  onShiftUpdated?: (shift: Shift | null) => void;
  onLogout: () => void;
}) {
  const { colors, isLofi, isLight, isLowFidelity, setLight, setLowFidelity } = useAppTheme();
  const styles = useMemo(() => createSettingsStyles(colors, isLight, isLowFidelity), [colors, isLight, isLowFidelity]);

  const [profile, setProfile] = useState<ConductorProfile | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [pendingPhoto, setPendingPhoto] = useState<{ body: FormData; uri: string } | null>(null);
  const [photoSaved, setPhotoSaved] = useState(false);
  const photoPending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const changePhoto = async () => {
    if (photoPending.current) return;
    photoPending.current = true; setPhotoBusy(true); setPhotoError("");
    setPhotoSaved(false);
    try {
      const photo = await pickProfilePhotoSelection();
      if (!photo || !mounted.current) return;
      setPendingPhoto(photo);
    } catch (error) { if (mounted.current) setPhotoError(error instanceof Error ? error.message : "Could not choose a photo. Please retry."); }
    finally { photoPending.current = false; if (mounted.current) setPhotoBusy(false); }
  };
  const cancelPhoto = () => {
    if (photoPending.current) return;
    setPendingPhoto(null);
    setPhotoSaved(false);
    setPhotoError("");
  };
  const savePhoto = async () => {
    if (!pendingPhoto || photoPending.current) return;
    photoPending.current = true; setPhotoBusy(true); setPhotoError("");
    try {
      const url = await api.uploadProfilePhoto(pendingPhoto.body, user.id);
      if (mounted.current) setProfile(previous => ({
        id: user.id,
        name: previous?.name ?? user.name,
        username: previous?.username ?? user.email.split("@")[0] ?? user.email,
        phoneNumber: previous?.phoneNumber,
        profilePictureUrl: url,
      }));
      if (mounted.current) { setPendingPhoto(null); setPhotoSaved(true); }
    } catch (error) { if (mounted.current) setPhotoError(error instanceof Error ? error.message : "Upload failed. Please retry."); }
    finally { photoPending.current = false; if (mounted.current) setPhotoBusy(false); }
  };
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [history, setHistory] = useState<Remittance[]>([]);
  const [scanSound, setScanSound] = useState(true);
  const [logoutCheckStatus, setLogoutCheckStatus] = useState<"loading" | "ready" | "error">("loading");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const loadSettingsData = useCallback(async () => {
    setLogoutCheckStatus("loading");
    const transactionRequest: Promise<{ data: Transaction[]; ok: boolean }> = shift
      ? api.transactions(shift.shiftId)
        .then(data => ({ data, ok: true }))
        .catch(() => ({ data: [] as Transaction[], ok: false }))
      : Promise.resolve({ data: [] as Transaction[], ok: true });
    const remittanceRequest: Promise<{ data: Remittance[]; ok: boolean }> = api.remittances()
      .then(data => ({ data, ok: true }))
      .catch(() => ({ data: [] as Remittance[], ok: false }));

    const [nextProfile, transactionResult, sound, remittanceResult] = await Promise.all([
      api.profile().catch(() => null),
      transactionRequest,
      loadScanSoundSetting(),
      remittanceRequest,
    ]);
    if (!mounted.current) return;
    if (nextProfile) setProfile(nextProfile);
    setTransactions(transactionResult.data);
    setScanSound(sound);
    setHistory(remittanceResult.data);
    setLogoutCheckStatus(transactionResult.ok && remittanceResult.ok ? "ready" : "error");
  }, [shift?.shiftId]);

  useEffect(() => {
    void loadSettingsData();
  }, [loadSettingsData, user.id]);

  const [printerStatus, setPrinterStatus] = useState<PrinterStatus>(thermalPrinter.getStatus());
  const [printerName, setPrinterName] = useState<string | null>(thermalPrinter.getPairedDeviceName());
  const [autoPrint, setAutoPrint] = useState(thermalPrinter.isAutoPrintEnabled());
  const [isConnectingPrinter, setIsConnectingPrinter] = useState(false);
  const [isTestingPrinter, setIsTestingPrinter] = useState(false);

  useEffect(() => {
    return thermalPrinter.subscribe((status, name) => {
      setPrinterStatus(status);
      setPrinterName(name);
      setAutoPrint(thermalPrinter.isAutoPrintEnabled());
    });
  }, []);

  const toggleAutoPrint = async () => {
    const next = !autoPrint;
    setAutoPrint(next);
    await thermalPrinter.setAutoPrintEnabled(next);
  };

  const handleConnectPrinter = async () => {
    setIsConnectingPrinter(true);
    try {
      const res = await thermalPrinter.connect();
      if (res.success) {
        Alert.alert(
          "Printer Connected",
          `Successfully connected to ${res.deviceName || "Thermal Printer"}.`
        );
      } else if (res.error) {
        Alert.alert("Connection Note", res.error);
      }
    } catch (err: any) {
      Alert.alert("Bluetooth Error", err?.message || "Could not connect to printer.");
    } finally {
      setIsConnectingPrinter(false);
    }
  };

  const handleDisconnectPrinter = () => {
    thermalPrinter.disconnect();
    Alert.alert("Printer Disconnected", "Thermal printer disconnected.");
  };

  const handleTestPrint = async () => {
    setIsTestingPrinter(true);
    try {
      const res = await thermalPrinter.printTestSlip(
        shift?.unitNumber,
        profile?.name || shift?.conductorName || user.name
      );
      if (res.success) {
        Alert.alert("Test Slip Printed", "Check your thermal printer for the diagnostic ticket.");
      } else {
        Alert.alert(
          "Print Error",
          res.error || "Please ensure RawBT or a Bluetooth printer is ready.",
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

  const toggleSound = async () => {
    const next = !scanSound;
    setScanSound(next);
    await setScanSoundEnabled(next);
  };

  const logoutLocked = useMemo(() => {
    if (logoutCheckStatus !== "ready") return true;
    if (!shift) return false;

    const hasPendingRemit = history.some((record) => {
      const st = String(record.remittance_status ?? record.status ?? "").toUpperCase();
      const cash = Number(record.cash_total) || 0;
      return (st === "FOR CASH DECLARATION" || st === "OVERDUE" || st === "PENDING") && cash > 0;
    });
    if (hasPendingRemit) return true;

    const totalCollections = transactionSummary(transactions).total;
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
  }, [logoutCheckStatus, shift, history, transactions]);

  const confirmLogout = async () => {
    if (logoutCheckStatus !== "ready") {
      setShowLogoutConfirm(false);
      Alert.alert("Unable to verify remittance", "Reconnect and check remittance status before signing out.");
      return;
    }
    if (logoutLocked) {
      setShowLogoutConfirm(false);
      Alert.alert("Remittance Required", "Remit all pending collections before signing out.");
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

  return (
    <ScreenShell scrollable={false} contentStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: shift ? 88 : 16 }}>
      {/* Page Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Manage your app preferences and account</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Light mode"
          accessibilityState={{ checked: isLight }}
          onPress={() => void setLight(!isLight)}
          style={[
            styles.themeToggle,
            isLofi ? styles.themeToggleLight : styles.themeToggleDark,
          ]}
        >
          <Ionicons
            name={isLofi ? "sunny-outline" : "moon-outline"}
            size={20}
            color={isLofi ? "#D97706" : "#99C1F1"}
          />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
      {/* Profile Section */}
      <ProfileCard styles={styles} user={user} shift={shift} profile={profile} photoBusy={photoBusy} photoError={photoError} onChangePhoto={() => void changePhoto()} />

      {/* Personal details, followed by the active assignment as on web. */}
      <PersonalDetailsCard styles={styles} user={user} shift={shift} profile={profile} />

      {/* Active Assignment */}
      <ActiveAssignmentCard styles={styles} shift={shift} colors={colors} isLofi={isLofi} />

      {/* App Preferences */}
      <AppPreferencesCard
        styles={styles}
        scanSound={scanSound}
        onToggleScanSound={() => void toggleSound()}
        isLofi={isLowFidelity}
        onToggleLofi={() => void setLowFidelity(!isLowFidelity)}
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
        isLowFidelity={isLowFidelity}
        styles={styles}
        colors={colors}
        isLofi={isLofi}
        logoutLocked={logoutLocked}
        logoutCheckStatus={logoutCheckStatus}
        onRetryLogoutCheck={() => void loadSettingsData()}
        loggingOut={loggingOut}
        showLogoutConfirm={showLogoutConfirm}
        setShowLogoutConfirm={setShowLogoutConfirm}
        onConfirmLogout={() => void confirmLogout()}
      />

      </ScrollView>

      <Modal visible={pendingPhoto !== null || photoSaved} transparent animationType="fade" onRequestClose={cancelPhoto}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "rgba(0,0,0,0.6)" }}>
          <View accessibilityViewIsModal style={{ width: "100%", maxWidth: 380, maxHeight: "90%", backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16 }}>
            <ScrollView contentContainerStyle={{ padding: 24, alignItems: "center", gap: 16 }}>
              {photoSaved ? <>
                <Ionicons name="checkmark-circle-outline" size={44} color={colors.primary} />
                <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={{ color: colors.text, fontSize: 20, fontWeight: "700", textAlign: "center" }}>Profile photo updated</Text>
                <Text style={{ color: colors.muted, textAlign: "center", lineHeight: 21 }}>Your new photo has been saved.</Text>
                <Pressable accessibilityRole="button" onPress={cancelPhoto} style={{ width: "100%", minHeight: 48, justifyContent: "center", alignItems: "center", borderRadius: 10, backgroundColor: colors.primary }}><Text style={{ color: "#FFFFFF", fontWeight: "600" }}>Done</Text></Pressable>
              </> : <>
                <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 20, fontWeight: "700", textAlign: "center" }}>Save profile photo?</Text>
                {pendingPhoto ? <Image source={{ uri: pendingPhoto.uri }} accessibilityLabel="Selected profile photo preview" style={{ width: 144, height: 144, borderRadius: 72 }} /> : null}
                <Text style={{ color: colors.muted, textAlign: "center", lineHeight: 21 }}>Do you want to save this as your profile photo?</Text>
                <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: "center" }}>JPG, PNG or WebP only. Max 3 MB.</Text>
                {photoError ? <Text accessibilityRole="alert" style={{ color: colors.danger, textAlign: "center" }}>{photoError}</Text> : null}
                <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
                  <Pressable accessibilityRole="button" onPress={cancelPhoto} disabled={photoBusy} style={{ flex: 1, minHeight: 48, justifyContent: "center", alignItems: "center", borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2, opacity: photoBusy ? 0.5 : 1 }}><Text style={{ color: colors.text, fontWeight: "600" }}>Cancel</Text></Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Save profile photo" onPress={() => void savePhoto()} disabled={photoBusy} style={{ flex: 1, minHeight: 48, justifyContent: "center", alignItems: "center", borderRadius: 10, backgroundColor: colors.primary, opacity: photoBusy ? 0.5 : 1 }}>{photoBusy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>Save photo</Text>}</Pressable>
                </View>
              </>}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </ScreenShell>
  );
}
