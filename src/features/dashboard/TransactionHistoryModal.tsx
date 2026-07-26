import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { Transaction } from "../../core/domain/types";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import { ModalShell } from "../../shared/ui";

type Filter = "ALL" | "Cash" | "GCash" | "Voucher";

export function TransactionHistoryModal({ visible, transactions, onClose }: {
  visible: boolean;
  transactions: Transaction[];
  onClose: () => void;
}) {
  const { colors, styles } = useAppTheme();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const filtered = useMemo(() => transactions.filter(transaction => {
    if (filter !== "ALL" && transaction.paymentMethod !== filter) return false;
    const time = new Date(transaction.timestamp);
    if (fromDate && time < new Date(`${fromDate}T00:00:00`)) return false;
    if (toDate && time > new Date(`${toDate}T23:59:59`)) return false;
    return true;
  }), [transactions, filter, fromDate, toDate]);

  return (
    <ModalShell visible={visible} title="Transaction History" onClose={onClose}>
      <Text style={styles.subtitle}>
        {filtered.length} transactions · ₱{filtered.reduce((sum, item) => sum + item.finalAmount, 0).toFixed(2)}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 }}>
        {(["ALL", "Cash", "GCash", "Voucher"] as Filter[]).map(value => (
          <Pressable key={value} onPress={() => setFilter(value)} style={[styles.button, styles.secondaryButton, filter === value && { backgroundColor: colors.primary }]}>
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>{value}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
        <TextInput value={fromDate} onChangeText={setFromDate} style={[styles.input, { flex: 1 }]} placeholder="From YYYY-MM-DD" placeholderTextColor={colors.muted} />
        <TextInput value={toDate} onChangeText={setToDate} style={[styles.input, { flex: 1 }]} placeholder="To YYYY-MM-DD" placeholderTextColor={colors.muted} />
      </View>
      {filtered.map(transaction => (
        <Pressable key={transaction.transactionId} style={styles.card} onPress={() => setExpanded(expanded === transaction.transactionId ? null : transaction.transactionId)}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{transaction.from} → {transaction.to}</Text>
              <Text style={styles.subtitle}>{new Date(transaction.timestamp).toLocaleString()} · {transaction.paymentMethod} · {transaction.status || "PAID"}</Text>
            </View>
            <Text style={styles.cardTitle}>₱{transaction.finalAmount.toFixed(2)}</Text>
          </View>
          {expanded === transaction.transactionId ? (
            <View style={{ marginTop: 12 }}>
              <Detail label="Transaction ID" value={transaction.transactionId} />
              <Detail label="Status" value={transaction.status || "PAID"} />
              <Detail label="Paid at" value={transaction.paidAt ? new Date(transaction.paidAt).toLocaleString() : "—"} />
              <Detail label="Passenger" value={transaction.passengerName || "Walk-in"} />
              <Detail label="Passenger ID" value={transaction.passengerId || "—"} />
              <Detail label="Role" value={transaction.passengerRole || "—"} />
              <Detail label="Distance" value={`${transaction.distance ?? 0} route points`} />
              <Detail label="Base fare" value={`₱${(transaction.baseFare ?? 0).toFixed(2)}`} />
              <Detail label="Succeeding distance" value={String(transaction.succeedingKm ?? 0)} />
              <Detail label="Discount" value={`₱${(transaction.discountAmount ?? 0).toFixed(2)}`} />
              {transaction.voucherCode ? <Detail label="Voucher" value={transaction.voucherCode} /> : null}
              <Detail label="Conductor" value={transaction.conductorName || "—"} />
              <Detail label="Driver" value={transaction.driverName || "—"} />
              <Detail label="Unit" value={transaction.unitNumber || "—"} />
            </View>
          ) : null}
        </Pressable>
      ))}
      {!filtered.length ? <Text style={styles.subtitle}>No transactions found.</Text> : null}
    </ModalShell>
  );

  function Detail({ label, value }: { label: string; value: string }) {
    return (
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, marginVertical: 3 }}>
        <Text style={styles.subtitle}>{label}</Text>
        <Text style={[styles.cardTitle, { flex: 1, textAlign: "right", fontSize: 12 }]}>{value}</Text>
      </View>
    );
  }
}
