import { useEffect, useState } from "react";
import * as Location from "expo-location";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { api } from "../../core/api/chatco-api";
import { appStorage } from "../../core/storage/app-storage";
import { Header, ModalShell, ScreenShell } from "../../shared/ui";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import type { ConductorProfile, Shift, Transaction, User } from "../../core/domain/types";

const SCAN_SOUND_KEY = "conductor_scan_sound";

export function SettingsScreen({ user, shift, onLogout }: {
  user: User; shift: Shift; onLogout: () => void;
}) {
  const { isLofi, setLofi, styles } = useAppTheme();
  const [profile, setProfile] = useState<ConductorProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [scanSound, setScanSound] = useState(true);
  const [clear, setClear] = useState(false);
  const [logout, setLogout] = useState(false);
  const [sos, setSos] = useState(false);
  const [sosStatus, setSosStatus] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordStep, setPasswordStep] = useState<"request" | "verify" | "reset" | "done">("request");
  const [resetEmail, setResetEmail] = useState(user.email);
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  useEffect(() => {
    void Promise.all([api.profile(), api.transactions(shift.shiftId), appStorage.getItem(SCAN_SOUND_KEY)])
      .then(([p, t, sound]) => { setProfile(p); setTransactions(t); setScanSound(sound !== "off"); })
      .catch(() => undefined);
  }, [shift.shiftId]);
  useEffect(() => {
    setResetEmail(user.email);
  }, [user.email]);
  const toggleSound = async () => {
    const next = !scanSound; setScanSound(next); await appStorage.setItem(SCAN_SOUND_KEY, next ? "on" : "off");
  };
  const clearCache = async () => {
    await appStorage.removeItem("conductor_app_cache");
    await appStorage.removeItem("leaflet_tile_cache");
    setClear(false);
  };
  const sendSos = async () => {
    setSosStatus("Getting your location…");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") throw new Error("Location permission is required.");
      const p = await Location.getCurrentPositionAsync({});
      setSosStatus("Sending distress signal…");
      await api.sos(p.coords.latitude, p.coords.longitude, "Emergency alert from conductor settings");
      setSosStatus("Signal received by dispatch.");
    } catch (e) { setSosStatus(e instanceof Error ? e.message : "SOS could not be sent."); }
  };
  const signOut = async () => {
    let logoutAttempted = false;
    try {
      const pending = await api.pendingCashCount();
      if (pending > 0) {
        setLogout(false);
        Alert.alert("Pending offline cash", "Reconnect and synchronize the pending cash transactions before logging out.");
        return;
      }
      logoutAttempted = true;
      await api.logout();
    } catch (cause) {
      if (!logoutAttempted) {
        Alert.alert("Unable to log out", cause instanceof Error ? cause.message : "Check your pending offline cash and try again.");
      }
    } finally {
      setLogout(false);
      // api.logout removes the local token even when the server is briefly
      // unreachable, so leave the UI only after a logout was actually
      // attempted. A queue/storage failure must not discard the session.
      if (logoutAttempted) onLogout();
    }
  };
  const info = (label: string, value: string) => <View style={styles.card}><Text style={styles.label}>{label}</Text><Text style={styles.cardTitle}>{value}</Text></View>;
  const resetPasswordFlow = async () => {
    if (passwordBusy) return;
    setPasswordBusy(true);
    setPasswordMessage("");
    try {
      if (passwordStep === "request") {
        await api.forgotPassword(resetEmail.trim());
        setPasswordStep("verify");
        setPasswordMessage("A reset code was sent to your email.");
        return;
      }
      if (passwordStep === "verify") {
        await api.verifyResetCode(resetEmail.trim(), resetCode.trim());
        setPasswordStep("reset");
        setPasswordMessage("Code verified. Enter your new password.");
        return;
      }
      if (newPassword !== confirmPassword) {
        throw new Error("The new password confirmation does not match.");
      }
      await api.resetPassword({
        email: resetEmail.trim(),
        code: resetCode.trim(),
        password: newPassword,
        passwordConfirmation: confirmPassword,
      });
      setPasswordStep("done");
      setPasswordMessage("Password updated successfully. You can now sign in again with the new password.");
    } catch (cause) {
      setPasswordMessage(cause instanceof Error ? cause.message : "Unable to change password.");
    } finally {
      setPasswordBusy(false);
    }
  };
  const closePasswordModal = () => {
    if (passwordBusy) return;
    setPasswordOpen(false);
    setPasswordStep("request");
    setResetCode("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage("");
  };
  return <ScreenShell>
    <Header title="Settings" subtitle="Manage your app preferences and account." />
    <Text style={[styles.label, { marginTop: 20 }]}>Profile · Managed by Admin</Text>
    {info("Name", profile?.name ?? user.name)}
    {info("Username", profile?.username ?? user.email)}
    {info("Phone Number", profile?.phoneNumber ?? "—")}
    <Text style={[styles.label, { marginTop: 22 }]}>Active Assignment</Text>
    {info("Current Unit", shift.unitNumber)}
    {info("Assigned Driver", shift.driverName)}
    {info("Route", shift.route || "—")}
    <Text style={[styles.label, { marginTop: 22 }]}>App Preferences</Text>
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: scanSound }} style={[styles.button, styles.secondaryButton]} onPress={() => void toggleSound()}><Text style={[styles.buttonText, styles.secondaryButtonText]}>Scan Sound: {scanSound ? "On" : "Off"}</Text></Pressable>
    <Text style={styles.subtitle}>Play sound after a successful passenger scan.</Text>
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: isLofi }} style={[styles.button, styles.secondaryButton]} onPress={() => void setLofi(!isLofi)}><Text style={[styles.buttonText, styles.secondaryButtonText]}>Lo-Fi mode: {isLofi ? "On" : "Off"}</Text></Pressable>
    <Text style={styles.subtitle}>Same screens and workflows with a low-distraction visual system.</Text>
    <Text style={[styles.label, { marginTop: 22 }]}>Account & Security</Text>
    <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => { setPasswordOpen(true); setPasswordStep("request"); setPasswordMessage(""); }}>
      <Text style={[styles.buttonText, styles.secondaryButtonText]}>Change Password</Text>
    </Pressable>
    <Text style={styles.subtitle}>Use the email tied to this conductor account to request a reset code.</Text>
    <Pressable disabled style={[styles.button, styles.secondaryButton, { opacity: .4 }]}>
      <Text style={[styles.buttonText, styles.secondaryButtonText]}>Push Notifications follow device settings</Text>
    </Pressable>
    <Text style={[styles.label, { marginTop: 22 }]}>Emergency</Text>
    <Pressable style={[styles.button, { backgroundColor: "#9F1239" }]} onPress={() => { setSosStatus(""); setSos(true); }}><Text style={[styles.buttonText, { color: "#fff" }]}>Emergency SOS</Text></Pressable>
    <Text style={[styles.label, { marginTop: 22 }]}>Data & Storage</Text>
    <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => setClear(true)}><Text style={[styles.buttonText, styles.secondaryButtonText]}>Clear App Cache</Text></Pressable>
    {transactions.length > 0 ? <Text style={styles.subtitle}>Logging out does not end the active shift or remove its collections.</Text> : null}
    <Pressable style={[styles.button, { backgroundColor: "#9F1239" }]} onPress={() => setLogout(true)}><Text style={[styles.buttonText, { color: "#fff" }]}>Log Out</Text></Pressable>
    <ModalShell visible={clear} title="Clear App Cache?" onClose={() => setClear(false)}><Text style={styles.subtitle}>Temporary cached data will be removed. Transactions, ratings, shift history, and authentication are not affected.</Text><Pressable style={styles.button} onPress={() => void clearCache()}><Text style={styles.buttonText}>Clear Cache</Text></Pressable></ModalShell>
    <ModalShell visible={logout} title="Log Out?" onClose={() => setLogout(false)}><Text style={styles.subtitle}>You will need to sign in again to continue.</Text><Pressable style={[styles.button, { backgroundColor: "#9F1239" }]} onPress={() => void signOut()}><Text style={[styles.buttonText, { color: "#fff" }]}>Confirm Log Out</Text></Pressable></ModalShell>
    <ModalShell visible={sos} title="Emergency SOS" onClose={() => setSos(false)}><Text style={sosStatus.includes("could") || sosStatus.includes("permission") ? styles.error : styles.subtitle}>{sosStatus || "Send an emergency alert and your current location to dispatch?"}</Text>{!sosStatus || sosStatus.includes("could") || sosStatus.includes("permission") ? <Pressable style={[styles.button, { backgroundColor: "#9F1239" }]} onPress={() => void sendSos()}><Text style={[styles.buttonText, { color: "#fff" }]}>Activate SOS</Text></Pressable> : null}<Pressable style={[styles.button, styles.secondaryButton]} onPress={() => setSos(false)}><Text style={[styles.buttonText, styles.secondaryButtonText]}>Close</Text></Pressable></ModalShell>
    <ModalShell visible={passwordOpen} title="Change Password" onClose={closePasswordModal}>
      <Text style={styles.subtitle}>This uses the email tied to your account and the existing ChatCo password reset flow.</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          value={resetEmail}
          onChangeText={setResetEmail}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={passwordStep === "request"}
          placeholderTextColor={undefined}
        />
      </View>
      {passwordStep !== "request" ? (
        <View style={styles.card}>
          <Text style={styles.label}>Reset code</Text>
          <TextInput
            value={resetCode}
            onChangeText={setResetCode}
            style={styles.input}
            keyboardType="number-pad"
            placeholder="6-digit code"
          />
        </View>
      ) : null}
      {passwordStep === "reset" ? (
        <>
          <View style={styles.card}>
            <Text style={styles.label}>New password</Text>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              style={styles.input}
              secureTextEntry
              placeholder="Enter new password"
            />
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={styles.input}
              secureTextEntry
              placeholder="Confirm new password"
            />
          </View>
        </>
      ) : null}
      {passwordMessage ? <Text style={styles.subtitle}>{passwordMessage}</Text> : null}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable style={[styles.button, styles.secondaryButton, { flex: 1 }]} onPress={closePasswordModal} disabled={passwordBusy}>
          <Text style={styles.buttonText}>Close</Text>
        </Pressable>
        <Pressable style={[styles.button, { flex: 1, opacity: passwordBusy ? 0.6 : 1 }]} onPress={() => void resetPasswordFlow()} disabled={passwordBusy}>
          <Text style={styles.buttonText}>
            {passwordBusy ? "Working..." : passwordStep === "request" ? "Send Code" : passwordStep === "verify" ? "Verify Code" : passwordStep === "reset" ? "Update Password" : "Done"}
          </Text>
        </Pressable>
      </View>
      {passwordStep === "done" ? <Text style={styles.subtitle}>Close this dialog, then sign in again with your new password.</Text> : null}
    </ModalShell>
  </ScreenShell>;
}
