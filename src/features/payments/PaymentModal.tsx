import { useEffect, useMemo, useRef, useState } from "react";
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
type GroupPassengerType = "REGULAR" | "SENIOR_CITIZEN" | "STUDENT" | "PWD";

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

export function PaymentModal({ visible, shift, isOnline, onClose, onSaved }: {
  visible: boolean; shift: Shift; isOnline: boolean; onClose: () => void; onSaved: () => void;
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
  const [groupMode, setGroupMode] = useState(false);
  const [groupCounts, setGroupCounts] = useState<Record<GroupPassengerType, number>>({ REGULAR: 0, SENIOR_CITIZEN: 0, STUDENT: 0, PWD: 0 });
  const [search, setSearch] = useState("");
  const [voucher, setVoucher] = useState("");
  const [gcash, setGcash] = useState<GcashInitiation | null>(null);
  const [paymentStatus, setPaymentStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receiptTransactions, setReceiptTransactions] = useState<import("../../core/domain/types").Transaction[]>([]);
  const requestKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    const loadFareMatrix = () => void api.fareMatrix()
      .then((matrix) => {
        setPoints(matrix.points);
        setFareConfig(matrix.config);
      })
      .catch(e => setError(e instanceof Error ? e.message : "Unable to load fare data."));
    loadFareMatrix();
    void api.pendingGcash()
      .then((pending) => {
        if (pending) {
          setMethod("GCASH");
          setGcash(pending);
          setPaymentStatus("PENDING");
          setStep("qr");
        }
      })
      .catch(e => setError(e instanceof Error ? e.message : "Unable to resume the pending payment."));
    const timer = setInterval(loadFareMatrix, 60000);
    return () => clearInterval(timer);
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
      [...p.landmarks, ...(p.subStops ?? [])].some(l => l.toLowerCase().includes(query))
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
      discounted,
      final,
      discount: Math.max(0, regular - final),
      distance: Math.abs(pickup.pointNumber - dropoff.pointNumber) + 1,
    };
  }, [pickup, dropoff, commuterType, method, fareConfig]);

  const groupPassengers = useMemo(() => (Object.entries(groupCounts) as [GroupPassengerType, number][])
    .filter(([, quantity]) => quantity > 0)
    .map(([type, quantity]) => ({ type, quantity })), [groupCounts]);
  const groupCompanionCount = groupPassengers.reduce((total, row) => total + row.quantity, 0);
  const groupFare = useMemo(() => {
    if (!fare) return 0;
    return groupPassengers.reduce((total, row) => total + row.quantity * (row.type === "REGULAR" ? fare.regular : fare.discounted), 0);
  }, [fare, groupPassengers]);

  const chooseMethod = (next: Method) => {
    if (next !== "CASH" && !isOnline) {
      setError("GCash and voucher validation are unavailable offline. Use cash and it will sync when you reconnect.");
      return;
    }
    setMethod(next);
    setCommuterType("REGULAR");
    setStep("route");
    setGroupMode(false);
    setGroupCounts({ REGULAR: 0, SENIOR_CITIZEN: 0, STUDENT: 0, PWD: 0 });
    requestKeyRef.current = null;
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
    if (method !== "CASH" && !isOnline) {
      setError("Reconnect before using GCash or a voucher.");
      return;
    }
    if (method === "VOUCHER" && !voucher.trim()) {
      setError("Enter the commuter's voucher code.");
      return;
    }
    if (groupMode && groupCompanionCount === 0) {
      setError(method === "GCASH" ? "Enter at least one companion. The payer is added after scanning." : "Enter at least one passenger.");
      return;
    }
    if (!requestKeyRef.current) requestKeyRef.current = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setBusy(true); setError("");
    try {
      if (method === "GCASH") {
        if (!isOnline) throw new Error("GCash is unavailable while offline.");
        const initiation = await api.initiateGcash({
          amount: groupMode ? groupFare : fare.regular,
          from: pickupName,
          to: dropoffName,
          baseFare: fare.regular,
          distance: fare.distance,
          discountAmount: 0,
          pickupStopId: pickup.id,
          dropoffStopId: dropoff.id,
          groupPassengers: groupMode ? groupPassengers : undefined,
        });
        setGcash(initiation);
        setPaymentStatus("PENDING");
        setReceiptTransactions(initiation.receipts ?? []);
        setStep("qr");
      } else {
        if (groupMode) {
          const result = await api.recordGroupCash({
            from: pickupName,
            to: dropoffName,
            regularFare: fare.regular,
            discountedFare: fare.discounted,
            pickupStopId: pickup.id,
            dropoffStopId: dropoff.id,
            passengers: groupPassengers.map(row => ({
              passenger_type: row.type,
              quantity: row.quantity,
            })),
            idempotencyKey: requestKeyRef.current,
            shiftId: shift.shiftId,
          });
          setReceiptTransactions(result.transactions);
        } else {
          const transaction = await api.recordCash({
          amount: fare.final,
          from: pickupName,
          to: dropoffName,
          baseFare: fare.regular,
          distance: fare.distance,
          discountAmount: fare.discount,
          passengerRole: commuterType,
          voucherCode: method === "VOUCHER" ? voucher.trim() : undefined,
          pickupStopId: pickup?.id,
          dropoffStopId: dropoff?.id,
          idempotencyKey: requestKeyRef.current,
          shiftId: shift.shiftId,
        });
          setReceiptTransactions([transaction]);
        }
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
    setGroupMode(false); setGroupCounts({ REGULAR: 0, SENIOR_CITIZEN: 0, STUDENT: 0, PWD: 0 });
    setReceiptTransactions([]); requestKeyRef.current = null;
  };
  const close = () => { reset(); onClose(); };

  return (
    <ModalShell visible={visible} title="Collect Payment" onClose={close}>
      {step === "method" ? <>
        <Text style={styles.subtitle}>Choose how the passenger will pay.</Text>
        {!isOnline ? <Text style={styles.error}>Offline mode: cash fares are saved and will sync automatically. GCash and vouchers are disabled.</Text> : null}
        <MethodCard title="Cash Payment" detail="Calculate fare and record cash collection" onPress={() => chooseMethod("CASH")} />
        <MethodCard title="GCash Payment" detail={isOnline ? "Generate a binding QR and track payment status" : "Unavailable offline — reconnect to generate a QR"} onPress={() => chooseMethod("GCASH")} disabled={!isOnline} />
        <MethodCard title="Voucher / Free Ride" detail={isOnline ? "Validate a commuter voucher code" : "Unavailable offline — reconnect to validate a voucher"} onPress={() => chooseMethod("VOUCHER")} disabled={!isOnline} />
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
             {[...point.landmarks, ...(point.subStops ?? [])].filter((item, index, all) => all.indexOf(item) === index).map(landmark => (
              <Pressable key={landmark} style={[styles.button, styles.secondaryButton, { minHeight: 38, paddingVertical: 8 }]} onPress={() => choosePoint(point, landmark)}>
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>{landmark}</Text>
              </Pressable>
            ))}
          </View>
        )) : <>
           {method !== "VOUCHER" ? <>
             <Text style={styles.label}>Passenger mode</Text>
             <View style={{ flexDirection: "row", gap: 8 }}>
               {([false, true] as const).map(value => <Pressable key={String(value)} style={[styles.button, styles.secondaryButton, { flex: 1, backgroundColor: groupMode === value ? colors.primary : colors.surface2 }]} onPress={() => setGroupMode(value)}><Text style={styles.buttonText}>{value ? "Multiple" : "Single"}</Text></Pressable>)}
             </View>
           </> : null}
           {groupMode ? <View style={styles.card}>
             <Text style={styles.label}>{method === "GCASH" ? "Companions (payer added after scan)" : "Passengers in this group"}</Text>
             {([
               ["REGULAR", "Regular"],
               ["SENIOR_CITIZEN", "Senior"],
               ["STUDENT", "Student"],
               ["PWD", "PWD"],
             ] as const).map(([type, label]) => <View key={type} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
               <Text style={styles.subtitle}>{label}</Text>
               <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                 <Pressable onPress={() => setGroupCounts(current => ({ ...current, [type]: Math.max(0, current[type] - 1) }))}><Text style={styles.cardTitle}>−</Text></Pressable>
                 <Text style={styles.cardTitle}>{groupCounts[type]}</Text>
                 <Pressable onPress={() => setGroupCounts(current => ({ ...current, [type]: Math.min(50, current[type] + 1) }))}><Text style={styles.cardTitle}>+</Text></Pressable>
               </View>
             </View>)}
             <Text style={styles.subtitle}>{groupCompanionCount} {method === "GCASH" ? "companion" : "passenger"}{groupCompanionCount === 1 ? "" : "s"} entered{method === "GCASH" ? " · the scanning payer is added automatically" : ""}</Text>
             <Text style={styles.cardTitle}>{`₱${groupFare.toFixed(2)}`}</Text>
           </View> : null}
           {method !== "GCASH" && !groupMode ? <>
            <Text style={[styles.label, { marginTop: 18 }]}>Commuter type</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {types.map(type => <Pressable key={type.id} style={[styles.button, styles.secondaryButton, commuterType === type.id && { backgroundColor: colors.primary }]} onPress={() => setCommuterType(type.id)}><Text style={[styles.buttonText, styles.secondaryButtonText]}>{type.label}</Text></Pressable>)}
            </View>
          </> : null}
             {method !== "GCASH" && !groupMode ? <View style={styles.card}>
             <Text style={styles.label}>Fare overview</Text>
             <Text style={styles.title}>{`\u20B1${fare?.final.toFixed(2)}`}</Text>
             <Text style={styles.subtitle}>{fare?.distance} route points | {commuterType}</Text>
           </View> : method === "GCASH" && !groupMode ? <Text style={styles.subtitle}>Fare and commuter discount will be confirmed after the commuter scans the QR code.</Text> : null}
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
           <Row label="Passenger" value={groupMode ? `${groupCompanionCount} passengers` : method === "GCASH" ? "Detected after scan" : commuterType} />
          <Row label="Regular fare" value={`\u20B1${fare.regular.toFixed(2)}`} />
          {fare.discount > 0 ? <Row label="Discount" value={`-\u20B1${fare.discount.toFixed(2)}`} /> : null}
           <Row label="Final amount" value={`\u20B1${(groupMode ? groupFare : fare.final).toFixed(2)}`} />
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
          {method !== "GCASH" && receiptTransactions.length > 0 ? <View style={styles.card}>
            <Text style={styles.label}>Passenger receipt</Text>
            {receiptTransactions[0]?.multiplePaymentReference ? <Text style={styles.subtitle}>Multiple payment reference: {receiptTransactions[0].multiplePaymentReference}</Text> : null}
            {receiptTransactions[0]?.qrToken ? <View style={{ backgroundColor: "#fff", padding: 12, alignSelf: "center", marginTop: 12, borderRadius: 12 }}><QRCode value={receiptTransactions[0].qrToken} size={170} /></View> : <Text style={styles.subtitle}>No claim QR was issued for this payment.</Text>}
           <Text style={styles.subtitle}>The commuter can scan this receipt to claim the ride.</Text>
         </View> : null}
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

  function MethodCard({ title, detail, onPress, disabled }: { title: string; detail: string; onPress: () => void; disabled?: boolean }) {
    return <Pressable disabled={disabled} style={[styles.card, disabled ? { opacity: 0.5 } : null]} onPress={onPress}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.subtitle}>{detail}</Text></Pressable>;
  }
  function Row({ label, value }: { label: string; value: string }) {
    return <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 16, marginVertical: 6 }}><Text style={styles.subtitle}>{label}</Text><Text style={[styles.cardTitle, { flex: 1, textAlign: "right" }]}>{value}</Text></View>;
  }
}
