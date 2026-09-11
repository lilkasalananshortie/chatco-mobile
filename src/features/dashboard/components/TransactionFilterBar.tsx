import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
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

interface TransactionFilterBarProps {
  filter: Filter;
  datePreset: DatePreset;
  fromDate: string;
  toDate: string;
  setFromDate: (val: string) => void;
  setToDate: (val: string) => void;
  onFilterChange: (filter: Filter) => void;
  onPresetChange: (preset: DatePreset) => void;
  onCustomDateApply: () => void;
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
  const { colors, styles } = useAppTheme();

  return (
    <>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 }}>
        {(["ALL", "Cash", "GCash", "Voucher"] as Filter[]).map((value) => (
          <Pressable
            key={value}
            onPress={() => onFilterChange(value)}
            style={[
              styles.button,
              styles.secondaryButton,
              filter === value && { backgroundColor: colors.primary },
            ]}
          >
            <Text
              style={[
                styles.buttonText,
                styles.secondaryButtonText,
                filter === value && { color: "#fff" },
              ]}
            >
              {value}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
        {(
          [
            ["TODAY", "Today"],
            ["LAST_7_DAYS", "7 Days"],
            ["THIS_MONTH", "This Month"],
            ["ALL", "All Time"],
          ] as [DatePreset, string][]
        ).map(([preset, label]) => (
          <Pressable
            key={preset}
            onPress={() => onPresetChange(preset)}
            style={[
              styles.button,
              styles.secondaryButton,
              { minHeight: 32, paddingVertical: 4, paddingHorizontal: 8 },
              datePreset === preset && { backgroundColor: colors.primary },
            ]}
          >
            <Text
              style={[
                styles.buttonText,
                styles.secondaryButtonText,
                { fontSize: 11 },
                datePreset === preset && { color: "#fff" },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 8, alignItems: "center" }}>
        <TextInput
          value={fromDate}
          onChangeText={setFromDate}
          style={[styles.input, { flex: 1, fontSize: 12, minHeight: 40 }]}
          placeholder="From YYYY-MM-DD"
          placeholderTextColor={colors.muted}
        />
        <TextInput
          value={toDate}
          onChangeText={setToDate}
          style={[styles.input, { flex: 1, fontSize: 12, minHeight: 40 }]}
          placeholder="To YYYY-MM-DD"
          placeholderTextColor={colors.muted}
        />
        <Pressable
          onPress={onCustomDateApply}
          style={[styles.button, { minHeight: 40, paddingHorizontal: 12 }]}
        >
          <Text style={[styles.buttonText, { fontSize: 12 }]}>Go</Text>
        </Pressable>
      </View>
    </>
  );
}
