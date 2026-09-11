import { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../core/api/chatco-api";
import type { Driver, Remittance, Shift, Unit } from "../../core/domain/types";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import { Header, Loading, ScreenShell } from "../../shared/ui";
import { AssignmentCard } from "./components/AssignmentCard";
import { OfflineDepotNotice } from "./components/OfflineDepotNotice";
import { ShiftSetupModal } from "./components/ShiftSetupModal";

export function VerificationScreen({
  onStarted,
  onLogout,
  onCompleteRemittance,
}: {
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
  const [isOfflineDepot, setIsOfflineDepot] = useState(false);
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
      const isConnected = await api.checkConnectivity().catch(() => false);
      setIsOfflineDepot(!isConnected);
      const [availableUnits, availableDrivers, remittances] = await Promise.all([
        api.units(),
        api.drivers(),
        api.remittances().catch(() => []),
      ]);
      setUnits(availableUnits);
      setDrivers(availableDrivers);
      setPendingRemittances(
        remittances.filter((item) => {
          const status = String(item.remittance_status ?? item.status).toUpperCase();
          return ["PENDING", "FOR CASH DECLARATION", "OVERDUE"].includes(status);
        }),
      );
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
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <View>
          <Text style={styles.title}>CHATCO.</Text>
          <Text style={[styles.label, { marginTop: 2 }]}>Conductor Portal</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log out"
          disabled={loggingOut}
          onPress={() => void handleLogout()}
          style={[
            styles.button,
            styles.secondaryButton,
            {
              minHeight: 36,
              paddingHorizontal: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            },
          ]}
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

      <OfflineDepotNotice
        isOfflineDepot={isOfflineDepot}
        pendingRemittances={pendingRemittances}
        onCompleteRemittance={onCompleteRemittance}
      />

      {unit ? (
        <Pressable
          onPress={() => {
            setUnit(null);
            setDriver(null);
            setError("");
          }}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, marginVertical: 12 }}
        >
          <Ionicons name="arrow-back" size={16} color={colors.primaryLight} />
          <Text style={{ color: colors.primaryLight, fontSize: 13, fontWeight: "700" }}>Change unit</Text>
        </Pressable>
      ) : null}

      <View style={{ gap: 10, marginTop: 8 }}>
        {records.map((item) => (
          <AssignmentCard
            key={item.id}
            item={item}
            onSelect={(selectedItem) => {
              if ("unitNumber" in selectedItem) {
                setUnit(selectedItem as Unit);
              } else {
                setDriver(selectedItem as Driver);
              }
            }}
          />
        ))}
      </View>

      {!error && records.length === 0 ? (
        <Text style={styles.error}>No assignment records were returned.</Text>
      ) : null}
      {error ? (
        <>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => void load()}>
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>Retry</Text>
          </Pressable>
        </>
      ) : null}

      <ShiftSetupModal
        visible={driver !== null}
        onClose={() => !busy && setDriver(null)}
        busy={busy}
        unit={unit}
        driver={driver}
        isOfflineDepot={isOfflineDepot}
        error={error}
        onConfirm={() => void confirm()}
      />
    </ScreenShell>
  );
}
