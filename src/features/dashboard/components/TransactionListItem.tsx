import React from "react";
import { Pressable, View } from "react-native";
import type { Transaction } from "../../../core/domain/types";
import { Text } from "../../../shared/ui/BrandText";
import { ConductorIcon } from "../../../shared/ui/ConductorIcon";
import { useAppTheme } from "../../../core/theme/ThemeProvider";

interface TransactionListItemProps {
  transaction: Transaction;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const formatPeso = (amount: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount || 0);

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  const { isLofi } = useAppTheme();
  return (
    <View style={{ minHeight: 28, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottomWidth: 1, borderColor: isLofi ? "#E5E7EB" : "rgba(255,255,255,0.1)", paddingVertical: 6 }}>
      <Text style={{ color: isLofi ? "#6B7280" : "rgba(255,255,255,0.45)", fontSize: 12 }}>{label}</Text>
      <Text style={{ flex: 1, color: isLofi ? "#111827" : "#FFFFFF", fontSize: mono ? 11 : 12, fontWeight: "500", textAlign: "right", fontFamily: mono ? "monospace" : undefined }}>
        {value}
      </Text>
    </View>
  );
}

export function TransactionListItem({ transaction, isExpanded, onToggleExpand }: TransactionListItemProps) {
  const { isLofi } = useAppTheme();
  const text = isLofi ? "#111827" : "#FFFFFF";
  const muted = isLofi ? "#6B7280" : "rgba(255,255,255,0.45)";
  const when = new Date(transaction.timestamp);
  const displayDate = when.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const displayTime = when.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const paymentMethod = transaction.paymentMethod.startsWith("GCash") ? "GCash" : transaction.paymentMethod;

  return (
    <View style={{ backgroundColor: isExpanded ? (isLofi ? "#F9FAFB" : "#0B223A") : "transparent" }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        onPress={onToggleExpand}
        style={{ minHeight: 68, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 12 }}
      >
        <View style={{ width: 56 }}>
          <Text style={{ color: isLofi ? "#374151" : "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "600", fontVariant: ["tabular-nums"] }}>{displayTime}</Text>
          <Text style={{ color: muted, fontSize: 10, marginTop: 2 }}>{when.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: text, fontSize: 14, fontWeight: "600" }}>{transaction.passengerName || "Walk-in"}</Text>
          <Text numberOfLines={1} style={{ color: muted, fontSize: 12, marginTop: 2 }}>{transaction.from} → {transaction.to}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ color: text, fontSize: 14, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{formatPeso(transaction.finalAmount)}</Text>
            <Text style={{ color: muted, fontSize: 10, fontWeight: "500", marginTop: 2 }}>{paymentMethod}</Text>
          </View>
          <ConductorIcon name={isExpanded ? "up" : "down"} size={16} color={isLofi ? "#9CA3AF" : "rgba(255,255,255,0.35)"} />
        </View>
      </Pressable>

      {isExpanded ? (
        <View style={{ gap: 12, paddingHorizontal: 20, paddingBottom: 16 }}>
          <View style={{ borderTopWidth: 1, borderColor: isLofi ? "#E5E7EB" : "rgba(255,255,255,0.1)" }}>
            <Detail label="Fare" value={formatPeso(transaction.finalAmount)} />
            <Detail label="First km" value={formatPeso(transaction.baseFare ?? 0)} />
            <Detail label="Succeeding rate" value={formatPeso(transaction.succeedingKm ?? 0)} />
            {(transaction.discountAmount ?? 0) > 0 ? <Detail label="Discount" value={`− ${formatPeso(transaction.discountAmount ?? 0)}`} /> : null}
            <Detail label="Distance" value={`${transaction.distance ?? 0} km`} />
            <Detail label="Payment" value={paymentMethod} />
          </View>
          <View style={{ borderTopWidth: 1, borderColor: isLofi ? "#E5E7EB" : "rgba(255,255,255,0.1)" }}>
            <Detail label="Passenger" value={transaction.passengerName || "Walk-in"} />
            <Detail label="Passenger ID" value={transaction.passengerId || "—"} />
            {transaction.passengerRole ? <Detail label="Type" value={transaction.passengerRole} /> : null}
          </View>
          <View style={{ borderTopWidth: 1, borderColor: isLofi ? "#E5E7EB" : "rgba(255,255,255,0.1)" }}>
            <Detail label="Unit" value={transaction.unitNumber || "—"} />
            <Detail label="Driver" value={transaction.driverName || "—"} />
            <Detail label="Conductor" value={transaction.conductorName || "—"} />
            <Detail label="Recorded" value={`${displayDate}, ${displayTime}`} />
            <Detail label="Txn ID" value={transaction.transactionId} mono />
          </View>
        </View>
      ) : null}
    </View>
  );
}
