import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { api } from "../../core/api/chatco-api";
import type { Driver, Remittance, Shift, Unit } from "../../core/domain/types";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import { Header, Loading, ModalShell, ScreenShell } from "../../shared/ui";

export function VerificationScreen({ onStarted }: { onStarted: (shift: Shift) => void }) {
  const { colors, styles } = useAppTheme();
  const [units, setUnits] = useState<Unit[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pendingRemittances, setPendingRemittances] = useState<Remittance[]>([]);
  const [declaredAmounts, setDeclaredAmounts] = useState<Record<string, string>>({});
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [availableUnits, availableDrivers, remittances] = await Promise.all([api.units(), api.drivers(), api.remittances()]);
      setUnits(availableUnits);
      setDrivers(availableDrivers);
      setPendingRemittances(remittances.filter(item => String(item.remittance_status ?? item.status).toUpperCase() === "PENDING"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load assignments.");
    } finally {
      setLoading(false);
    }
  };

  const resolvePending = async (remittance: Remittance) => {
    const id = String(remittance.shift_id ?? "");
    const declared = Number(declaredAmounts[id] ?? "");
    if (!id || !Number.isFinite(declared) || declared < 0) {
      setError("Enter the physical cash amount before completing this pending remittance.");
      return;
    }
    setResolvingId(id);
    setError("");
    try {
      await api.remit({
        shiftId: id,
        conductorName: "",
        unitNumber: remittance.unit_number ?? "",
        route: "",
        driverName: remittance.driver_name ?? "",
        timeIn: remittance.time_in ?? "",
        timeOut: remittance.time_out ?? null,
        isActive: false,
      }, Number(remittance.cash_total ?? 0), Number(remittance.gcash_total ?? 0), declared);
      setPendingRemittances(current => current.filter(item => item.shift_id !== id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to complete pending remittance.");
    } finally {
      setResolvingId(null);
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
      <Text style={[styles.title, { textAlign: "center" }]}>CHATCO.</Text>
      <Text style={[styles.label, { textAlign: "center", marginBottom: 32 }]}>Conductor Portal</Text>
      <Header
        title={unit ? "Select Your Driver" : "Select Your Unit"}
        subtitle={unit ? "Choose the driver you will assist today." : "Choose the vehicle assigned to this shift."}
      />
      {pendingRemittances.length ? <View style={styles.card}>
        <Text style={styles.cardTitle}>Pending remittance</Text>
        <Text style={styles.subtitle}>A previous shift was closed automatically. Complete the physical cash declaration before starting a new shift.</Text>
        {pendingRemittances.map(item => {
          const id = String(item.shift_id ?? "");
          return <View key={id} style={[styles.card, { marginTop: 12 }]}>
            <Text style={styles.label}>Unit {item.unit_number ?? "—"} · {item.date ?? "Previous shift"}</Text>
            <Text style={styles.subtitle}>Expected cash: ₱{Number(item.cash_total ?? 0).toFixed(2)}</Text>
            <TextInput
              value={declaredAmounts[id] ?? ""}
              onChangeText={value => setDeclaredAmounts(current => ({ ...current, [id]: value }))}
              keyboardType="decimal-pad"
              style={styles.input}
              placeholder="Physical cash counted"
              placeholderTextColor={colors.muted}
            />
            <Pressable disabled={resolvingId === id} style={[styles.button, resolvingId === id && { opacity: 0.55 }]} onPress={() => void resolvePending(item)}>
              <Text style={styles.buttonText}>{resolvingId === id ? "Submitting…" : "Complete remittance"}</Text>
            </Pressable>
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
