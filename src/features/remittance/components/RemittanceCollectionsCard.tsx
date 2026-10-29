import React from "react";
import { View } from "react-native";
import { Text } from "../../../shared/ui/BrandText";
import { ConductorIcon } from "../../../shared/ui/ConductorIcon";
import type { Transaction } from "../../../core/domain/types";
import { useReportTheme } from "../report-styles";
import { money } from "../remittance-helpers";

interface RemittanceCollectionsCardProps {
  totalAmount: number;
  totalPassengers: number;
  transactionCount: number;
  transactions: Transaction[];
  accountableTotals: {
    cash: number;
    gcash: number;
    all: number;
  };
  voucherTotal: number;
  cashCount: number;
  voucherCount: number;
}

export function RemittanceCollectionsCard({
  totalAmount,
  totalPassengers,
  transactionCount,
  transactions,
  accountableTotals,
  voucherTotal,
  cashCount,
  voucherCount,
}: RemittanceCollectionsCardProps) {
  const { colors, isLofi, styles } = useReportTheme();
  const paymentBreakdown = [
    {
      key: "gcash-scanned",
      label: "GCash (Scanned)",
      color: colors.primary,
      count: transactions.filter((transaction) => transaction.paymentMethod === "GCash").length,
      amount: accountableTotals.gcash,
    },
    {
      key: "voucher",
      label: "Voucher (Free Ride)",
      color: colors.warning,
      count: voucherCount,
      amount: voucherTotal,
    },
    {
      key: "cash",
      label: "Cash",
      color: isLofi ? colors.text : "#4ADE80",
      count: cashCount,
      amount: accountableTotals.cash,
    },
  ].filter((item) => item.count > 0 || item.amount > 0);

  return (
    <>
      {/* Grand Total Collections Card */}
      <View style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: isLofi ? "#F3F4F6" : "rgba(26,95,180,0.15)", alignItems: "center", justifyContent: "center" }}><ConductorIcon name="cash" size={16} color={colors.primary} /></View>
          <Text style={[styles.label, { fontWeight: "600" }]}>Total Collections</Text>
        </View>
        <Text style={{ color: colors.primary, fontSize: 30, lineHeight: 36, fontWeight: "800" }}>
          {money(totalAmount)}
        </Text>
        <Text style={[styles.subtitle, { color: colors.subtle, marginTop: 4 }]}>
          {totalPassengers} passenger{totalPassengers !== 1 ? "s" : ""} · {transactionCount} transaction{transactionCount !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Payment Breakdown Card */}
      <View style={[styles.card, { padding: 0, overflow: "hidden" }]}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border }}>
          <Text style={styles.label}>Payment Breakdown</Text>
        </View>
        {paymentBreakdown.map((item) => (
          <View key={item.key} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: isLofi ? "#F3F4F6" : "rgba(255,255,255,0.04)" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 9, flex: 1 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isLofi ? colors.action : item.color }} />
              <Text style={{ color: colors.secondary, fontSize: 14, lineHeight: 20, fontWeight: "500", flexShrink: 1 }}>{item.label}</Text>
              <Text style={{ color: isLofi ? "#6B7280" : "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: "500" }}>{item.count}x</Text>
            </View>
            <Text style={{ color: item.color, fontSize: 14, lineHeight: 20, fontWeight: "700" }}>{money(item.amount)}</Text>
          </View>
        ))}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, backgroundColor: isLofi ? colors.surface2 : "rgba(255,255,255,0.02)", borderTopWidth: 1, borderColor: colors.border }}>
          <Text style={[styles.label, { fontSize: 12, color: isLofi ? "#4B5563" : "rgba(255,255,255,0.5)" }]}>Grand Total</Text>
          <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24, fontWeight: "800" }}>{money(accountableTotals.all)}</Text>
        </View>
      </View>
    </>
  );
}
