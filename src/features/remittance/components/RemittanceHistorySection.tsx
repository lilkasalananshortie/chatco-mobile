import { useMemo } from "react";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "../../../shared/ui/BrandText";
import { Ionicons } from "@expo/vector-icons";
import type { Remittance } from "../../../core/domain/types";
import { useReportTheme } from "../report-styles";
import { ModalShell } from "../../../shared/ui";
import { ConductorDatePicker } from "../../../shared/ui/ConductorDatePicker";
import { money, remittanceStatusLabel } from "../remittance-helpers";

export type RemittanceHistoryFilter = "today" | "last7" | "week" | "month" | "date";

const FILTERS: { key: Exclude<RemittanceHistoryFilter, "date">; label: string }[] = [
  { key: "week", label: "This Week" },
  { key: "today", label: "Today" },
  { key: "last7", label: "Last 7 Days" },
  { key: "month", label: "This Month" },
];

function asDate(value: string | undefined) {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateLabel(value: string | undefined) {
  const date = asDate(value);
  return date ? date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "—";
}

function localDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function awaitingCash(record: Remittance) {
  return ["For Cash Declaration", "Overdue"].includes(remittanceStatusLabel(record));
}

export interface RemittanceHistorySectionProps {
  history: Remittance[];
  expanded: boolean;
  onToggle: () => void;
  loading: boolean;
  error: string;
  onRetry: () => void;
  filter: RemittanceHistoryFilter;
  onFilterChange: (filter: RemittanceHistoryFilter) => void;
  dateFrom: string;
  onDateFromChange: (date: string) => void;
  dateTo: string;
  onDateToChange: (date: string) => void;
  page: number;
  onPageChange: (page: number) => void;
  onView: (record: Remittance) => void;
  onPrint: (record: Remittance) => void;
}

export function RemittanceHistorySection({
  history,
  expanded,
  onToggle,
  loading,
  error,
  onRetry,
  filter,
  onFilterChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  page,
  onPageChange,
  onView,
  onPrint,
}: RemittanceHistorySectionProps) {
  const { colors, isLofi, styles } = useReportTheme();
  const [periodPicker, setPeriodPicker] = useState(false);
  const filteredHistory = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = localDateString(today);
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const last7Start = new Date(today);
    last7Start.setDate(today.getDate() - 6);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    return history.filter((record) => {
      const key = String(record.date ?? record.remitted_at ?? "").slice(0, 10);
      const date = asDate(key);
      if (!date) return false;
      if (filter === "today") return key === todayKey;
      if (filter === "last7") return date >= last7Start && date <= today;
      if (filter === "week") {
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return date >= monday && date <= sunday;
      }
      if (filter === "month") return date >= monthStart && date <= today;
      if (dateFrom && dateTo) return key >= dateFrom && key <= dateTo;
      const selectedDate = dateFrom || dateTo;
      return selectedDate ? key === selectedDate : true;
    });
  }, [history, filter, dateFrom, dateTo]);

  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / pageSize));
  const activePage = Math.min(page, totalPages);
  const rows = filteredHistory.slice((activePage - 1) * pageSize, activePage * pageSize);
  const activeLabel = filter === "date"
    ? dateFrom && dateTo
      ? `${dateLabel(dateFrom)} – ${dateLabel(dateTo)}`
      : dateFrom || dateTo
        ? dateLabel(dateFrom || dateTo)
        : "Custom Date"
    : FILTERS.find((option) => option.key === filter)?.label ?? "This Week";
  const chooseFilter = (value: RemittanceHistoryFilter) => {
    onFilterChange(value);
    if (value !== "date") {
      onDateFromChange("");
      onDateToChange("");
    }
    onPageChange(1);
  };

  const changeDate = (edge: "from" | "to", value: string) => {
    if (edge === "from") onDateFromChange(value);
    else onDateToChange(value);
    onFilterChange(value || (edge === "from" ? dateTo : dateFrom) ? "date" : "week");
    onPageChange(1);
  };

  return (
    <View style={{ gap: 12 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={[styles.card, { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 }]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: isLofi ? colors.surface2 : "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="time-outline" size={18} color={colors.muted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: "700" }}>
              Remittance History <Text style={{ color: colors.muted, fontWeight: "500" }}>({activeLabel})</Text>
            </Text>
            <Text style={{ color: colors.muted, fontSize: 10, marginTop: 3 }}>
              {filteredHistory.length} record{filteredHistory.length === 1 ? "" : "s"} total
            </Text>
          </View>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={19} color={colors.muted} />
      </Pressable>

      {expanded ? (
        <View style={{ gap: 12 }}>
          <View style={{ gap: 4 }}>
            <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "600" }}>Period</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Filter remittance history period" onPress={() => setPeriodPicker(true)} style={{ height: 32, borderRadius: 8, borderWidth: 1, borderColor: isLofi ? "#D1D5DB" : "rgba(255,255,255,0.1)", backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10 }}>
              <Text style={{ color: colors.text, fontSize: 11, fontWeight: "600" }}>{filter === "date" ? "Selected Date/Range" : activeLabel}</Text>
              <Ionicons name="chevron-down" size={13} color={colors.muted} />
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            {(["from", "to"] as const).map((edge) => {
              const value = edge === "from" ? dateFrom : dateTo;
              return (
                <View key={edge} style={{ flex: 1, gap: 5 }}>
                  <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "700" }}>{edge === "from" ? "From" : "To"}</Text>
                  <ConductorDatePicker label={`Filter remittance history ${edge} date`} value={value} onChange={next => changeDate(edge, next)} min={edge === "to" ? dateFrom || undefined : undefined} max={edge === "from" ? dateTo || undefined : undefined} />
                </View>
              );
            })}
          </View>

          {loading ? (
            <View style={[styles.card, { alignItems: "center", paddingVertical: 28 }]}>
              <Text style={styles.subtitle}>Loading remittance history…</Text>
            </View>
          ) : error ? (
            <Pressable accessibilityRole="button" onPress={onRetry} style={[styles.card, { alignItems: "center", paddingVertical: 28 }]}>
              <Text style={styles.error}>{error}</Text>
              <Text style={[styles.subtitle, { marginTop: 6 }]}>Tap to retry.</Text>
            </Pressable>
          ) : rows.length === 0 ? (
            <View style={[styles.card, { alignItems: "center", paddingVertical: 28 }]}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: isLofi ? colors.surface2 : "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                <Ionicons name="document-text-outline" size={22} color={colors.muted} />
              </View>
              <Text style={[styles.subtitle, { fontWeight: "600" }]}>No records yet</Text>
              <Text style={[styles.subtitle, { fontSize: 10, marginTop: 2 }]}>Remittances will appear here after each shift</Text>
            </View>
          ) : (
            <>
              <View style={{ gap: 10 }}>
                {rows.map((record, index) => {
                  const status = remittanceStatusLabel(record);
                  const isAwaiting = awaitingCash(record);
                  const totalCollected = (Number(record.cash_total) || 0) + (Number(record.gcash_total) || 0);
                  const statusIcon = status.toUpperCase() === "OVERAGE" ? "trending-up-outline" : status.toUpperCase() === "SHORTAGE" ? "trending-down-outline" : status.toUpperCase() === "SETTLED" ? "checkmark" : null;
                  return (
                    <View key={record.id ?? `${record.shift_id}-${index}`} style={[styles.card, { gap: 10 }]}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <Text style={{ color: colors.text, fontSize: 12, fontWeight: "800" }}>{dateLabel(record.date ?? record.remitted_at)}</Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.7 }}>{status}</Text>
                          {statusIcon ? <Ionicons name={statusIcon} size={13} color={colors.muted} /> : null}
                        </View>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        <Text style={{ color: colors.text, fontSize: 11, fontWeight: "700" }}>{record.conductor_name || "Conductor"}</Text>
                        <Text style={{ color: colors.muted, fontSize: 11 }}>{record.driver_name || "Driver"}</Text>
                      </View>
                      <View style={{ flexDirection: "row", gap: 7 }}>
                        {[
                          { label: "GCash", value: money(record.gcash_total), color: colors.primary },
                          { label: "Cash", value: money(record.cash_total), color: colors.success },
                          { label: "Cashless", value: money(record.total_cashless), color: colors.text },
                        ].map((stat) => (
                          <View key={stat.label} style={{ flex: 1, backgroundColor: isLofi ? colors.surface2 : "rgba(255,255,255,0.03)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 8 }}>
                            <Text style={{ color: colors.muted, fontSize: 8, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>{stat.label}</Text>
                            <Text numberOfLines={1} style={{ color: stat.color, fontSize: 14, lineHeight: 20, fontWeight: "800", marginTop: 2 }}>{stat.value}</Text>
                          </View>
                        ))}
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, borderTopWidth: 1, borderColor: colors.border, paddingTop: 9 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700" }}>Total <Text style={{ color: colors.text, fontWeight: "900" }}>{money(totalCollected)}</Text></Text>
                          <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "600", marginTop: 3 }}>
                            Admin declared cash <Text style={{ color: colors.text }}>{isAwaiting ? "Awaiting" : money(record.declared_amount ?? record.cash_declared)}</Text>
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                          <Pressable accessibilityRole="button" accessibilityLabel="View official report" onPress={() => onView(record)} style={{ minHeight: 36, flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Ionicons name="document-text-outline" size={15} color={colors.primary} />
                            <Text style={{ color: colors.primary, fontSize: 10, fontWeight: "700" }}>View</Text>
                          </Pressable>
                          <Pressable accessibilityRole="button" accessibilityLabel="Print official report" onPress={() => onPrint(record)} style={{ minHeight: 36, flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Ionicons name="print-outline" size={15} color={colors.success} />
                            <Text style={{ color: colors.success, fontSize: 10, fontWeight: "700" }}>Print</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
              {totalPages > 1 ? (
                <View style={[styles.card, { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10 }]}>
                  <Pressable accessibilityRole="button" disabled={activePage === 1} onPress={() => onPageChange(Math.max(1, activePage - 1))} style={{ minHeight: 36, flexDirection: "row", alignItems: "center", gap: 4, opacity: activePage === 1 ? 0.35 : 1 }}>
                    <Ionicons name="chevron-back" size={15} color={colors.muted} />
                    <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700" }}>Prev</Text>
                  </Pressable>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    {Array.from({ length: totalPages }, (_, index) => index + 1).map((value) => (
                      <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: activePage === value }} onPress={() => onPageChange(value)} style={{ width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: activePage === value ? colors.action : "transparent" }}>
                        <Text style={{ color: activePage === value ? "#FFFFFF" : colors.muted, fontSize: 11, fontWeight: "800" }}>{value}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Pressable accessibilityRole="button" disabled={activePage === totalPages} onPress={() => onPageChange(Math.min(totalPages, activePage + 1))} style={{ minHeight: 36, flexDirection: "row", alignItems: "center", gap: 4, opacity: activePage === totalPages ? 0.35 : 1 }}>
                    <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700" }}>Next</Text>
                    <Ionicons name="chevron-forward" size={15} color={colors.muted} />
                  </Pressable>
                </View>
              ) : null}
            </>
          )}
        </View>
      ) : null}

      <ModalShell visible={periodPicker} title="Period" onClose={() => setPeriodPicker(false)}>
        {FILTERS.map(option => <Pressable key={option.key} accessibilityRole="button" accessibilityState={{ selected: filter === option.key }} onPress={() => { chooseFilter(option.key); setPeriodPicker(false); }} style={{ padding: 12, borderRadius: 8, backgroundColor: filter === option.key ? colors.action : colors.surface }}><Text style={{ color: filter === option.key ? "#FFFFFF" : colors.text, fontSize: 14 }}>{option.label}</Text></Pressable>)}
      </ModalShell>

    </View>
  );
}
