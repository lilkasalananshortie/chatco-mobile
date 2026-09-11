import { Platform, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import type { ReceiptSettings } from "../../core/domain/types";

export interface PassengerBreakdownItem {
  passengerType: string;
  quantity: number;
  subtotal: number;
}

export interface TransactionReceiptProps {
  settings: ReceiptSettings;
  transactionId?: string;
  timestamp?: number;
  unitNumber: string;
  conductorName: string;
  passengerType: string;
  passengerName?: string | null;
  from: string;
  to: string;
  baseFare: number;
  discountAmount: number;
  finalFare: number;
  paymentMethod: string;
  receiptQrToken?: string | null;
  payerName?: string | null;
  groupPosition?: number | null;
  multiplePaymentReference?: string | null;
  driverName?: string;
  totalPassengers?: number;
  grossFare?: number;
  passengerBreakdown?: PassengerBreakdownItem[];
}

function money(value: number): string {
  return `₱${value.toFixed(2)}`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={receiptStyles.row}>
      <Text style={receiptStyles.rowLabel}>{label}</Text>
      <Text style={receiptStyles.rowValue}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={receiptStyles.divider} />;
}

export function TransactionReceipt({
  settings,
  transactionId,
  timestamp,
  unitNumber,
  conductorName,
  passengerType,
  passengerName,
  from,
  to,
  baseFare,
  discountAmount,
  finalFare,
  paymentMethod,
  receiptQrToken,
  payerName,
  groupPosition,
  multiplePaymentReference,
  driverName,
  totalPassengers = 1,
  grossFare,
  passengerBreakdown = [],
}: TransactionReceiptProps) {
  const width = settings.paperWidth === "80" ? 300 : 230;

  const formatType = (type: string) => {
    if (type === "SENIOR" || type === "SENIOR_CITIZEN") return "Senior Citizen";
    return type.charAt(0) + type.slice(1).toLowerCase();
  };

  return (
    <View style={[receiptStyles.container, { width }]}>
      <View style={receiptStyles.header}>
        <Text style={receiptStyles.businessName}>
          {settings.businessName || "CHATCO"}
        </Text>
        {settings.addressLine ? (
          <Text style={receiptStyles.addressLine}>{settings.addressLine}</Text>
        ) : null}
        <Text style={receiptStyles.subtitle}>FARE RECEIPT</Text>
      </View>

      <Divider />

      {settings.showDateTime && timestamp ? (
        <Row label="Date" value={new Date(timestamp).toLocaleString("en-PH")} />
      ) : null}

      {settings.showTransactionId && transactionId ? (
        <Row label="Ref" value={transactionId} />
      ) : null}

      {multiplePaymentReference ? (
        <Row label="Group ref" value={multiplePaymentReference} />
      ) : null}

      {settings.showUnit && unitNumber ? (
        <Row label="Unit" value={unitNumber} />
      ) : null}

      {settings.showConductor && conductorName ? (
        <Row label="Conductor" value={conductorName} />
      ) : null}

      {driverName ? <Row label="Driver" value={driverName} /> : null}

      {settings.showPassenger ? (
        <View style={receiptStyles.row}>
          <Text style={receiptStyles.rowLabel}>Commuter</Text>
          <View style={{ alignItems: "flex-end", flex: 1 }}>
            <Text style={receiptStyles.rowValue}>
              {groupPosition && groupPosition > 1
                ? "Passenger"
                : passengerName || payerName || "Passenger"}
            </Text>
            <Text style={receiptStyles.secondaryText}>
              {formatType(passengerType)}
            </Text>
            {groupPosition && groupPosition > 1 && payerName ? (
              <Text style={receiptStyles.secondaryText}>Paid by: {payerName}</Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {settings.showRoute ? (
        <>
          <Divider />
          <Row label="From" value={from} />
          <Row label="To" value={to} />
        </>
      ) : null}

      {settings.showFareBreakdown ? (
        <>
          <Divider />
          {passengerBreakdown.length > 0 ? (
            passengerBreakdown
              .filter((line) => line.quantity > 0)
              .map((line) => (
                <Row
                  key={line.passengerType}
                  label={`${formatType(line.passengerType)} × ${line.quantity}`}
                  value={money(line.subtotal)}
                />
              ))
          ) : (
            <Row label="Base fare" value={money(baseFare)} />
          )}
          <Row label="Passengers" value={String(totalPassengers)} />
          {grossFare != null ? <Row label="Gross fare" value={money(grossFare)} /> : null}
          {discountAmount > 0 ? (
            <Row label="Discount" value={`-${money(discountAmount)}`} />
          ) : null}
        </>
      ) : null}

      <Divider />

      <View style={receiptStyles.totalRow}>
        <Text style={receiptStyles.totalLabel}>TOTAL</Text>
        <Text style={receiptStyles.totalValue}>{money(finalFare)}</Text>
      </View>

      <Row label="Paid via" value={paymentMethod} />

      {receiptQrToken ? (
        <>
          <Divider />
          <View style={receiptStyles.qrContainer}>
            <QRCode value={receiptQrToken} size={112} />
          </View>
          <Text style={receiptStyles.qrHint}>
            Scan in Rewards to claim this cash ride.
          </Text>
        </>
      ) : null}

      <Divider />

      {settings.footerNote ? (
        <Text style={receiptStyles.footerNote}>{settings.footerNote}</Text>
      ) : null}

      <Text style={receiptStyles.officialNotice}>
        This serves as your official receipt.
      </Text>
    </View>
  );
}

const monoFont = Platform.OS === "ios" ? "Courier" : "monospace";

const receiptStyles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 8,
    alignSelf: "center",
    marginVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  header: {
    alignItems: "center",
    marginBottom: 4,
  },
  businessName: {
    fontFamily: monoFont,
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 1,
    color: "#000000",
    textAlign: "center",
  },
  addressLine: {
    fontFamily: monoFont,
    fontSize: 10,
    color: "#333333",
    marginTop: 2,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: monoFont,
    fontSize: 10,
    color: "#666666",
    marginTop: 2,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  divider: {
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(0, 0, 0, 0.35)",
    marginVertical: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    marginVertical: 2,
  },
  rowLabel: {
    fontFamily: monoFont,
    fontSize: 11,
    color: "rgba(0, 0, 0, 0.65)",
    flex: 1,
  },
  rowValue: {
    fontFamily: monoFont,
    fontSize: 11,
    color: "#000000",
    textAlign: "right",
    flexShrink: 1,
  },
  secondaryText: {
    fontFamily: monoFont,
    fontSize: 9,
    color: "rgba(0, 0, 0, 0.6)",
    textAlign: "right",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 4,
  },
  totalLabel: {
    fontFamily: monoFont,
    fontSize: 13,
    fontWeight: "bold",
    color: "#000000",
  },
  totalValue: {
    fontFamily: monoFont,
    fontSize: 13,
    fontWeight: "bold",
    color: "#000000",
  },
  qrContainer: {
    backgroundColor: "#FFFFFF",
    padding: 6,
    alignSelf: "center",
    marginVertical: 6,
  },
  qrHint: {
    fontFamily: monoFont,
    fontSize: 9,
    color: "rgba(0, 0, 0, 0.7)",
    textAlign: "center",
    marginTop: 2,
  },
  footerNote: {
    fontFamily: monoFont,
    fontSize: 10,
    color: "#333333",
    textAlign: "center",
    marginBottom: 4,
  },
  officialNotice: {
    fontFamily: monoFont,
    fontSize: 9,
    color: "rgba(0, 0, 0, 0.45)",
    textAlign: "center",
  },
});
