import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { usePaymentTheme } from "../../../core/theme/payment-theme";
import type { FarePoint, GcashInitiation } from "../../../core/domain/types";
import type { Step } from "../payment-types";
import { formatCurrency } from "../fare-helpers";

export interface GcashQrStepProps {
  styles: any;
  gcashInitiation: GcashInitiation;
  pickupPoint: FarePoint | null;
  dropoffPoint: FarePoint | null;
  gcashStatus: string | null;
  gcashError: string | null;
  qrSecondsLeft: number | null;
  isCancellingGcash: boolean;
  handleCancelGcash: () => void;
  stopPolling: () => void;
  setStep: (step: Step) => void;
}

export function GcashQrStep({
  styles,
  gcashInitiation,
  pickupPoint,
  dropoffPoint,
  gcashStatus,
  gcashError,
  qrSecondsLeft,
  isCancellingGcash,
  handleCancelGcash,
  stopPolling,
  setStep,
}: GcashQrStepProps) {
  const { colors, isLofi } = usePaymentTheme();
  const { width: screenWidth } = useWindowDimensions();
  const isConfirming = gcashStatus === "processing";
  const isExpiringSoon = qrSecondsLeft !== null && qrSecondsLeft <= 30;
  const isStatusWarning = gcashStatus === "expired" || (isConfirming && gcashInitiation.confirmationDelayed);
  const routeFrom = pickupPoint?.name ?? gcashInitiation.from ?? null;
  const routeTo = dropoffPoint?.name ?? gcashInitiation.to ?? null;
  const qrSize = Math.max(160, Math.min(232, screenWidth - 104));
  const countdownLabel = qrSecondsLeft !== null
    ? `${Math.floor(qrSecondsLeft / 60)}:${String(qrSecondsLeft % 60).padStart(2, "0")}`
    : null;
  const statusLabel = isConfirming
    ? gcashInitiation.confirmationDelayed ? "Confirmation delayed" : "GCash is confirming"
    : gcashStatus === "expired"
      ? "QR expired, waiting for PayMongo"
      : gcashStatus === "pending"
        ? "Waiting for the commuter to pay"
        : "Waiting for commuter scan";
  const text = isLofi ? "#111827" : "#FFFFFF";
  const muted = isLofi ? "#6B7280" : "rgba(255,255,255,0.55)";
  const border = isLofi ? "#E5E7EB" : "rgba(255,255,255,0.1)";
  const panel = isLofi ? "#FFFFFF" : "#071A2E";
  const readout = isLofi ? "#F9FAFB" : "#050F1A";

  return (
    <View style={[styles.qrCard, { maxWidth: 384, maxHeight: "100%", flexShrink: 1, flexDirection: "column", padding: 0, alignItems: "stretch", borderRadius: 16, borderColor: border, backgroundColor: panel, overflow: "hidden" }]}>
      <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
            <Text style={{ color: isLofi ? "#6B7280" : "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase" }}>
              {isConfirming ? "Confirming Payment" : "Scan to Pay"}
            </Text>
            <Text style={{ color: isLofi ? "#6B7280" : "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: "600" }}>GCash</Text>
          </View>
          <Text style={{ marginTop: 8, color: text, fontSize: 40, lineHeight: 44, fontWeight: "700", letterSpacing: -0.6, fontVariant: ["tabular-nums"] }}>
            {formatCurrency(gcashInitiation.amount)}
          </Text>
          {routeFrom && routeTo ? (
            <Text style={{ marginTop: 8, color: muted, fontSize: 12, lineHeight: 17 }}>
              {routeFrom} <Text style={{ color: isLofi ? "#9CA3AF" : "rgba(255,255,255,0.3)" }}>→</Text> {routeTo}
            </Text>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          {isConfirming ? (
            <View style={{ borderWidth: 1, borderColor: border, borderRadius: 12, backgroundColor: readout, paddingHorizontal: 16, paddingVertical: 20 }}>
              <Text style={{ color: text, fontSize: 14, fontWeight: "600" }}>The commuter authorized this payment.</Text>
              <Text style={{ marginTop: 6, color: muted, fontSize: 12, lineHeight: 18 }}>
                {gcashInitiation.confirmationDelayed
                  ? "GCash hasn't confirmed this payment yet. Keep it open and don't collect this fare another way; it updates here once GCash responds."
                  : "GCash is confirming it now, so it can't be cancelled."}
              </Text>
            </View>
          ) : (
            <>
              <View style={{ alignSelf: "center", alignItems: "center", justifyContent: "center", padding: 16, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: isLofi ? 1 : 0, borderColor: isLofi ? border : "transparent" }}>
                <QRCode
                  value={gcashInitiation.qrToken}
                  size={qrSize}
                  backgroundColor="#FFFFFF"
                  color="#071A2E"
                  ecl="H"
                  quietZone={0}
                />
              </View>
              <Text style={{ marginTop: 10, color: muted, fontSize: 11, lineHeight: 16 }}>
                Commuter scans this with the e-Chatco app to pay through GCash.
              </Text>
            </>
          )}
        </View>

        <View accessibilityLiveRegion="polite" style={{ marginTop: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: border, backgroundColor: readout, paddingHorizontal: 20, paddingVertical: 12 }}>
          <View style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 6, height: 6, flexShrink: 0, borderRadius: 3, backgroundColor: isStatusWarning ? (isLofi ? "#9CA3AF" : "rgba(255,255,255,0.5)") : "#62A0EA" }} />
            <Text numberOfLines={1} style={{ color: isStatusWarning ? text : (isLofi ? "#1F2937" : "rgba(255,255,255,0.8)"), fontSize: 12, fontWeight: "600" }}>{statusLabel}</Text>
          </View>
          {countdownLabel && !isConfirming ? (
            <Text style={{ flexShrink: 0, color: isExpiringSoon ? (isLofi ? "#DC2626" : "#F87171") : muted, fontSize: 12, fontWeight: isExpiringSoon ? "600" : "400" }}>
              Expires <Text style={{ fontVariant: ["tabular-nums"] }}>{countdownLabel}</Text>
            </Text>
          ) : null}
        </View>

        <View style={{ gap: 12, padding: 20 }}>
          {gcashError ? (
            <Text accessibilityRole="alert" style={{ borderLeftWidth: 2, borderLeftColor: "#EF4444", paddingLeft: 12, color: isLofi ? "#B91C1C" : "#FCA5A5", fontSize: 12, lineHeight: 18 }}>
              {gcashError}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              accessibilityRole="button"
              disabled={isCancellingGcash || isConfirming}
              onPress={handleCancelGcash}
              style={{ flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "#DC2626", opacity: isCancellingGcash || isConfirming ? 0.4 : 1 }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>{isCancellingGcash ? "Cancelling…" : "Cancel Payment"}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => { stopPolling(); setStep("select"); }}
              style={{ flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: border, borderRadius: 12, backgroundColor: isLofi ? "#FFFFFF" : "#131C2E" }}
            >
              <Text style={{ color: isLofi ? "#374151" : "rgba(255,255,255,0.8)", fontSize: 14, fontWeight: "600" }}>Back</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
