import { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../core/api/chatco-api";
import type { Driver, Remittance, Shift, Unit } from "../../core/domain/types";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import { Header, Loading, ModalShell, ScreenShell } from "../../shared/ui";

export function VerificationScreen({ onStarted, onLogout, onCompleteRemittance }: {
  onStarted: (shift: Shift) => void;
  onLogout?: () => void;
  onCompleteRemittance?: (remittance: Remittance) => void;
}) {
  const { colors, styles } = useAppTheme();
  const [units, setUnits] = useState<Unit[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [pendingRemittances, setPendingRemittances] = useState<Remittance[]>([]);

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
    setError("");
    try {
      const [availableUnits, availableDrivers, remittances] = await Promise.all([api.units(), api.drivers(), api.remittances()]);
      setUnits(availableUnits);
      setDrivers(availableDrivers);
      setPendingRemittances(remittances.filter(item => {
        const status = String(item.remittance_status ?? item.status).toUpperCase();
        return ["PENDING", "FOR CASH DECLARATION", "OVERDUE"].includes(status);
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load assignments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) return <Loading label="Checking assigned units…" />;

  const confirm = async () => {
    if (!unit || !driver) return;
    setBusy(true);
    setError("");
    try {
      onStarted(await api.startShift(unit, driver));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start shift.");
    } finally {
      setBusy(false);
    }
  };

  const records: Array<Unit | Driver> = unit ? drivers : units;
  return (
    <ScreenShell>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <View>
          <Text style={styles.title}>CHATCO.</Text>
          <Text style={[styles.label, { marginTop: 2 }]}>Conductor Portal</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log out"
          disabled={loggingOut}
          onPress={() => void handleLogout()}
          style={[styles.button, styles.secondaryButton, { minHeight: 36, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 6 }]}
        >
          <Ionicons name="log-out-outline" size={16} color={colors.text} />
          <Text style={[styles.buttonText, styles.secondaryButtonText, { fontSize: 12 }]}>
            {loggingOut ? "Signing out..." : "Log Out"}
          </Text>
        </Pressable>
      </View>
      <Header
        title={unit ? "Select Your Driver" : "Select Your Unit"}
        subtitle={unit ? "Choose the driver you will assist today." : "Choose the vehicle assigned to this shift."}
      />
      {pendingRemittances.length ? <View style={styles.card}>
        <Text style={styles.cardTitle}>Pending cash declaration</Text>
        <Text style={styles.subtitle}>A previous shift was submitted. Admin will count the physical cash and record the official declaration.</Text>
        {pendingRemittances.map(item => {
          const id = String(item.shift_id ?? "");
          return <View key={id} style={[styles.card, { marginTop: 12 }]}>
            <Text style={styles.label}>Unit {item.unit_number ?? "—"} · {item.date ?? "Previous shift"}</Text>
            <Text style={styles.subtitle}>Expected cash: ₱{Number(item.cash_total ?? 0).toFixed(2)}</Text>
            <Text style={styles.subtitle}>Status: {String(item.remittance_status ?? item.status ?? "PENDING")}</Text>
            {onCompleteRemittance ? (
              <Pressable
                style={[styles.button, { marginTop: 10, backgroundColor: "#D97706" }]}
                onPress={() => onCompleteRemittance(item)}
              >
                <Text style={[styles.buttonText, { color: "#fff", fontWeight: "700" }]}>Complete Remittance</Text>
              </Pressable>
            ) : null}
          </View>;
        })}
      </View> : null}
      {unit ? (
        <Pressable onPress={() => { setUnit(null); setDriver(null); setError(""); }}>
          <Text style={{ color: colors.primaryLight, marginTop: 18 }}>‹ Change unit</Text>
        </Pressable>
      ) : null}

      {records.map(item => {
        const available = item.status === "available";
        return (
          <Pressable
            key={item.id}
            disabled={!available}
            style={[styles.card, !available && { opacity: 0.45 }]}
            onPress={() => unit ? setDriver(item as Driver) : setUnit(item as Unit)}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{"unitNumber" in item ? item.unitNumber : item.name}</Text>
                {"plateNumber" in item
                  ? <Text style={styles.subtitle}>{item.plateNumber} · {item.route}</Text>
                  : <Text style={styles.subtitle}>{available ? "Ready for dispatch" : "Currently on shift"}</Text>}
              </View>
              <Text style={[styles.label, { color: available ? colors.success : colors.muted }]}>
                {available ? "Available" : item.status === "maintenance" ? "Maintenance" : "In use"}
              </Text>
            </View>
          </Pressable>
        );
      })}
      {!error && records.length === 0 ? <Text style={styles.error}>No assignment records were returned.</Text> : null}
      {error ? (
        <>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => void load()}>
            <Text style={styles.buttonText}>Retry</Text>
          </Pressable>
        </>
      ) : null}

      <ModalShell visible={driver !== null} title="Start shift?" onClose={() => !busy && setDriver(null)}>
        <Text style={styles.subtitle}>Review your assignment before beginning GPS broadcasting and fare collection.</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Unit</Text>
          <Text style={styles.cardTitle}>{unit?.unitNumber} · {unit?.plateNumber}</Text>
          <Text style={[styles.label, { marginTop: 14 }]}>Route</Text>
          <Text style={styles.cardTitle}>{unit?.route}</Text>
          <Text style={[styles.label, { marginTop: 14 }]}>Driver</Text>
          <Text style={styles.cardTitle}>{driver?.name}</Text>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            disabled={busy}
            onPress={() => setDriver(null)}
            style={[styles.button, styles.secondaryButton, { flex: 1 }]}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </Pressable>
          <Pressable
            disabled={busy}
            onPress={() => void confirm()}
            style={[styles.button, { flex: 1 }, busy && { opacity: 0.55 }]}
          >
            <Text style={styles.buttonText}>{busy ? "Starting…" : "Confirm and start"}</Text>
          </Pressable>
        </View>
      </ModalShell>
    </ScreenShell>
  );
}
