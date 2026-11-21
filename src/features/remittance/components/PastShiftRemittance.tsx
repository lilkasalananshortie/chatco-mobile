import { Pressable, View } from "react-native";
import type { Remittance, Shift } from "../../../core/domain/types";
import { Text } from "../../../shared/ui/BrandText";
import { MinibusFrontIcon } from "../../shift/components/MinibusFrontIcon";
import { money } from "../remittance-helpers";
import { useReportTheme } from "../report-styles";

const MANILA = "Asia/Manila";

function shiftDayLabel(record: Remittance): string {
  const dated = record.date?.slice(0, 10);
  const value = dated && /^\d{4}-\d{2}-\d{2}$/.test(dated) ? `${dated}T00:00:00+08:00` : record.time_in;
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime())
    ? parsed.toLocaleDateString("en-US", { timeZone: MANILA, month: "short", day: "numeric", year: "numeric" })
    : "earlier";
}

function shortTime(value?: string): string | null {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime())
    ? parsed.toLocaleTimeString("en-PH", { timeZone: MANILA, hour: "numeric", minute: "2-digit" })
    : null;
}

export interface PastShiftRemittanceProps {
  record: Remittance;
  shift: Shift;
  totals: { cash: number; gcash: number; all: number };
  disabled: boolean;
  onRemit: () => void;
}

/** One-purpose screen for settling an earlier shift the system closed automatically. */
export function PastShiftRemittance({ record, shift, totals, disabled, onRemit }: PastShiftRemittanceProps) {
  const { colors, styles } = useReportTheme();
  const passengers = Number(record.total_passengers ?? 0);
  const start = shortTime(record.time_in);
  const end = shortTime(record.time_out);

  return <View>
    <Text style={[styles.label, { textTransform: "uppercase" }]}>Before your next shift</Text>
    <Text accessibilityRole="header" style={[styles.title, { marginTop: 4 }]}>Remit your {shiftDayLabel(record)} shift</Text>
    <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 4 }}>
      This shift was closed automatically while its collections were still with you. Remit it to the admin before you select a unit for today.
    </Text>

    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 20, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border }}>
      <MinibusFrontIcon size={32} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.label}>Your unit</Text>
        <Text numberOfLines={1} style={{ color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: "600" }}>
          {record.unit_number ?? shift.unitNumber}
          <Text style={{ color: colors.muted, fontWeight: "500" }}>  {record.driver_name ?? shift.driverName}</Text>
        </Text>
      </View>
      {start && end ? <Text style={{ color: colors.muted, fontSize: 12, fontVariant: ["tabular-nums"] }}>{start} – {end}</Text> : null}
    </View>

    <View style={[styles.card, { marginTop: 20, padding: 0, overflow: "hidden" }]}>
      <View style={{ padding: 16 }}>
        <Text style={styles.label}>Amount to remit</Text>
        <Text style={{ color: colors.text, fontSize: 30, lineHeight: 38, fontWeight: "800", marginTop: 4, fontVariant: ["tabular-nums"] }}>{money(totals.all)}</Text>
        <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 2 }}>{passengers} passenger{passengers === 1 ? "" : "s"}</Text>
      </View>
      {[{ label: "Cash", amount: totals.cash }, { label: "GCash", amount: totals.gcash }].map(item => (
        <View key={item.label} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.muted, fontSize: 13 }}>{item.label}</Text>
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600", fontVariant: ["tabular-nums"] }}>{money(item.amount)}</Text>
        </View>
      ))}
    </View>

    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onRemit} style={[styles.button, { marginTop: 20, opacity: disabled ? 0.6 : 1 }]}>
      <Text style={styles.buttonText}>Complete Pending Remittance</Text>
    </Pressable>
  </View>;
}
