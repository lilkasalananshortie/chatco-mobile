import { useEffect, useState } from "react";
import * as Location from "expo-location";
import { Pressable, Text, View } from "react-native";
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
  useEffect(() => {
    void Promise.all([api.profile(), api.transactions(shift.shiftId), appStorage.getItem(SCAN_SOUND_KEY)])
      .then(([p, t, sound]) => { setProfile(p); setTransactions(t); setScanSound(sound !== "off"); })
      .catch(() => undefined);
  }, [shift.shiftId]);
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
    try {
      await api.logout();
    } finally {
      setLogout(false);
      onLogout();
    }
  };
  const info = (label: string, value: string) => <View style={styles.card}><Text style={styles.label}>{label}</Text><Text style={styles.cardTitle}>{value}</Text></View>;
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
    <Pressable disabled style={[styles.button, styles.secondaryButton, { opacity: .4 }]}><Text style={[styles.buttonText, styles.secondaryButtonText]}>Change Password · Soon</Text></Pressable>
    <Pressable disabled style={[styles.button, styles.secondaryButton, { opacity: .4 }]}><Text style={[styles.buttonText, styles.secondaryButtonText]}>Push Notifications · Soon</Text></Pressable>
    <Text style={[styles.label, { marginTop: 22 }]}>Emergency</Text>
    <Pressable style={[styles.button, { backgroundColor: "#9F1239" }]} onPress={() => { setSosStatus(""); setSos(true); }}><Text style={[styles.buttonText, { color: "#fff" }]}>Emergency SOS</Text></Pressable>
    <Text style={[styles.label, { marginTop: 22 }]}>Data & Storage</Text>
    <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => setClear(true)}><Text style={[styles.buttonText, styles.secondaryButtonText]}>Clear App Cache</Text></Pressable>
    {transactions.length > 0 ? <Text style={styles.subtitle}>Logging out does not end the active shift or remove its collections.</Text> : null}
    <Pressable style={[styles.button, { backgroundColor: "#9F1239" }]} onPress={() => setLogout(true)}><Text style={[styles.buttonText, { color: "#fff" }]}>Log Out</Text></Pressable>
    <ModalShell visible={clear} title="Clear App Cache?" onClose={() => setClear(false)}><Text style={styles.subtitle}>Temporary cached data will be removed. Transactions, ratings, shift history, and authentication are not affected.</Text><Pressable style={styles.button} onPress={() => void clearCache()}><Text style={styles.buttonText}>Clear Cache</Text></Pressable></ModalShell>
    <ModalShell visible={logout} title="Log Out?" onClose={() => setLogout(false)}><Text style={styles.subtitle}>You will need to sign in again to continue.</Text><Pressable style={[styles.button, { backgroundColor: "#9F1239" }]} onPress={() => void signOut()}><Text style={[styles.buttonText, { color: "#fff" }]}>Confirm Log Out</Text></Pressable></ModalShell>
    <ModalShell visible={sos} title="Emergency SOS" onClose={() => setSos(false)}><Text style={sosStatus.includes("could") || sosStatus.includes("permission") ? styles.error : styles.subtitle}>{sosStatus || "Send an emergency alert and your current location to dispatch?"}</Text>{!sosStatus || sosStatus.includes("could") || sosStatus.includes("permission") ? <Pressable style={[styles.button, { backgroundColor: "#9F1239" }]} onPress={() => void sendSos()}><Text style={[styles.buttonText, { color: "#fff" }]}>Activate SOS</Text></Pressable> : null}<Pressable style={[styles.button, styles.secondaryButton]} onPress={() => setSos(false)}><Text style={[styles.buttonText, styles.secondaryButtonText]}>Close</Text></Pressable></ModalShell>
  </ScreenShell>;
}
