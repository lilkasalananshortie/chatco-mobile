import React from "react";
import { Text, View } from "react-native";
import { useAppTheme } from "../../../core/theme/ThemeProvider";
import type { TripCycleState } from "../../../core/utils/trip-cycle-tracker";
import { money } from "../remittance-helpers";

interface RemittanceCollectionsCardProps {
  totalAmount: number;
  totalPassengers: number;
  transactionCount: number;
  tripCycle: TripCycleState | null;
  accountableTotals: {
    cash: number;
    gcash: number;
    all: number;
  };
  voucherTotal: number;
  cashCount: number;
  gcashCount: number;
  voucherCount: number;
}

export function RemittanceCollectionsCard({
  totalAmount,
  totalPassengers,
  transactionCount,
  tripCycle,
  accountableTotals,
  voucherTotal,
  cashCount,
  gcashCount,
  voucherCount,
}: RemittanceCollectionsCardProps) {
  const { colors, isLofi, styles } = useAppTheme();

  return (
    <>
      {/* Grand Total Collections Card */}
      <View style={[styles.card, { paddingVertical: 18 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <Text style={{ fontSize: 14 }}>🧾</Text>
          <Text style={styles.label}>Total Collections</Text>
        </View>
        <Text style={{ color: colors.primary, fontSize: 34, fontWeight: "900", letterSpacing: -0.5, marginTop: 4 }}>
          {money(totalAmount)}
        </Text>
        <Text style={[styles.subtitle, { fontSize: 11, marginTop: 4 }]}>
          {totalPassengers} passenger{totalPassengers !== 1 ? "s" : ""} · {transactionCount} transaction{transactionCount !== 1 ? "s" : ""}
          {tripCycle && (tripCycle.completedTrips.length > 0 || tripCycle.currentTripNumber > 1)
            ? ` · ${tripCycle.completedTrips.length} trip${tripCycle.completedTrips.length === 1 ? "" : "s"} (${Math.floor(tripCycle.completedTrips.length / 2)} full ikot)`
            : ""}
        </Text>
      </View>

      {/* Payment Breakdown Card */}
      <View style={styles.card}>
        <Text style={[styles.label, { marginBottom: 12 }]}>Payment Breakdown</Text>
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: isLofi ? 1 : 4, backgroundColor: colors.primary }} />
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>GCash</Text>
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "600" }}>{gcashCount}x</Text>
            </View>
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "800" }}>{money(accountableTotals.gcash)}</Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: isLofi ? 1 : 4, backgroundColor: colors.success }} />
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>Cash</Text>
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "600" }}>{cashCount}x</Text>
            </View>
            <Text style={{ color: colors.success, fontSize: 14, fontWeight: "800" }}>{money(accountableTotals.cash)}</Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: isLofi ? 1 : 4, backgroundColor: colors.warning }} />
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>Voucher</Text>
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "600" }}>{voucherCount}x</Text>
            </View>
            <Text style={{ color: colors.warning, fontSize: 14, fontWeight: "800" }}>{money(voucherTotal)}</Text>
          </View>

          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={[styles.label, { fontSize: 11 }]}>Grand Total</Text>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "900" }}>{money(accountableTotals.all)}</Text>
          </View>
        </View>
      </View>
    </>
  );
}
