import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Location from "expo-location";
import { AppState, Platform, Pressable, Text, View } from "react-native";
import { api } from "../../core/api/chatco-api";
import type { Capacity, HailRequest, Shift, ShiftEarnings, Transaction } from "../../core/domain/types";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import { Header, ModalShell, ScreenShell } from "../../shared/ui";
import { SlideToConfirm } from "../../shared/ui/SlideToConfirm";
import { LiveMap } from "./LiveMap";
import { TransactionHistoryModal } from "./TransactionHistoryModal";
import { LOCATION_TASK_NAME } from "./location-task";

type SosState = "confirm" | "countdown" | "locating" | "sending" | "active" | "responded" | "error";

export function DashboardScreen({ shift, refreshKey, canOperate, isOnline, onShiftUpdated, onShiftEnded }: { shift: Shift; refreshKey: number; canOperate: boolean; isOnline: boolean; onShiftUpdated?: (shift: Shift) => void; onShiftEnded?: () => void }) {
  const { colors, styles } = useAppTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [earnings, setEarnings] = useState<ShiftEarnings | null>(null);
  const [capacity, setCapacity] = useState<Capacity>("AVAILABLE");
  const [history, setHistory] = useState(false);
  const [sos, setSos] = useState(false);
  const [sosStatus, setSosStatus] = useState<SosState>("confirm");
  const [sosCountdown, setSosCountdown] = useState(5);
  const [sosAlertId, setSosAlertId] = useState<string | null>(null);
  const [sosSeconds, setSosSeconds] = useState(0);
  const [deviceId, setDeviceId] = useState<string>("");
  const [deviceBusy, setDeviceBusy] = useState(false);
  const [deviceError, setDeviceError] = useState("");
  const [hails, setHails] = useState<HailRequest[]>([]);
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState("");
  const [mapEnabled, setMapEnabled] = useState(Platform.OS === "web");
  const [routeCoordinates, setRouteCoordinates] = useState<Array<[number, number]>>([]);
  const [routeSource, setRouteSource] = useState<"backend" | "fallback">("fallback");
  const [isOnBreak, setIsOnBreak] = useState(Boolean(shift.isOnBreak));
  const [announcements, setAnnouncements] = useState<import("../../core/domain/types").Announcement[]>([]);
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);
  const [breakPending, setBreakPending] = useState(false);
  const [breakConfirmOpen, setBreakConfirmOpen] = useState(false);
  const operationalRefreshInFlight = useRef<Promise<void> | null>(null);
  const breakBusy = useRef(false);

  useEffect(() => {
    void api.getDeviceId().then(setDeviceId);
  }, []);

  const refreshOperationalData = useCallback(async () => {
    if (operationalRefreshInFlight.current) return operationalRefreshInFlight.current;
    const request = (async () => {
      try {
        const [records, pendingCount, earnings] = await Promise.all([
          api.transactions(shift.shiftId),
          api.pendingCashCount(shift.shiftId),
          isOnline ? api.earnings(shift.shiftId) : Promise.resolve(null),
        ]);
        setTransactions(records);
        setPendingOfflineCount(pendingCount);
        if (earnings) setEarnings(earnings);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to load shift data.");
      } finally {
        operationalRefreshInFlight.current = null;
      }
    })();
    operationalRefreshInFlight.current = request;
    return request;
  }, [isOnline, shift.shiftId]);

  useEffect(() => {
    void refreshOperationalData();
    const timer = setInterval(() => void refreshOperationalData(), 15000);
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") void refreshOperationalData();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [refreshKey, refreshOperationalData]);

  useEffect(() => {
    setIsOnBreak(Boolean(shift.isOnBreak));
    const loadRoute = () => void api.routeGeometry(shift.routeId)
      .then(route => {
        setRouteCoordinates(route.coordinates);
        setRouteSource(route.source ?? (route.coordinates.length > 1 ? "backend" : "fallback"));
      })
      .catch(() => {
        setRouteCoordinates([]);
        setRouteSource("fallback");
      });
    loadRoute();
    const loadAnnouncements = () => void api.announcements().then(setAnnouncements).catch(() => undefined);
    loadAnnouncements();
    const announcementTimer = setInterval(loadAnnouncements, 30000);
    const routeTimer = setInterval(loadRoute, 60000);
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") {
        loadAnnouncements();
        loadRoute();
      }
    });
    return () => {
      clearInterval(announcementTimer);
      clearInterval(routeTimer);
      subscription.remove();
    };
  }, [refreshKey, shift.shiftId, shift.routeId, shift.isOnBreak]);

  useEffect(() => {
    const load = () => void api.hails().then(setHails).catch(() => undefined);
    load();
    const timer = setInterval(load, 10000);
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") load();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!mapEnabled || !canOperate) {
      if (Platform.OS !== "web") {
        void Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME)
          .then(started => started ? Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME) : undefined)
          .catch(() => undefined);
      }
      return;
    }
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
              location.coords.accuracy,
              new Date(location.timestamp).toISOString(),
            ).catch(() => undefined);
          },
        );
      })
      .catch(() => setError("Live location is unavailable. The rest of the dashboard is still usable."));
    if (Platform.OS === "web") return () => subscription?.remove();
    let backgroundStarted = false;
    void Location.requestBackgroundPermissionsAsync().then(async permission => {
      if (permission.status !== "granted") {
        setError("Background location is disabled. Keep ChatCo open during the shift or allow Always location in Settings.");
        return;
      }
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 15000,
        distanceInterval: 25,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: "ChatCo live shift",
          notificationBody: "ChatCo is sharing this vehicle's location during the active shift.",
        },
      });
      backgroundStarted = true;
    }).catch(() => setError("Background location could not be started."));
    return () => {
      subscription?.remove();
      if (backgroundStarted) void Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => undefined);
    };
  }, [canOperate, mapEnabled]);

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
    if (!canOperate) return;
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

  const updateBreak = async (): Promise<boolean> => {
    if (!canOperate || breakBusy.current) return false;
    breakBusy.current = true;
    setBreakPending(true);
    const next = !isOnBreak;
    setError("");
    setIsOnBreak(next);
    try {
      const updated = await api.breakStatus(next);
      setIsOnBreak(Boolean(updated.isOnBreak));
      onShiftUpdated?.(updated);
      return true;
    } catch (cause) {
      setIsOnBreak(!next);
      setError(cause instanceof Error ? cause.message : "Unable to update break status.");
      return false;
    } finally {
      breakBusy.current = false;
      setBreakPending(false);
    }
  };

  const handleHail = async (id: string, action: "accept" | "reject") => {
    if (!canOperate) return;
    try {
      if (action === "accept") await api.acceptHail(id);
      else await api.rejectHail(id);
      setHails(current => current.filter(hail => hail.id !== id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update pickup request.");
    }
  };

  const ownsShift = Boolean(shift.operatingDeviceId && deviceId && shift.operatingDeviceId === deviceId);
  const unclaimed = !shift.operatingDeviceId;
  const recoveredByAdmin = unclaimed && Boolean(shift.latestDeviceRecoveryAt);
  const showDeviceBanner = !ownsShift || unclaimed;

  const claimDevice = async () => {
    setDeviceBusy(true);
    setDeviceError("");
    try {
      const updated = await api.claimShiftDevice(shift.shiftId);
      onShiftUpdated?.(updated);
    } catch (cause) {
      setDeviceError(cause instanceof Error ? cause.message : "Unable to claim this shift.");
    } finally {
      setDeviceBusy(false);
    }
  };

  const releaseDevice = async () => {
    setDeviceBusy(true);
    setDeviceError("");
    try {
      const pending = await api.pendingCashCount(shift.shiftId);
      if (pending > 0) {
        throw new Error("Offline cash is still waiting to sync. Keep this device connected and try again.");
      }
      const updated = await api.releaseShiftDevice(shift.shiftId);
      onShiftUpdated?.(updated);
    } catch (cause) {
      setDeviceError(cause instanceof Error ? cause.message : "Unable to release this shift.");
    } finally {
      setDeviceBusy(false);
    }
  };

  const DEFAULT_LOCATION = { latitude: 14.8434, longitude: 120.875 };

  const startSosCountdown = () => {
    setSosStatus("countdown");
    setSosCountdown(5);
  };

  const cancelSosCountdown = () => {
    setSosStatus("confirm");
    setSosCountdown(5);
  };

  useEffect(() => {
    if (sosStatus !== "countdown") return;
    if (sosCountdown <= 0) {
      void sendSos();
      return;
    }
    const timer = setTimeout(() => {
      setSosCountdown(c => c - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [sosStatus, sosCountdown]);

  const sendSos = async () => {
    setSosStatus("locating");
    setError("");
    let coords = DEFAULT_LOCATION;
    try {
      const permission = await Location.requestForegroundPermissionsAsync().catch(() => null);
      if (permission?.status === "granted") {
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).catch(() => null);
        if (location) {
          coords = { latitude: location.coords.latitude, longitude: location.coords.longitude };
        }
      }
      setSosStatus("sending");
      const alert = await api.sos(
        coords.latitude,
        coords.longitude,
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
    setSosCountdown(5);
    setSosAlertId(null);
    setSosSeconds(0);
  };

  return (
    <ScreenShell>
      {!isOnline ? <Text style={[styles.error, { marginBottom: 12 }]}>Offline mode: cash fares are saved on this device and will sync automatically. GCash is unavailable.</Text> : null}
      <Header title={`Unit ${shift.unitNumber}`} subtitle={`${shift.route || "Active route"} · ${shift.driverName}`} eyebrow="Conductor Dashboard" />

      {showDeviceBanner ? (
        <View style={{
          backgroundColor: ownsShift ? "#0284C720" : "#D9770620",
          borderColor: ownsShift ? "#38BDF860" : "#F59E0B60",
          borderWidth: 1,
          borderRadius: 14,
          padding: 14,
          marginVertical: 12,
        }}>
          <Text style={{ color: ownsShift ? "#BAE6FD" : "#FDE68A", fontSize: 14, fontWeight: "700" }}>
            {recoveredByAdmin
              ? "Admin released the unavailable device"
              : unclaimed
              ? "Choose the operating device"
              : ownsShift
              ? "This is the operating device"
              : "View-only on this device"}
          </Text>
          <Text style={{ color: ownsShift ? "#E0F2FE" : "#FEF3C7", fontSize: 12, marginTop: 4, lineHeight: 16 }}>
            {recoveredByAdmin
              ? "Use a different device to claim this shift. The recovered device cannot reclaim it."
              : unclaimed
              ? "Claim this shift before collecting fares."
              : ownsShift
              ? "Release only when moving the shift to Web or Mobile."
              : `The ${shift.operatingDeviceType?.toLowerCase() ?? "other"} device must sync and release the shift first.`}
          </Text>
          {deviceError ? <Text style={{ color: "#FCA5A5", fontSize: 12, marginTop: 6 }}>{deviceError}</Text> : null}
          {unclaimed ? (
            <Pressable
              disabled={deviceBusy}
              style={[styles.button, { marginTop: 10, backgroundColor: "#0284C7" }]}
              onPress={() => void claimDevice()}
            >
              <Text style={[styles.buttonText, { color: "#fff", fontWeight: "700" }]}>
                {deviceBusy ? "Claiming…" : "Use this device"}
              </Text>
            </Pressable>
          ) : ownsShift ? (
            <Pressable
              disabled={deviceBusy}
              style={[styles.button, styles.secondaryButton, { marginTop: 10 }]}
              onPress={() => void releaseDevice()}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText, { fontWeight: "700" }]}>
                {deviceBusy ? "Checking sync…" : "Release for handoff"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.card, { flexDirection: "row", alignItems: "center" }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Total Collected</Text>
          <Text style={styles.title}>{`\u20B1${totals.total.toFixed(2)}`}</Text>
          <Text style={styles.subtitle}>{transactions.length} passenger transactions</Text>
          {pendingOfflineCount > 0 ? <Text style={[styles.subtitle, { color: colors.warning }]}>{pendingOfflineCount} cash transaction{pendingOfflineCount === 1 ? "" : "s"} waiting to sync</Text> : null}
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
            disabled={!canOperate}
            onPress={() => void updateCapacity(value)}
            style={[styles.button, styles.secondaryButton, {
              flex: 1,
              backgroundColor: capacity === value ? colors.primary : colors.surface2,
              borderColor: capacity === value ? colors.primaryLight : colors.border,
              opacity: canOperate ? 1 : 0.45,
            }]}
          >
            <Text style={[styles.buttonText, { fontSize: 11 }]}>{value === "AVAILABLE" ? "Available" : value === "STANDING" ? "Standing" : "Full"}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable disabled={!canOperate || breakPending} style={[styles.button, styles.secondaryButton, { marginTop: 10, opacity: canOperate && !breakPending ? 1 : 0.45 }]} onPress={() => setBreakConfirmOpen(true)}>
        <Text style={[styles.buttonText, styles.secondaryButtonText]}>{isOnBreak ? "Resume duty" : "Take a break"}</Text>
      </Pressable>
      {isOnBreak ? <Text style={[styles.subtitle, { color: colors.warning }]}>Pickup requests and live operations are paused while you are on break.</Text> : null}

      {announcements.filter(item => !item.isRead).slice(0, 3).map(item => (
        <View key={item.id} style={[styles.card, { borderColor: colors.warning, marginTop: 14 }]}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.body}</Text>
          <Pressable style={[styles.button, styles.secondaryButton, { marginTop: 10 }]} onPress={() => {
            setAnnouncements(current => current.map(row => row.id === item.id ? { ...row, isRead: true } : row));
            void api.markAnnouncementRead(item.id).catch(() => undefined);
          }}><Text style={[styles.buttonText, styles.secondaryButtonText]}>Mark as read</Text></Pressable>
        </View>
      ))}

      <Text style={[styles.label, { marginTop: 22 }]}>Live Route</Text>
      {mapEnabled ? (
        <LiveMap latitude={position?.latitude} longitude={position?.longitude} hails={hails} unitNumber={shift.unitNumber} routeCoordinates={routeCoordinates} routeSource={routeSource} />
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
                <Pressable disabled={!canOperate} onPress={() => void handleHail(hail.id, "accept")} style={[styles.button, { flex: 1, opacity: canOperate ? 1 : 0.45 }]}><Text style={styles.buttonText}>Accept</Text></Pressable>
                <Pressable disabled={!canOperate} onPress={() => void handleHail(hail.id, "reject")} style={[styles.button, styles.secondaryButton, { flex: 1, opacity: canOperate ? 1 : 0.45 }]}><Text style={styles.buttonText}>Reject</Text></Pressable>
              </View>
            </View>
          ))}
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable onPress={() => setSos(true)} style={[styles.button, { backgroundColor: "#9F1239", marginTop: 22 }]}>
        <Text style={[styles.buttonText, { color: "#fff" }]}>Emergency SOS</Text>
      </Pressable>

      <TransactionHistoryModal visible={history} shiftId={shift.shiftId} transactions={transactions} onClose={() => setHistory(false)} />
      <ModalShell visible={breakConfirmOpen} title={isOnBreak ? "Resume duty" : "Take a break"} onClose={() => !breakPending && setBreakConfirmOpen(false)}>
        <Text style={styles.subtitle}>
          {isOnBreak ? "Slide all the way to the right when you are ready to resume operations." : "Slide all the way to the right to pause pickup requests and live operations."}
        </Text>
        <SlideToConfirm
          label={isOnBreak ? "Slide to resume duty" : "Slide to start break"}
          disabled={breakPending}
          onComplete={async () => {
            if (await updateBreak()) setBreakConfirmOpen(false);
          }}
        />
      </ModalShell>
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
