import { Pressable, View } from "react-native";
import { Text } from "../../../shared/ui/BrandText";
import { ConductorDatePicker } from "../../../shared/ui/ConductorDatePicker";
import { useAppTheme } from "../../../core/theme/ThemeProvider";

export type Filter = "ALL" | "Cash" | "GCash" | "Voucher";
export type DatePreset = "TODAY" | "LAST_7_DAYS" | "THIS_MONTH" | "ALL" | "CUSTOM";

export function formatInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getPresetRange(preset: DatePreset): { from: string; to: string } {
  const today = new Date();
  if (preset === "ALL" || preset === "CUSTOM") return { from: "", to: "" };
  if (preset === "THIS_MONTH") {
    return {
      from: formatInputDate(new Date(today.getFullYear(), today.getMonth(), 1)),
      to: formatInputDate(today),
    };
  }
  if (preset === "LAST_7_DAYS") {
    const from = new Date(today);
    from.setDate(today.getDate() - 6);
    return { from: formatInputDate(from), to: formatInputDate(today) };
  }
  return { from: formatInputDate(today), to: formatInputDate(today) };
}

const paymentOptions: Exclude<Filter, "ALL">[] = ["GCash", "Cash", "Voucher"];
const periodOptions: { value: Exclude<DatePreset, "ALL" | "CUSTOM">; label: string }[] = [
  { value: "TODAY", label: "Today" },
  { value: "LAST_7_DAYS", label: "7 days" },
  { value: "THIS_MONTH", label: "Month" },
];

const optionStyles = (selected: boolean, isLofi: boolean) => ({
  minHeight: 36,
  alignItems: "center" as const,
  justifyContent: "center" as const,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: selected ? "#1A5FB4" : isLofi ? "#E5E7EB" : "rgba(255,255,255,0.1)",
  backgroundColor: selected ? "#1A5FB4" : isLofi ? "#FFFFFF" : "#12304F",
  paddingHorizontal: 8,
});

interface TransactionFilterBarProps {
  filter: Filter;
  datePreset: DatePreset;
  fromDate: string;
  toDate: string;
  setFromDate: (val: string) => void;
  setToDate: (val: string) => void;
  onFilterChange: (filter: Filter) => void;
  onPresetChange: (preset: DatePreset) => void;
  onCustomDateApply: (from?: string, to?: string) => void;
}

export function TransactionFilterBar({
  filter,
  datePreset,
  fromDate,
  toDate,
  setFromDate,
  setToDate,
  onFilterChange,
  onPresetChange,
  onCustomDateApply,
}: TransactionFilterBarProps) {
  const { isLofi } = useAppTheme();
  const labelColor = isLofi ? "#6B7280" : "rgba(255,255,255,0.5)";
  const textColor = isLofi ? "#374151" : "rgba(255,255,255,0.75)";
  const onPressPayment = (value: Exclude<Filter, "ALL">) => onFilterChange(filter === value ? "ALL" : value);
  const onPressPeriod = (value: Exclude<DatePreset, "ALL" | "CUSTOM">) =>
    onPresetChange(datePreset === value ? "ALL" : value);

  return (
    <View style={{ gap: 10, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Text style={{ width: 64, color: labelColor, fontSize: 11, fontWeight: "600" }}>Payment</Text>
        <View style={{ flex: 1, flexDirection: "row", gap: 6 }}>
          {paymentOptions.map(value => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === value }}
              onPress={() => onPressPayment(value)}
              style={[optionStyles(filter === value, isLofi), { flex: 1 }]}
            ><Text style={{ color: filter === value ? "#FFFFFF" : textColor, fontSize: 12, fontWeight: "600" }}>{value}</Text></Pressable>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Text style={{ width: 64, color: labelColor, fontSize: 11, fontWeight: "600" }}>Period</Text>
        <View style={{ flex: 1, flexDirection: "row", gap: 6 }}>
          {periodOptions.map(({ value, label }) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: datePreset === value }}
              onPress={() => onPressPeriod(value)}
              style={[optionStyles(datePreset === value, isLofi), { flex: 1 }]}
            ><Text style={{ color: datePreset === value ? "#FFFFFF" : textColor, fontSize: 12, fontWeight: "600" }}>{label}</Text></Pressable>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Text style={{ width: 64, color: labelColor, fontSize: 11, fontWeight: "600" }}>Dates</Text>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ flex: 1 }}>
            <ConductorDatePicker
              value={fromDate}
              onChange={value => { setFromDate(value); onCustomDateApply(value, toDate); }}
              max={toDate || undefined}
              label="From date"
              placeholder="From"
            />
          </View>
          <Text style={{ color: labelColor, fontSize: 11 }}>to</Text>
          <View style={{ flex: 1 }}>
            <ConductorDatePicker
              value={toDate}
              onChange={value => { setToDate(value); onCustomDateApply(fromDate, value); }}
              min={fromDate || undefined}
              label="To date"
              placeholder="To"
            />
          </View>
        </View>
      </View>
      <Text style={{ paddingLeft: 76, color: labelColor, fontSize: 10 }}>Tap a selected option again to show all.</Text>
    </View>
  );
}
