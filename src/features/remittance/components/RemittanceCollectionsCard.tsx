import { View } from "react-native";
import { Text } from "../../../shared/ui/BrandText";
import { ConductorIcon } from "../../../shared/ui/ConductorIcon";
import { useReportTheme } from "../report-styles";
import { money } from "../remittance-helpers";

interface RemittanceCollectionsCardProps {
  totalAmount: number;
  totalPassengers: number;
  transactionCount: number;
  shiftTimeIn: string;
}

export function RemittanceCollectionsCard({ totalAmount, totalPassengers, transactionCount, shiftTimeIn }: RemittanceCollectionsCardProps) {
  const { colors, styles } = useReportTheme();
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
        <ConductorIcon name="cash" size={18} color={colors.primaryLight} />
        <Text style={[styles.label, { fontWeight: "600", letterSpacing: 0.5 }]}>Total Collections</Text>
        <Text style={{ marginLeft: "auto", color: colors.secondary, fontSize: 11, fontWeight: "500" }}>
          {new Date(shiftTimeIn).toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
        </Text>
      </View>
      <Text adjustsFontSizeToFit numberOfLines={1} style={{ color: colors.text, fontSize: 48, lineHeight: 58, fontWeight: "800", letterSpacing: -1, fontVariant: ["tabular-nums"] }}>{money(totalAmount)}</Text>
      <Text style={[styles.subtitle, { color: colors.subtle, marginTop: 4 }]}>
        {totalPassengers} passenger{totalPassengers !== 1 ? "s" : ""} · {transactionCount} transaction{transactionCount !== 1 ? "s" : ""}
      </Text>
    </View>
  );
}
