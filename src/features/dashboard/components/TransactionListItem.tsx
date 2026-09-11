import React from "react";
import { Pressable, Text, View } from "react-native";
import type { Transaction } from "../../../core/domain/types";
import { useAppTheme } from "../../../core/theme/ThemeProvider";

interface TransactionListItemProps {
  transaction: Transaction;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function Detail({ label, value }: { label: string; value: string }) {
  const { styles } = useAppTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, marginVertical: 3 }}>
      <Text style={styles.subtitle}>{label}</Text>
      <Text style={[styles.cardTitle, { flex: 1, textAlign: "right", fontSize: 12 }]}>{value}</Text>
    </View>
  );
}

export function TransactionListItem({
  transaction,
  isExpanded,
  onToggleExpand,
}: TransactionListItemProps) {
  const { colors, styles } = useAppTheme();

  return (
    <Pressable style={styles.card} onPress={onToggleExpand}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>
            {transaction.from} → {transaction.to}
          </Text>
          <Text style={styles.subtitle}>
            {new Date(transaction.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ·{" "}
            {transaction.paymentMethod} · {transaction.status || "PAID"}
          </Text>
        </View>
        <Text style={[styles.cardTitle, { color: colors.primary }]}>
          ₱{transaction.finalAmount.toFixed(2)}
        </Text>
      </View>

      {isExpanded ? (
        <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }}>
          <Detail label="Transaction ID" value={transaction.transactionId} />
          <Detail label="Status" value={transaction.status || "PAID"} />
          <Detail
            label="Paid at"
            value={
              transaction.paidAt
                ? new Date(transaction.paidAt).toLocaleString()
                : new Date(transaction.timestamp).toLocaleString()
            }
          />
          <Detail label="Passenger" value={transaction.passengerName || "Walk-in"} />
          <Detail label="Passenger ID" value={transaction.passengerId || "—"} />
          <Detail label="Role" value={transaction.passengerRole || "—"} />
          <Detail label="Distance" value={`${transaction.distance ?? 0} route points`} />
          <Detail label="Base fare" value={`₱${(transaction.baseFare ?? 0).toFixed(2)}`} />
          <Detail label="Succeeding distance" value={String(transaction.succeedingKm ?? 0)} />
          <Detail label="Discount" value={`₱${(transaction.discountAmount ?? 0).toFixed(2)}`} />
          {transaction.voucherCode ? (
            <Detail label="Voucher" value={transaction.voucherCode} />
          ) : null}
          <Detail label="Conductor" value={transaction.conductorName || "—"} />
          <Detail label="Driver" value={transaction.driverName || "—"} />
          <Detail label="Unit" value={transaction.unitNumber || "—"} />
        </View>
      ) : null}
    </Pressable>
  );
}
