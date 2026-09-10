import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { api } from "../../core/api/chatco-api";
import type { Transaction } from "../../core/domain/types";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import { ModalShell } from "../../shared/ui";

type Filter = "ALL" | "Cash" | "GCash" | "Voucher";
type DatePreset = "TODAY" | "LAST_7_DAYS" | "THIS_MONTH" | "ALL" | "CUSTOM";

function formatInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPresetRange(preset: DatePreset): { from: string; to: string } {
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
        setItems([]);
        setCurrentPage(1);
        setTotalPages(1);
        setTotalCount(0);
        setTotalAmount(0);
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

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 }}>
        {(["ALL", "Cash", "GCash", "Voucher"] as Filter[]).map((value) => (
          <Pressable
            key={value}
            onPress={() => handleFilterChange(value)}
            style={[
              styles.button,
              styles.secondaryButton,
              filter === value && { backgroundColor: colors.primary },
            ]}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText, filter === value && { color: "#fff" }]}>
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
            onPress={() => handlePresetChange(preset)}
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
          onChangeText={(v) => {
            setFromDate(v);
            setDatePreset("CUSTOM");
          }}
          style={[styles.input, { flex: 1, fontSize: 12, minHeight: 40 }]}
          placeholder="From YYYY-MM-DD"
          placeholderTextColor={colors.muted}
        />
        <TextInput
          value={toDate}
          onChangeText={(v) => {
            setToDate(v);
            setDatePreset("CUSTOM");
          }}
          style={[styles.input, { flex: 1, fontSize: 12, minHeight: 40 }]}
          placeholder="To YYYY-MM-DD"
          placeholderTextColor={colors.muted}
        />
        <Pressable
          onPress={handleCustomDateApply}
          style={[styles.button, { minHeight: 40, paddingHorizontal: 12 }]}
        >
          <Text style={[styles.buttonText, { fontSize: 12 }]}>Go</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={{ paddingVertical: 24, alignItems: "center" }}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={[styles.subtitle, { marginTop: 8 }]}>Loading transactions...</Text>
        </View>
      ) : (
        <>
          {items.map((transaction) => (
            <Pressable
              key={transaction.transactionId}
              style={styles.card}
              onPress={() =>
                setExpanded(expanded === transaction.transactionId ? null : transaction.transactionId)
              }
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
                    {transaction.from} → {transaction.to}
                  </Text>
                  <Text style={styles.subtitle}>
                    {new Date(transaction.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ·{" "}
                    {transaction.paymentMethod} · {transaction.status || "PAID"}
                  </Text>
                </View>
                <Text style={[styles.cardTitle, { color: colors.primary }]}>
                  ₱{transaction.finalAmount.toFixed(2)}
                </Text>
              </View>

              {expanded === transaction.transactionId ? (
                <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }}>
                  <Detail label="Transaction ID" value={transaction.transactionId} />
                  <Detail label="Status" value={transaction.status || "PAID"} />
                  <Detail
                    label="Paid at"
                    value={
                      transaction.paidAt
                        ? new Date(transaction.paidAt).toLocaleString()
                        : new Date(transaction.timestamp).toLocaleString()
                    }
                  />
                  <Detail label="Passenger" value={transaction.passengerName || "Walk-in"} />
                  <Detail label="Passenger ID" value={transaction.passengerId || "—"} />
                  <Detail label="Role" value={transaction.passengerRole || "—"} />
                  <Detail label="Distance" value={`${transaction.distance ?? 0} route points`} />
                  <Detail label="Base fare" value={`₱${(transaction.baseFare ?? 0).toFixed(2)}`} />
                  <Detail label="Succeeding distance" value={String(transaction.succeedingKm ?? 0)} />
                  <Detail label="Discount" value={`₱${(transaction.discountAmount ?? 0).toFixed(2)}`} />
                  {transaction.voucherCode ? (
                    <Detail label="Voucher" value={transaction.voucherCode} />
                  ) : null}
                  <Detail label="Conductor" value={transaction.conductorName || "—"} />
                  <Detail label="Driver" value={transaction.driverName || "—"} />
                  <Detail label="Unit" value={transaction.unitNumber || "—"} />
                </View>
              ) : null}
            </Pressable>
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

  function Detail({ label, value }: { label: string; value: string }) {
    return (
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, marginVertical: 3 }}>
        <Text style={styles.subtitle}>{label}</Text>
        <Text style={[styles.cardTitle, { flex: 1, textAlign: "right", fontSize: 12 }]}>{value}</Text>
      </View>
    );
  }
}
