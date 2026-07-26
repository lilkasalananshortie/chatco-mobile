import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { api } from "../../core/api/chatco-api";
import type { Driver, Shift, Unit } from "../../core/domain/types";
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

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [availableUnits, availableDrivers] = await Promise.all([api.units(), api.drivers()]);
      setUnits(availableUnits);
      setDrivers(availableDrivers);
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
      <Text style={[styles.title, { textAlign: "center" }]}>CHATCO.</Text>
      <Text style={[styles.label, { textAlign: "center", marginBottom: 32 }]}>Conductor Portal</Text>
      <Header
        title={unit ? "Select Your Driver" : "Select Your Unit"}
        subtitle={unit ? "Choose the driver you will assist today." : "Choose the vehicle assigned to this shift."}
      />
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
