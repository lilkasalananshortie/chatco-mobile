import { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, Text, TextInput, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { api } from "../../core/api/chatco-api";
import { ModalShell } from "../../shared/ui";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import type {
  CommuterType,
  FareConfig,
  FarePoint,
  GcashInitiation,
  Shift,
} from "../../core/domain/types";

type Method = "CASH" | "GCASH" | "VOUCHER";
type Step = "method" | "route" | "confirm" | "qr" | "success" | "failed";

const types: { id: CommuterType; label: string }[] = [
  { id: "REGULAR", label: "Regular" },
  { id: "STUDENT", label: "Student" },
  { id: "SENIOR", label: "Senior" },
  { id: "PWD", label: "PWD" },
];

const defaultFareConfig: FareConfig = {
  baseBarangayCount: 4,
  baseFareRegular: 15,
  baseFareDiscounted: 12,
  succeedingFareRegular: 2.25,
  succeedingFareDiscounted: 1.75,
  totalPoints: 34,
};

export function PaymentModal({ visible, shift, onClose, onSaved }: {
  visible: boolean; shift: Shift; onClose: () => void; onSaved: () => void;
}) {
  const { colors, styles } = useAppTheme();
  const [step, setStep] = useState<Step>("method");
  const [method, setMethod] = useState<Method | null>(null);
  const [points, setPoints] = useState<FarePoint[]>([]);
  const [fareConfig, setFareConfig] = useState<FareConfig>(defaultFareConfig);
  const [pickup, setPickup] = useState<FarePoint | null>(null);
  const [dropoff, setDropoff] = useState<FarePoint | null>(null);
  const [pickupName, setPickupName] = useState("");
  const [dropoffName, setDropoffName] = useState("");
  const [selecting, setSelecting] = useState<"pickup" | "dropoff">("pickup");
  const [commuterType, setCommuterType] = useState<CommuterType>("REGULAR");
  const [search, setSearch] = useState("");
  const [voucher, setVoucher] = useState("");
  const [gcash, setGcash] = useState<GcashInitiation | null>(null);
  const [paymentStatus, setPaymentStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    void Promise.all([api.fareMatrix(), api.pendingGcash()])
      .then(([matrix, pending]) => {
        setPoints(matrix.points);
        setFareConfig(matrix.config);
        if (pending) {
          setMethod("GCASH");
          setGcash(pending);
          setPaymentStatus("PENDING");
          setStep("qr");
        }
      })
      .catch(e => setError(e instanceof Error ? e.message : "Unable to load fare data."));
  }, [visible]);

  useEffect(() => {
    if (!gcash || step !== "qr" || !visible) return;
    const timer = setInterval(() => {
      void api.paymentStatus(gcash.transactionId).then(next => {
        setPaymentStatus(next);
        if (next === "PAID") {
          clearInterval(timer);
          setStep("success");
          onSaved();
        } else if (["FAILED", "CANCELLED", "REFUNDED"].includes(next)) {
          clearInterval(timer);
          setStep("failed");
        }
      }).catch(() => undefined);
    }, 3000);
    const expiry = new Date(gcash.expiresAt).getTime();
    const hardTimeout = setTimeout(() => {
      clearInterval(timer);
      setPaymentStatus("EXPIRED");
      setError("This QR expired. If the commuter already paid, check transaction history shortly for a late settlement.");
      setStep("failed");
    }, Math.max(10_000, expiry - Date.now() + 90_000));
    return () => {
      clearInterval(timer);
      clearTimeout(hardTimeout);
    };
  }, [gcash, step, visible, onSaved]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return points;
    return points.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.code.toLowerCase().includes(query) ||
      p.landmarks.some(l => l.toLowerCase().includes(query))
    );
  }, [points, search]);

  const fare = useMemo(() => {
    if (!pickup || !dropoff) return null;
    const regular = Math.max(fareConfig.baseFareRegular, Math.abs(pickup.regularFare - dropoff.regularFare));
    const discounted = Math.max(fareConfig.baseFareDiscounted, Math.abs(pickup.discountedFare - dropoff.discountedFare));
    const paidFare = commuterType === "REGULAR" || method === "GCASH" ? regular : discounted;
    const final = method === "VOUCHER" ? 0 : paidFare;
    return {
      regular,
      final,
      discount: Math.max(0, regular - final),
      distance: Math.abs(pickup.pointNumber - dropoff.pointNumber) + 1,
    };
  }, [pickup, dropoff, commuterType, method, fareConfig]);

  const chooseMethod = (next: Method) => {
    setMethod(next);
    setCommuterType("REGULAR");
    setStep("route");
  };
  const choosePoint = (point: FarePoint, locationName = point.name) => {
    if (selecting === "pickup") {
      setPickup(point);
      setPickupName(locationName);
      setSelecting("dropoff");
    } else {
      setDropoff(point);
      setDropoffName(locationName);
    }
    setSearch("");
  };
  const submit = async () => {
    if (!method || !pickup || !dropoff || !fare) return;
    if (method === "VOUCHER" && !voucher.trim()) {
      setError("Enter the commuter's voucher code.");
      return;
    }
    setBusy(true); setError("");
    try {
      if (method === "GCASH") {
        const initiation = await api.initiateGcash({
          amount: fare.regular,
          from: pickupName,
          to: dropoffName,
          baseFare: fare.regular,
          distance: fare.distance,
          discountAmount: 0,
        });
        setGcash(initiation);
        setPaymentStatus("PENDING");
        setStep("qr");
      } else {
        await api.recordCash({
          amount: fare.final,
          from: pickupName,
          to: dropoffName,
          baseFare: fare.regular,
          distance: fare.distance,
          discountAmount: fare.discount,
          passengerRole: commuterType,
          voucherCode: method === "VOUCHER" ? voucher.trim() : undefined,
        });
        onSaved();
        setStep("success");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to record payment.");
      setStep("failed");
    } finally {
      setBusy(false);
    }
  };
  const cancelGcash = async () => {
    if (!gcash) return;
    setBusy(true);
    try {
      await api.cancelPayment(gcash.transactionId);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to cancel payment.");
    } finally { setBusy(false); }
  };
  const reset = () => {
    setStep("method"); setMethod(null); setPickup(null); setDropoff(null);
    setPickupName(""); setDropoffName("");
    setSelecting("pickup"); setCommuterType("REGULAR"); setVoucher("");
    setGcash(null); setPaymentStatus(""); setError(""); setSearch("");
  };
  const close = () => { reset(); onClose(); };

  return (
    <ModalShell visible={visible} title="Collect Payment" onClose={close}>
      {step === "method" ? <>
        <Text style={styles.subtitle}>Choose how the passenger will pay.</Text>
        <MethodCard title="Cash Payment" detail="Calculate fare and record cash collection" onPress={() => chooseMethod("CASH")} />
        <MethodCard title="GCash Payment" detail="Generate a binding QR and track payment status" onPress={() => chooseMethod("GCASH")} />
        <MethodCard title="Voucher / Free Ride" detail="Validate a commuter voucher code" onPress={() => chooseMethod("VOUCHER")} />
      </> : null}

      {step === "route" ? <>
        <Text style={styles.label}>{selecting === "pickup" ? "Select pickup location" : "Select drop-off location"}</Text>
        <TextInput value={search} onChangeText={setSearch} style={styles.input} placeholder="Search point or landmark" placeholderTextColor={colors.muted} />
        {pickup ? <Pressable style={styles.card} onPress={() => setSelecting("pickup")}><Text style={styles.label}>Pickup</Text><Text style={styles.cardTitle}>{pickupName}</Text></Pressable> : null}
        {dropoff ? <Pressable style={styles.card} onPress={() => setSelecting("dropoff")}><Text style={styles.label}>Drop-off</Text><Text style={styles.cardTitle}>{dropoffName}</Text></Pressable> : null}
        {!pickup || !dropoff ? filtered.map(point => (
          <View key={point.pointNumber} style={styles.card}>
            <Pressable onPress={() => choosePoint(point)}>
              <Text style={styles.cardTitle}>{point.name}</Text>
              <Text style={styles.subtitle}>{point.code} | Main stop</Text>
            </Pressable>
            {point.landmarks.map(landmark => (
              <Pressable key={landmark} style={[styles.button, styles.secondaryButton, { minHeight: 38, paddingVertical: 8 }]} onPress={() => choosePoint(point, landmark)}>
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>{landmark}</Text>
              </Pressable>
            ))}
          </View>
        )) : <>
          {method !== "GCASH" ? <>
            <Text style={[styles.label, { marginTop: 18 }]}>Commuter type</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {types.map(type => <Pressable key={type.id} style={[styles.button, styles.secondaryButton, commuterType === type.id && { backgroundColor: colors.primary }]} onPress={() => setCommuterType(type.id)}><Text style={[styles.buttonText, styles.secondaryButtonText]}>{type.label}</Text></Pressable>)}
            </View>
          </> : null}
          {method !== "GCASH" ? <View style={styles.card}>
            <Text style={styles.label}>Fare overview</Text>
            <Text style={styles.title}>{`\u20B1${fare?.final.toFixed(2)}`}</Text>
            <Text style={styles.subtitle}>{fare?.distance} route points | {commuterType}</Text>
          </View> : <Text style={styles.subtitle}>Fare and commuter discount will be confirmed after the commuter scans the QR code.</Text>}
          <Pressable disabled={busy} style={styles.button} onPress={() => method === "GCASH" ? void submit() : setStep("confirm")}>
            <Text style={styles.buttonText}>{method === "GCASH" ? (busy ? "Generating..." : "Generate QR Code") : "Continue"}</Text>
          </Pressable>
        </>}
        <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => setStep("method")}><Text style={[styles.buttonText, styles.secondaryButtonText]}>Back to methods</Text></Pressable>
      </> : null}

      {step === "confirm" && fare ? <>
        <Text style={styles.cardTitle}>Confirm {method} payment</Text>
        <View style={styles.card}>
          <Row label="Route" value={`${pickupName} to ${dropoffName}`} />
          <Row label="Passenger" value={method === "GCASH" ? "Detected after scan" : commuterType} />
          <Row label="Regular fare" value={`\u20B1${fare.regular.toFixed(2)}`} />
          {fare.discount > 0 ? <Row label="Discount" value={`-\u20B1${fare.discount.toFixed(2)}`} /> : null}
          <Row label="Final amount" value={`\u20B1${fare.final.toFixed(2)}`} />
        </View>
        {method === "VOUCHER" ? <TextInput value={voucher} onChangeText={setVoucher} style={styles.input} placeholder="Voucher code" placeholderTextColor={colors.muted} autoCapitalize="characters" /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable disabled={busy} style={[styles.button, busy && { opacity: .55 }]} onPress={() => void submit()}><Text style={styles.buttonText}>{busy ? "Processing..." : method === "GCASH" ? "Generate GCash QR" : method === "VOUCHER" ? "Validate voucher" : "Confirm payment"}</Text></Pressable>
        <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => setStep("route")}><Text style={[styles.buttonText, styles.secondaryButtonText]}>Edit details</Text></Pressable>
      </> : null}

      {step === "qr" && gcash ? <View style={{ alignItems: "center" }}>
        <Text style={styles.title}>Scan to Pay</Text>
        <Text style={styles.subtitle}>{`\u20B1${gcash.amount.toFixed(2)} | Status: ${paymentStatus}`}</Text>
        <View style={{ backgroundColor: "#fff", padding: 14, marginVertical: 18, borderRadius: 14 }}><QRCode value={gcash.qrToken} size={210} /></View>
        <Text style={styles.subtitle}>Expires {new Date(gcash.expiresAt).toLocaleTimeString()}</Text>
        {gcash.checkoutUrl ? <Pressable style={[styles.button, { alignSelf: "stretch" }]} onPress={() => void Linking.openURL(gcash.checkoutUrl!)}><Text style={styles.buttonText}>Open checkout link</Text></Pressable> : null}
        <Pressable disabled={busy} style={[styles.button, styles.secondaryButton, { alignSelf: "stretch" }]} onPress={() => void cancelGcash()}><Text style={[styles.buttonText, styles.secondaryButtonText]}>Cancel pending payment</Text></Pressable>
      </View> : null}

      {step === "success" ? <>
        <Text style={styles.title}>Payment recorded</Text>
        <Text style={styles.subtitle}>The transaction is included in the dashboard and end-of-day report.</Text>
        <Pressable style={styles.button} onPress={close}><Text style={styles.buttonText}>Done</Text></Pressable>
      </> : null}
      {step === "failed" ? <>
        <Text style={styles.title}>Payment failed</Text>
        <Text style={styles.error}>{error || "The payment could not be completed."}</Text>
        <Pressable style={styles.button} onPress={() => setStep("confirm")}><Text style={styles.buttonText}>Try again</Text></Pressable>
        <Pressable style={[styles.button, styles.secondaryButton]} onPress={close}><Text style={[styles.buttonText, styles.secondaryButtonText]}>Close</Text></Pressable>
      </> : null}
    </ModalShell>
  );

  function MethodCard({ title, detail, onPress }: { title: string; detail: string; onPress: () => void }) {
    return <Pressable style={styles.card} onPress={onPress}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.subtitle}>{detail}</Text></Pressable>;
  }
  function Row({ label, value }: { label: string; value: string }) {
    return <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 16, marginVertical: 6 }}><Text style={styles.subtitle}>{label}</Text><Text style={[styles.cardTitle, { flex: 1, textAlign: "right" }]}>{value}</Text></View>;
  }
}
