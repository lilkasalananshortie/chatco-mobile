import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { api } from "../../core/api/chatco-api";
import type { Transaction } from "../../core/domain/types";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import { ModalShell } from "../../shared/ui";
import {
  TransactionFilterBar,
  getPresetRange,
  type Filter,
  type DatePreset,
} from "./components/TransactionFilterBar";
import { TransactionListItem } from "./components/TransactionListItem";

export function TransactionHistoryModal({
  visible,
  shiftId,
  transactions: initialTransactions = [],
  onClose,
}: {
  visible: boolean;
  shiftId?: string;
  transactions?: Transaction[];
  onClose: () => void;
}) {
  const { colors, styles } = useAppTheme();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [datePreset, setDatePreset] = useState<DatePreset>("TODAY");
  const [fromDate, setFromDate] = useState(() => getPresetRange("TODAY").from);
  const [toDate, setToDate] = useState(() => getPresetRange("TODAY").to);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [items, setItems] = useState<Transaction[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const requestSeqRef = useRef(0);

  const loadData = useCallback(
    async (page: number, currentFilter: Filter, from: string, to: string) => {
      if (!shiftId) {
        const filtered = initialTransactions.filter((t) => {
          if (currentFilter !== "ALL" && t.paymentMethod !== currentFilter) return false;
          const time = new Date(t.timestamp);
          if (from && time < new Date(`${from}T00:00:00`)) return false;
          if (to && time > new Date(`${to}T23:59:59`)) return false;
          return true;
        });
        setItems(filtered);
        setCurrentPage(1);
        setTotalPages(1);
        setTotalCount(filtered.length);
        setTotalAmount(filtered.reduce((sum, item) => sum + item.finalAmount, 0));
        return;
      }

      const seq = ++requestSeqRef.current;
      setLoading(true);

      try {
        const res = await api.transactionsPage(shiftId, {
          page,
          perPage: 25,
          paymentMethod: currentFilter,
          dateFrom: from || undefined,
          dateTo: to || undefined,
        });
        if (requestSeqRef.current !== seq) return;
        setItems(res.transactions);
        setCurrentPage(res.currentPage);
        setTotalPages(Math.max(1, res.totalPages));
        setTotalCount(res.total);
        setTotalAmount(res.totalAmount);
      } catch {
        if (requestSeqRef.current !== seq) return;
        const filtered = initialTransactions.filter((t) => {
          if (currentFilter !== "ALL" && t.paymentMethod !== currentFilter) return false;
          const time = new Date(t.timestamp);
          if (from && time < new Date(`${from}T00:00:00`)) return false;
          if (to && time > new Date(`${to}T23:59:59`)) return false;
          return true;
        });
        setItems(filtered);
        setCurrentPage(1);
        setTotalPages(1);
        setTotalCount(filtered.length);
        setTotalAmount(filtered.reduce((sum, item) => sum + item.finalAmount, 0));
      } finally {
        if (requestSeqRef.current === seq) {
          setLoading(false);
        }
      }
    },
    [shiftId, initialTransactions]
  );

  useEffect(() => {
    if (visible) {
      const todayRange = getPresetRange("TODAY");
      setDatePreset("TODAY");
      setFromDate(todayRange.from);
      setToDate(todayRange.to);
      setFilter("ALL");
      setCurrentPage(1);
      setExpanded(null);
      void loadData(1, "ALL", todayRange.from, todayRange.to);
    }
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

  const handleCustomDateApply = () => {
    setDatePreset("CUSTOM");
    setCurrentPage(1);
    void loadData(1, filter, fromDate, toDate);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || loading) return;
    setCurrentPage(newPage);
    void loadData(newPage, filter, fromDate, toDate);
  };

  return (
    <ModalShell visible={visible} title="Transaction History" onClose={onClose}>
      <Text style={styles.subtitle}>
        {totalCount > 0
          ? `Showing ${(currentPage - 1) * 25 + 1}-${Math.min(currentPage * 25, totalCount)} of ${totalCount} transactions · ₱${totalAmount.toFixed(2)}`
          : "0 transactions · ₱0.00"}
      </Text>

      <TransactionFilterBar
        filter={filter}
        datePreset={datePreset}
        fromDate={fromDate}
        toDate={toDate}
        setFromDate={(v) => {
          setFromDate(v);
          setDatePreset("CUSTOM");
        }}
        setToDate={(v) => {
          setToDate(v);
          setDatePreset("CUSTOM");
        }}
        onFilterChange={handleFilterChange}
        onPresetChange={handlePresetChange}
        onCustomDateApply={handleCustomDateApply}
      />

      {loading ? (
        <View style={{ paddingVertical: 24, alignItems: "center" }}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={[styles.subtitle, { marginTop: 8 }]}>Loading transactions...</Text>
        </View>
      ) : (
        <>
          {items.map((transaction) => (
            <TransactionListItem
              key={transaction.transactionId}
              transaction={transaction}
              isExpanded={expanded === transaction.transactionId}
              onToggleExpand={() =>
                setExpanded(expanded === transaction.transactionId ? null : transaction.transactionId)
              }
            />
          ))}

          {!items.length ? (
            <Text style={[styles.subtitle, { textAlign: "center", marginVertical: 20 }]}>
              No transactions found.
            </Text>
          ) : null}

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 14,
              paddingTop: 10,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <Pressable
              disabled={currentPage <= 1 || loading}
              onPress={() => handlePageChange(currentPage - 1)}
              style={[
                styles.button,
                styles.secondaryButton,
                { minHeight: 36, paddingHorizontal: 14 },
                (currentPage <= 1 || loading) && { opacity: 0.4 },
              ]}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText, { fontSize: 12 }]}>Previous</Text>
            </Pressable>

            <Text style={[styles.subtitle, { fontSize: 12 }]}>
              Page {currentPage} of {totalPages}
            </Text>

            <Pressable
              disabled={currentPage >= totalPages || loading}
              onPress={() => handlePageChange(currentPage + 1)}
              style={[
                styles.button,
                styles.secondaryButton,
                { minHeight: 36, paddingHorizontal: 14 },
                (currentPage >= totalPages || loading) && { opacity: 0.4 },
              ]}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText, { fontSize: 12 }]}>Next</Text>
            </Pressable>
          </View>
        </>
      )}
    </ModalShell>
  );
}

