import { useEffect, useMemo, useState } from "react";
import * as Location from "expo-location";
import { Platform, Pressable, Text, View } from "react-native";
import { api } from "../../core/api/chatco-api";
import type { Capacity, HailRequest, Shift, ShiftEarnings, Transaction } from "../../core/domain/types";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import { Header, ModalShell, ScreenShell } from "../../shared/ui";
import { LiveMap } from "./LiveMap";
import { TransactionHistoryModal } from "./TransactionHistoryModal";

type SosState = "confirm" | "locating" | "sending" | "active" | "responded" | "error";

export function DashboardScreen({ shift, refreshKey }: { shift: Shift; refreshKey: number }) {
  const { colors, styles } = useAppTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [earnings, setEarnings] = useState<ShiftEarnings | null>(null);
  const [capacity, setCapacity] = useState<Capacity>("AVAILABLE");
  const [history, setHistory] = useState(false);
  const [sos, setSos] = useState(false);
  const [sosStatus, setSosStatus] = useState<SosState>("confirm");
  const [sosAlertId, setSosAlertId] = useState<string | null>(null);
  const [sosSeconds, setSosSeconds] = useState(0);
  const [hails, setHails] = useState<HailRequest[]>([]);
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState("");
  const [mapEnabled, setMapEnabled] = useState(Platform.OS === "web");

  useEffect(() => {
    void Promise.all([api.transactions(shift.shiftId), api.earnings(shift.shiftId)])
      .then(([records, authoritativeEarnings]) => {
        setTransactions(records);
        setEarnings(authoritativeEarnings);
      })
      .catch(cause => setError(cause instanceof Error ? cause.message : "Unable to load shift data."));
  }, [shift.shiftId, refreshKey]);

  useEffect(() => {
    const load = () => void api.hails().then(setHails).catch(() => undefined);
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!mapEnabled) return;
    let subscription: Location.LocationSubscription | null = null;
    void Location.requestForegroundPermissionsAsync()
      .then(async permission => {
        if (permission.status !== "granted") return;
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 25 },
          location => {
            setPosition({ latitude: location.coords.latitude, longitude: location.coords.longitude });
            void api.location(
              location.coords.latitude,
              location.coords.longitude,
              location.coords.speed,
              location.coords.heading,
            ).catch(() => undefined);
          },
        );
      })
      .catch(() => setError("Live location is unavailable. The rest of the dashboard is still usable."));
    return () => subscription?.remove();
  }, [mapEnabled]);

  useEffect(() => {
    if (sosStatus !== "active" || !sosAlertId) return;
    const elapsed = setInterval(() => setSosSeconds(value => value + 1), 1000);
    const poll = setInterval(() => {
      void api.sosStatus(sosAlertId).then(alert => {
        if (alert.status === "ACKNOWLEDGED" || alert.status === "RESOLVED") setSosStatus("responded");
      }).catch(() => undefined);
    }, 3000);
    return () => {
      clearInterval(elapsed);
      clearInterval(poll);
    };
  }, [sosAlertId, sosStatus]);

  const transactionTotals = useMemo(() => transactions.reduce((sum, transaction) => {
    sum.total += transaction.finalAmount;
    if (transaction.paymentMethod === "Cash") sum.cash += transaction.finalAmount;
    else if (transaction.paymentMethod === "Voucher") sum.voucher += transaction.finalAmount;
    else sum.gcash += transaction.finalAmount;
    return sum;
  }, { total: 0, cash: 0, gcash: 0, voucher: 0 }), [transactions]);
  const totals = earnings
    ? { ...transactionTotals, total: earnings.total, cash: earnings.cashTotal, gcash: earnings.gcashTotal }
    : transactionTotals;

  const updateCapacity = async (next: Capacity) => {
    const previous = capacity;
    setCapacity(next);
    setError("");
    try {
      await api.capacity(next);
    } catch (cause) {
      setCapacity(previous);
      setError(cause instanceof Error ? cause.message : "Unable to update capacity.");
    }
  };

  const handleHail = async (id: string, action: "accept" | "reject") => {
    try {
      if (action === "accept") await api.acceptHail(id);
      else await api.rejectHail(id);
      setHails(current => current.filter(hail => hail.id !== id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update pickup request.");
    }
  };

  const sendSos = async () => {
    setSosStatus("locating");
    setError("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      const location = permission.status === "granted"
        ? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).catch(() => null)
        : null;
      setSosStatus("sending");
      const alert = await api.sos(
        location?.coords.latitude ?? 14.8434,
        location?.coords.longitude ?? 120.875,
        "Emergency alert from conductor mobile app",
      );
      setSosAlertId(alert.id);
      setSosStatus(alert.status === "ACTIVE" ? "active" : "responded");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to send SOS.");
      setSosStatus("error");
    }
  };

  const closeSos = () => {
    if (sosStatus === "active" || sosStatus === "locating" || sosStatus === "sending") return;
    setSos(false);
    setSosStatus("confirm");
    setSosAlertId(null);
    setSosSeconds(0);
  };

  return (
    <ScreenShell>
      <Header title={`Unit ${shift.unitNumber}`} subtitle={`${shift.route || "Active route"} · ${shift.driverName}`} eyebrow="Conductor Dashboard" />

      <View style={[styles.card, { flexDirection: "row", alignItems: "center" }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Total Collected</Text>
          <Text style={styles.title}>{`\u20B1${totals.total.toFixed(2)}`}</Text>
          <Text style={styles.subtitle}>{transactions.length} passenger transactions</Text>
        </View>
        <Pressable style={[styles.button, styles.secondaryButton, { marginTop: 0 }]} onPress={() => setHistory(true)}>
          <Text style={styles.buttonText}>History</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <CollectionBox label="GCash" value={totals.gcash} color={colors.primaryLight} />
        <CollectionBox label="Cash" value={totals.cash} color={colors.success} />
        <CollectionBox label="Voucher" value={transactionTotals.voucher} color={colors.warning} />
      </View>

      <Text style={[styles.label, { marginTop: 22 }]}>Passenger Capacity</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["AVAILABLE", "STANDING", "FULL"] as Capacity[]).map(value => (
          <Pressable
            key={value}
            onPress={() => void updateCapacity(value)}
            style={[styles.button, styles.secondaryButton, {
              flex: 1,
              backgroundColor: capacity === value ? colors.primary : colors.surface2,
              borderColor: capacity === value ? colors.primaryLight : colors.border,
            }]}
          >
            <Text style={[styles.buttonText, { fontSize: 11 }]}>{value === "AVAILABLE" ? "Available" : value === "STANDING" ? "Standing" : "Full"}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { marginTop: 22 }]}>Live Route</Text>
      {mapEnabled ? (
        <LiveMap latitude={position?.latitude} longitude={position?.longitude} hails={hails} unitNumber={shift.unitNumber} />
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Live map is paused</Text>
          <Text style={styles.subtitle}>Load the map when you need route tracking. This prevents heavy map and GPS services from delaying app startup.</Text>
          <Pressable style={styles.button} onPress={() => setMapEnabled(true)}>
            <Text style={styles.buttonText}>Load live map</Text>
          </Pressable>
        </View>
      )}

      {hails.length ? (
        <>
          <Text style={[styles.label, { marginTop: 22 }]}>Pickup Requests</Text>
          {hails.map(hail => (
            <View key={hail.id} style={styles.card}>
              <Text style={styles.cardTitle}>{hail.commuterName}</Text>
              <Text style={styles.subtitle}>{hail.label || "Passenger waiting"}{hail.etaMinutes ? ` · ${hail.etaMinutes} min away` : ""}</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable onPress={() => void handleHail(hail.id, "accept")} style={[styles.button, { flex: 1 }]}><Text style={styles.buttonText}>Accept</Text></Pressable>
                <Pressable onPress={() => void handleHail(hail.id, "reject")} style={[styles.button, styles.secondaryButton, { flex: 1 }]}><Text style={styles.buttonText}>Reject</Text></Pressable>
              </View>
            </View>
          ))}
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable onPress={() => setSos(true)} style={[styles.button, { backgroundColor: "#9F1239", marginTop: 22 }]}>
        <Text style={[styles.buttonText, { color: "#fff" }]}>Emergency SOS</Text>
      </Pressable>

      <TransactionHistoryModal visible={history} transactions={transactions} onClose={() => setHistory(false)} />
      <ModalShell visible={sos} title="Emergency SOS" onClose={closeSos}>
        <Text style={sosStatus === "error" ? styles.error : styles.cardTitle}>
          {sosStatus === "confirm" ? "Send Emergency SOS?"
            : sosStatus === "locating" ? "Getting your location..."
            : sosStatus === "sending" ? "Sending distress signal..."
            : sosStatus === "active" ? `SOS Active | ${String(Math.floor(sosSeconds / 60)).padStart(2, "0")}:${String(sosSeconds % 60).padStart(2, "0")}`
            : sosStatus === "responded" ? "Dispatch Responded"
            : "SOS Could Not Be Sent"}
        </Text>
        <Text style={styles.subtitle}>
          {sosStatus === "responded"
            ? "Dispatch acknowledged or resolved your emergency alert."
            : sosStatus === "active"
              ? "Your SOS is active. Keep this screen open while waiting for dispatch."
              : "This sends an emergency alert and your current GPS location to dispatch."}
        </Text>
        {sosStatus === "confirm" || sosStatus === "error" ? (
          <Pressable style={[styles.button, { backgroundColor: "#9F1239" }]} onPress={() => void sendSos()}>
            <Text style={[styles.buttonText, { color: "#fff" }]}>{sosStatus === "error" ? "Retry" : "Activate SOS"}</Text>
          </Pressable>
        ) : null}
        {sosStatus === "responded" ? <Pressable style={styles.button} onPress={closeSos}><Text style={styles.buttonText}>Done</Text></Pressable> : null}
      </ModalShell>
    </ScreenShell>
  );

  function CollectionBox({ label, value, color }: { label: string; value: number; color: string }) {
    return (
      <View style={[styles.card, { flex: 1, padding: 12 }]}>
        <Text style={{ color, opacity: .65, fontSize: 8, fontWeight: "800" }}>{label.toUpperCase()}</Text>
        <Text style={{ color, fontSize: 13, fontWeight: "900", marginTop: 2 }}>{`\u20B1${value.toFixed(2)}`}</Text>
      </View>
    );
  }
}
