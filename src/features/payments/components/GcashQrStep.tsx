import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { useAppTheme } from "../../../core/theme/ThemeProvider";
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
  handleSimulatePayment: () => void;
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
  handleSimulatePayment,
  handleCancelGcash,
  stopPolling,
  setStep,
}: GcashQrStepProps) {
  const { colors, isLofi } = useAppTheme();

  return (
    <View style={styles.qrCard}>
      <View style={styles.qrIconCircle}>
        <Ionicons name="qr-code-outline" size={28} color={isLofi ? colors.primary : "#60A5FA"} />
      </View>

      <Text style={styles.qrTitle}>Scan to Pay</Text>
      <Text style={styles.qrSubtitle}>
        Commuter, scan this QR code with your e-Chatco app to confirm payment
      </Text>

      {/* QR White Container */}
      <View style={styles.qrSvgContainer}>
        <QRCode
          value={gcashInitiation.qrToken}
          size={180}
          backgroundColor="#ffffff"
          color="#071A2E"
        />
      </View>

      {/* Route & Amount */}
      <View style={styles.qrDetailsBox}>
        <Text style={styles.qrRouteText}>
          {gcashInitiation.from ?? pickupPoint?.name ?? "—"} →{" "}
          {gcashInitiation.to ?? dropoffPoint?.name ?? "—"}
        </Text>
        <Text style={styles.qrAmountText}>
          Amount: <Text style={{ color: colors.text, fontWeight: "700" }}>{formatCurrency(gcashInitiation.amount)}</Text>
        </Text>

        {/* Status Indicator */}
        <View style={styles.qrStatusRow}>
          <View
            style={[
              styles.miniDot,
              {
                backgroundColor:
                  gcashStatus === "expired"
                    ? isLofi
                      ? colors.warning
                      : "#F59E0B"
                    : isLofi
                    ? colors.primary
                    : "#60A5FA",
              },
            ]}
          />
          <Text
            style={[
              styles.qrStatusText,
              gcashStatus === "expired"
                ? { color: isLofi ? colors.warning : "#FBBF24" }
                : { color: isLofi ? colors.primary : "#93C5FD" },
            ]}
          >
            {gcashStatus === "processing"
              ? "Payment processing…"
              : gcashStatus === "paid"
              ? "Payment successful!"
              : gcashStatus === "expired"
              ? "QR expired — still waiting for PayMongo confirmation…"
              : gcashStatus
              ? `Status: ${gcashStatus}`
              : "Waiting for commuter scan…"}
          </Text>
        </View>

        {/* Countdown */}
        {qrSecondsLeft !== null ? (
          <Text
            style={[
              styles.qrCountdownText,
              qrSecondsLeft <= 30 ? { color: colors.danger } : null,
            ]}
          >
            QR expires in{" "}
            <Text style={{ fontWeight: "700" }}>
              {Math.floor(qrSecondsLeft / 60)}:
              {String(qrSecondsLeft % 60).padStart(2, "0")}
            </Text>
          </Text>
        ) : null}
      </View>

      {gcashError ? (
        <View style={styles.qrErrorBox}>
          <Text style={styles.qrErrorText}>{gcashError}</Text>
        </View>
      ) : null}

      {/* DEV simulation button */}
      <Pressable onPress={handleSimulatePayment} style={styles.devSimulateButton}>
        <Text style={styles.devSimulateButtonText}>[DEV] Simulate Payment Paid</Text>
      </Pressable>

      {/* Cancel & Back Buttons */}
      <View style={styles.actionButtonsRow}>
        <Pressable
          disabled={isCancellingGcash}
          onPress={handleCancelGcash}
          style={[styles.btnCancelGcash, isCancellingGcash ? { opacity: 0.5 } : null]}
        >
          <Text style={styles.btnCancelGcashText}>
            {isCancellingGcash ? "Cancelling…" : "Cancel Payment"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            stopPolling();
            setStep("select");
          }}
          style={styles.btnSecondary}
        >
          <Text style={styles.btnSecondaryText}>Back</Text>
        </Pressable>
      </View>
    </View>
  );
}
