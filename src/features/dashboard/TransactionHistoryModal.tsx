import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../core/api/chatco-api";
import type { Transaction } from "../../core/domain/types";
import type { TripCycleState } from "../../core/utils/trip-cycle-tracker";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import { Text } from "../../shared/ui/BrandText";
import { ConductorIcon } from "../../shared/ui/ConductorIcon";
import {
  TransactionFilterBar,
  getPresetRange,
  type Filter,
  type DatePreset,
} from "./components/TransactionFilterBar";
import { TransactionListItem } from "./components/TransactionListItem";
import { TripHistoryLog } from "./TripHistoryLog";

const PAGE_SIZE = 25;
const formatPeso = (amount: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount || 0);

function shortDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function periodLabel(preset: DatePreset, from: string, to: string) {
  if (preset === "TODAY") return "Today";
  if (preset === "LAST_7_DAYS") return "Last 7 days";
  if (preset === "THIS_MONTH") return "This month";
  if (!from && !to) return "All dates";
  if (from && to) return from === to ? shortDate(from) : `${shortDate(from)} – ${shortDate(to)}`;
  return from ? `From ${shortDate(from)}` : `Until ${shortDate(to)}`;
}

export function TransactionHistoryModal({
  visible,
  shiftId,
  transactions: initialTransactions = [],
  tripCycleState = null,
  onClose,
}: {
  visible: boolean;
  shiftId?: string;
  transactions?: Transaction[];
  tripCycleState?: TripCycleState | null;
  onClose: () => void;
}) {
  const { isLofi } = useAppTheme();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [datePreset, setDatePreset] = useState<DatePreset>("TODAY");
  const [fromDate, setFromDate] = useState(() => getPresetRange("TODAY").from);
  const [toDate, setToDate] = useState(() => getPresetRange("TODAY").to);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [items, setItems] = useState<Transaction[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [historyView, setHistoryView] = useState<"TRANSACTIONS" | "TRIPS">("TRANSACTIONS");
  const requestSeqRef = useRef(0);

  const loadData = useCallback(
    async (page: number, currentFilter: Filter, from: string, to: string) => {
      if (!shiftId) {
        const filtered = initialTransactions.filter((transaction) => {
          if (currentFilter !== "ALL" && transaction.paymentMethod !== currentFilter) return false;
          const time = new Date(transaction.timestamp);
          if (from && time < new Date(`${from}T00:00:00`)) return false;
          if (to && time > new Date(`${to}T23:59:59`)) return false;
          return true;
        });
        setItems(filtered);
        setCurrentPage(1);
        setTotalPages(1);
        setTotalCount(filtered.length);
        setTotalAmount(filtered.reduce((sum, transaction) => sum + transaction.finalAmount, 0));
        return;
      }

      const seq = ++requestSeqRef.current;
      setLoading(true);
      setExpanded(null);
      try {
        const result = await api.transactionsPage(shiftId, {
          page,
          perPage: PAGE_SIZE,
          paymentMethod: currentFilter,
          dateFrom: from || undefined,
          dateTo: to || undefined,
        });
        if (requestSeqRef.current !== seq) return;
        setItems(result.transactions);
        setCurrentPage(result.currentPage);
        setTotalPages(Math.max(1, result.totalPages));
        setTotalCount(result.total);
        setTotalAmount(result.totalAmount);
      } catch {
        if (requestSeqRef.current !== seq) return;
        const filtered = initialTransactions.filter((transaction) => {
          if (currentFilter !== "ALL" && transaction.paymentMethod !== currentFilter) return false;
          const time = new Date(transaction.timestamp);
          if (from && time < new Date(`${from}T00:00:00`)) return false;
          if (to && time > new Date(`${to}T23:59:59`)) return false;
          return true;
        });
        setItems(filtered);
        setCurrentPage(1);
        setTotalPages(1);
        setTotalCount(filtered.length);
        setTotalAmount(filtered.reduce((sum, transaction) => sum + transaction.finalAmount, 0));
      } finally {
        if (requestSeqRef.current === seq) setLoading(false);
      }
    },
    [shiftId, initialTransactions]
  );

  useEffect(() => {
    if (!visible) return;
    const todayRange = getPresetRange("TODAY");
    setDatePreset("TODAY");
    setFromDate(todayRange.from);
    setToDate(todayRange.to);
    setFilter("ALL");
    setCurrentPage(1);
    setExpanded(null);
    setFiltersOpen(false);
    setHistoryView("TRANSACTIONS");
    void loadData(1, "ALL", todayRange.from, todayRange.to);
  }, [visible, shiftId]);

  const handleFilterChange = (nextFilter: Filter) => {
    setFilter(nextFilter);
    setCurrentPage(1);
    void loadData(1, nextFilter, fromDate, toDate);
  };

  const handlePresetChange = (nextPreset: DatePreset) => {
    setDatePreset(nextPreset);
    const range = getPresetRange(nextPreset);
    setFromDate(range.from);
    setToDate(range.to);
    setCurrentPage(1);
    void loadData(1, filter, range.from, range.to);
  };

  const handleCustomDateApply = (from = fromDate, to = toDate) => {
    setDatePreset("CUSTOM");
    setFromDate(from);
    setToDate(to);
    setCurrentPage(1);
    void loadData(1, filter, from, to);
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || loading) return;
    void loadData(page, filter, fromDate, toDate);
  };

  const clearDateFilter = () => {
    setDatePreset("ALL");
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
    void loadData(1, filter, "", "");
  };

  const hasDateFilter = datePreset !== "ALL" || fromDate !== "" || toDate !== "";
  const hasActiveFilter = filter !== "ALL" || hasDateFilter;
  const safePage = Math.min(currentPage, totalPages);
  const text = isLofi ? "#111827" : "#FFFFFF";
  const muted = isLofi ? "#6B7280" : "rgba(255,255,255,0.55)";
  const hairline = isLofi ? "#E5E7EB" : "rgba(255,255,255,0.1)";
  const pageHeight = Math.min(windowHeight * 0.92, 920);
  const tripCount = tripCycleState ? tripCycleState.completedTrips.length + 1 : 0;

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" }}>
        <Pressable accessibilityLabel="Close transaction history" onPress={onClose} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
        <View
          accessibilityViewIsModal
          style={{
            width: "100%",
            maxWidth: 512,
            height: pageHeight,
            overflow: "hidden",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            borderWidth: 1,
            borderBottomWidth: 0,
            borderColor: hairline,
            backgroundColor: isLofi ? "#FFFFFF" : "#071A2E",
          }}
        >
          <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <Text style={{ color: muted, fontSize: 10, lineHeight: 15, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase" }}>{historyView === "TRIPS" ? "Trip History" : "Transaction History"}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close transaction history" onPress={onClose} style={{ width: 32, height: 32, marginTop: -6, marginRight: -6, alignItems: "center", justifyContent: "center", borderRadius: 8 }}>
                <ConductorIcon name="close" size={18} color={muted} />
              </Pressable>
            </View>
            <Text accessibilityLiveRegion="polite" style={{ marginTop: 2, color: text, fontSize: 36, lineHeight: 42, fontWeight: "700", letterSpacing: -0.6, fontVariant: ["tabular-nums"] }}>
              {historyView === "TRIPS" ? tripCount : loading ? "—" : formatPeso(totalAmount)}
            </Text>
            <Text style={{ marginTop: 4, color: muted, fontSize: 12, lineHeight: 18 }}>
              {historyView === "TRIPS" ? `${tripCount} trip${tripCount === 1 ? "" : "s"} recorded this shift` : <>
                {loading ? "Loading…" : `${totalCount} transaction${totalCount !== 1 ? "s" : ""}`}
                <Text style={{ color: isLofi ? "#D1D5DB" : "rgba(255,255,255,0.25)" }}> · </Text>
                {periodLabel(datePreset, fromDate, toDate)}
                {filter !== "ALL" ? <><Text style={{ color: isLofi ? "#D1D5DB" : "rgba(255,255,255,0.25)" }}> · </Text>{filter}</> : null}
              </>}
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: hairline, backgroundColor: isLofi ? "#F9FAFB" : "#0B223A" }}>
            {([["TRANSACTIONS", "Transactions"], ["TRIPS", "Trip Log"]] as const).map(([view, label]) => {
              const selected = historyView === view;
              return <Pressable key={view} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => setHistoryView(view)} style={{ minHeight: 36, flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 8, borderWidth: 1, borderColor: selected ? "#1A5FB4" : hairline, backgroundColor: selected ? "#1A5FB4" : (isLofi ? "#FFFFFF" : "#12304F") }}>
                <Text style={{ color: selected ? "#FFFFFF" : (isLofi ? "#374151" : "rgba(255,255,255,0.72)"), fontSize: 12, fontWeight: "700" }}>{label}</Text>
              </Pressable>;
            })}
          </View>

          {historyView === "TRANSACTIONS" ? <View style={{ borderBottomWidth: 1, borderColor: hairline, backgroundColor: isLofi ? "#F9FAFB" : "#0B223A" }}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: filtersOpen }} onPress={() => setFiltersOpen(open => !open)} style={{ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 20, paddingVertical: 12 }}>
              <Text style={{ color: text, fontSize: 12, fontWeight: "600" }}>Filters</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 }}>
                <Text numberOfLines={1} style={{ flexShrink: 1, color: muted, fontSize: 12, textAlign: "right" }}>{periodLabel(datePreset, fromDate, toDate)} · {filter === "ALL" ? "All payments" : filter}</Text>
                <ConductorIcon name={filtersOpen ? "up" : "down"} size={16} color={muted} />
              </View>
            </Pressable>
            {filtersOpen ? (
              <TransactionFilterBar
                filter={filter}
                datePreset={datePreset}
                fromDate={fromDate}
                toDate={toDate}
                setFromDate={setFromDate}
                setToDate={setToDate}
                onFilterChange={handleFilterChange}
                onPresetChange={handlePresetChange}
                onCustomDateApply={handleCustomDateApply}
              />
            ) : null}
          </View> : null}

          {historyView === "TRIPS" ? <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled"><TripHistoryLog state={tripCycleState} /></ScrollView> : <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            {loading ? (
              <View accessibilityRole="progressbar" style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 24 }}>
                <ActivityIndicator color="#1A5FB4" size="small" />
                <Text style={{ marginTop: 8, color: muted, fontSize: 12 }}>Loading transactions…</Text>
              </View>
            ) : items.length === 0 ? (
              <View style={{ alignItems: "center", paddingHorizontal: 20, paddingVertical: 48 }}>
                <Text style={{ color: text, fontSize: 14, fontWeight: "600" }}>No transactions here.</Text>
                <Text style={{ maxWidth: 260, marginTop: 4, color: muted, fontSize: 12, lineHeight: 18, textAlign: "center" }}>
                  {hasActiveFilter ? "Nothing matches this period or payment method." : "Fares you record this shift show up here."}
                </Text>
                {hasDateFilter ? (
                  <Pressable accessibilityRole="button" onPress={clearDateFilter} style={{ minHeight: 36, marginTop: 12, justifyContent: "center", borderWidth: 1, borderColor: hairline, borderRadius: 8, backgroundColor: isLofi ? "#FFFFFF" : "#12304F", paddingHorizontal: 12 }}>
                    <Text style={{ color: isLofi ? "#374151" : "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "600" }}>Show all dates</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <View>
                {items.map((transaction, index) => (
                  <View key={transaction.transactionId}>
                    <TransactionListItem
                      transaction={transaction}
                      isExpanded={expanded === transaction.transactionId}
                      onToggleExpand={() => setExpanded(expanded === transaction.transactionId ? null : transaction.transactionId)}
                    />
                    {index < items.length - 1 ? <View style={{ height: 1, backgroundColor: hairline, marginHorizontal: 20 }} /> : null}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>}

          {historyView === "TRANSACTIONS" ? <View style={{ minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderTopWidth: 1, borderColor: hairline, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(12, insets.bottom) }}>
            <Text style={{ color: muted, fontSize: 11, fontVariant: ["tabular-nums"] }}>
              {totalCount > 0 ? `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, totalCount)} of ${totalCount}` : "0 of 0"}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {([[-1, "Previous"], [1, "Next"]] as const).map(([delta, label]) => {
                const disabled = loading || (delta < 0 ? safePage === 1 : safePage === totalPages);
                return (
                  <Pressable
                    key={label}
                    accessibilityRole="button"
                    accessibilityState={{ disabled }}
                    disabled={disabled}
                    onPress={() => handlePageChange(safePage + delta)}
                    style={{ minHeight: 32, justifyContent: "center", borderWidth: 1, borderColor: hairline, borderRadius: 8, backgroundColor: isLofi ? "#FFFFFF" : "#12304F", paddingHorizontal: 12, opacity: disabled ? 0.4 : 1 }}
                  >
                    <Text style={{ color: isLofi ? "#374151" : "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "600" }}>{label}</Text>
                  </Pressable>
                );
              })}
              <Text style={{ minWidth: 32, color: muted, fontSize: 11, textAlign: "center", fontVariant: ["tabular-nums"] }}>{safePage} / {totalPages}</Text>
            </View>
          </View> : <View style={{ minHeight: Math.max(24, insets.bottom), borderTopWidth: 1, borderColor: hairline }} />}
        </View>
      </View>
    </Modal>
  );
}
