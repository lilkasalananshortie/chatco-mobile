import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AppState, Platform, Pressable, Share, View } from "react-native";
import { Text } from "../../shared/ui/BrandText";
import { ConductorIcon } from "../../shared/ui/ConductorIcon";
import { Ionicons } from "@expo/vector-icons";
import { api, syncPendingCashTransactions } from "../../core/api/chatco-api";
import type { Remittance, Shift, ShiftEarnings, Transaction } from "../../core/domain/types";
import { useReportTheme } from "./report-styles";
import { ReportPage } from "./ReportPage";
import { thermalPrinter } from "../../core/utils/thermal-printer";
import { money, officialReportText } from "./remittance-helpers";
import { RemittanceConfirmModal } from "./components/RemittanceConfirmModal";
import { RemittanceSuccessModal } from "./components/RemittanceSuccessModal";
import { RemittanceReportSlipModal } from "./components/RemittanceReportSlipModal";
import { RemittanceCollectionsCard } from "./components/RemittanceCollectionsCard";
import { RemittanceHistorySection, type RemittanceHistoryFilter } from "./components/RemittanceHistorySection";
import { transactionSummary } from "../../core/domain/transaction-summary";

type ReportLoadState = "loading" | "success" | "error";

export function ReportScreen({ shift, refreshKey, canOperate, onEnded, onBack }: {
  shift: Shift;
  refreshKey: number;
  canOperate: boolean;
  onEnded: () => void;
  onBack?: () => void;
}) {
  const { colors, isLofi, styles } = useReportTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [earnings, setEarnings] = useState<ShiftEarnings | null>(null);
  const [reportState, setReportState] = useState<ReportLoadState>("loading");
  const [history, setHistory] = useState<Remittance[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<RemittanceHistoryFilter>("week");
  const [historyDateFrom, setHistoryDateFrom] = useState("");
  const [historyDateTo, setHistoryDateTo] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [confirm, setConfirm] = useState(false);
  const [selected, setSelected] = useState<Remittance | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submittedTotals, setSubmittedTotals] = useState<{ cash: number; gcash: number; all: number } | null>(null);
  const loadInFlight = useRef<Promise<void> | null>(null);
  const endedRef = useRef(false);
  const onEndedRef = useRef(onEnded);

  useEffect(() => { onEndedRef.current = onEnded; }, [onEnded]);

  const load = useCallback(async () => {
    if (loadInFlight.current) return loadInFlight.current;
    const request = (async () => {
      try {
        const [current, authoritativeEarnings] = await Promise.all([
          api.transactions(shift.shiftId),
          api.earnings(shift.shiftId),
        ]);
        setTransactions(current);
        setEarnings(authoritativeEarnings);
        setError("");
        setReportState("success");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to load the report.");
        setReportState("error");
      } finally {
        loadInFlight.current = null;
      }
    })();
    loadInFlight.current = request;
    return request;
  }, [shift.shiftId]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const first = await api.remittancesPage(1, "ALL", 100);
      const all = [...first.items];
      for (let page = 2; page <= first.lastPage; page += 1) {
        const next = await api.remittancesPage(page, "ALL", 100);
        all.push(...next.items);
      }
      setHistory(all);
      setHistoryLoaded(true);
    } catch (cause) {
      setHistoryError(cause instanceof Error ? cause.message : "Remittance history is unavailable.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 20000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void load();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [load, refreshKey]);

  useEffect(() => {
    if (!historyLoaded && !historyLoading && !historyError) void loadHistory();
  }, [historyLoaded, historyLoading, historyError, loadHistory]);

  useEffect(() => {
    if (!success) return;
    endedRef.current = false;
    const timer = setTimeout(() => {
      if (endedRef.current) return;
      endedRef.current = true;
      void onEndedRef.current();
    }, 3000);
    return () => clearTimeout(timer);
  }, [success]);

  const totals = useMemo(() => {
    const summary = transactionSummary(transactions);
    return { ...summary, all: summary.total };
  }, [transactions]);
  const accountableTotals = earnings
    ? { ...totals, cash: earnings.cashTotal, gcash: earnings.gcashTotal, all: earnings.total }
    : totals;

  const totalPassengers = useMemo(
    () => transactions.reduce((sum, transaction) => sum + (transaction.totalPassengers ?? 1), 0),
    [transactions],
  );
  const cashCount = useMemo(() => transactions.filter((transaction) => transaction.paymentMethod === "Cash").length, [transactions]);
  const voucherCount = useMemo(() => transactions.filter((transaction) => transaction.paymentMethod === "Voucher").length, [transactions]);

  const canRemit = transactions.length > 0;

  const handlePressRemit = async () => {
    if (!canOperate) {
      setError("This shift is active on another device. Complete the handoff before remitting here.");
      return;
    }
    setError("");
    try {
      await syncPendingCashTransactions();
      const pending = await api.pendingCashCount(shift.shiftId);
      if (pending > 0) {
        setError("Some cash transactions are still waiting to sync. Reconnect to the internet and try again before submitting remittance.");
        return;
      }
      setConfirm(true);
    } catch {
      setError("Some cash transactions are still waiting to sync. Reconnect to the internet and try again before submitting remittance.");
    }
  };

  const submit = async () => {
    if (!canOperate) {
      setError("This shift is active on another device. Complete the handoff before remitting here.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await syncPendingCashTransactions();
      const pendingForShift = await api.pendingCashCount(shift.shiftId);
      if (pendingForShift > 0) {
        throw new Error("Some cash transactions are still waiting to sync. Reconnect to the internet and try again before submitting remittance.");
      }
      await api.remit(shift, accountableTotals.cash, accountableTotals.gcash);
      setSubmittedTotals({ cash: accountableTotals.cash, gcash: accountableTotals.gcash, all: accountableTotals.all });
      setConfirm(false);
      setSuccess(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to submit the remittance.");
    } finally {
      setBusy(false);
    }
  };

  const printReport = async (record: Remittance) => {
    const body = officialReportText(record, shift);
    if (Platform.OS === "ios") {
      await Share.share({ title: "CHATCO Official Report", message: body });
      return;
    }
    const result = await thermalPrinter.printReportText(body);
    if (!result.success) Alert.alert("Unable to print report", result.error || "Check the paired printer and try again.");
  };

  const exitAfterRemittance = () => {
    if (endedRef.current) return;
    endedRef.current = true;
    setSuccess(false);
    void onEndedRef.current();
  };

  if (reportState === "loading") {
    return (
      <ReportPage onBack={onBack}>
        {[80, 112, 192, 128, 56].map((height, index) => (
          <View key={index} style={[styles.card, { height, marginTop: index === 0 ? 4 : 12, opacity: 0.55 }]} />
        ))}
      </ReportPage>
    );
  }

  if (reportState === "error") {
    return (
      <ReportPage onBack={onBack}>
        <Pressable accessibilityRole="button" onPress={() => { setReportState("loading"); void load(); }} style={[styles.card, { paddingVertical: 32, alignItems: "center" }]}>
          <Text style={styles.error}>{error}</Text>
          <Text style={[styles.subtitle, { marginTop: 8 }]}>Tap to retry.</Text>
        </Pressable>
      </ReportPage>
    );
  }

  return (
    <ReportPage onBack={onBack}>

      <View style={[styles.card, { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 }]}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isLofi ? colors.surface2 : "rgba(26,95,180,0.15)", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.primary, fontSize: 14, fontWeight: "800" }}>{(shift.driverName || "D")[0]?.toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: "700" }}>{shift.driverName}</Text>
          <Text style={{ color: colors.muted, fontSize: 11, lineHeight: 16, fontWeight: "500" }}>{shift.unitNumber} · {shift.route || "—"}</Text>
        </View>
      </View>

      <RemittanceCollectionsCard
        totalAmount={accountableTotals.all}
        totalPassengers={totalPassengers}
        transactionCount={transactions.length}
        transactions={transactions}
        accountableTotals={accountableTotals}
        voucherTotal={totals.voucher}
        cashCount={cashCount}
        voucherCount={voucherCount}
      />

      <View style={[styles.card, { backgroundColor: isLofi ? colors.surface : "rgba(26,95,180,0.08)", borderColor: isLofi ? colors.border : "rgba(26,95,180,0.2)", gap: 12 }]}>
        <Text style={[styles.label, { color: isLofi ? "#4B5563" : "rgba(98,160,234,0.6)" }]}>Collection Summary</Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          {[
            { label: "GCash", amount: accountableTotals.gcash, color: isLofi ? colors.text : "#60A5FA" },
            { label: "Cash", amount: accountableTotals.cash, color: colors.success },
          ].map((item) => (
            <View key={item.label} style={{ flex: 1, backgroundColor: colors.surface2, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: isLofi ? colors.border : "rgba(255,255,255,0.05)" }}>
              <Text style={[styles.label, { color: isLofi ? "#4B5563" : item.label === "GCash" ? "rgba(96,165,250,0.6)" : "rgba(52,211,153,0.6)", fontWeight: "600" }]}>{item.label}</Text>
              <Text style={{ color: item.color, fontSize: 18, lineHeight: 28, fontWeight: "800", marginTop: 2 }}>{money(item.amount)}</Text>
            </View>
          ))}
        </View>
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={[styles.label, { color: colors.secondary, fontSize: 12, lineHeight: 16 }]}>Grand Total</Text>
          <Text style={{ color: colors.primary, fontSize: 24, lineHeight: 32, fontWeight: "800" }}>{money(accountableTotals.all)}</Text>
        </View>
      </View>

      <View style={{ gap: 12 }}>
        <View style={[styles.card, { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, backgroundColor: isLofi ? "#F9FAFB" : "rgba(255,255,255,0.03)" }]}>
          <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: isLofi ? "#F3F4F6" : "rgba(26,95,180,0.15)", alignItems: "center", justifyContent: "center" }}>
            <ConductorIcon name="globe" size={16} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.secondary, fontSize: 12, lineHeight: 16, fontWeight: "600" }}>Remittance to Admin</Text>
            <Text style={{ color: isLofi ? "#6B7280" : "rgba(255,255,255,0.3)", fontSize: 10, lineHeight: 15, marginTop: 2 }}>All recorded transactions will be submitted to admin</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={!canOperate || !canRemit}
          onPress={() => void handlePressRemit()}
          style={[styles.button, (!canOperate || !canRemit) && { backgroundColor: isLofi ? colors.surface2 : "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: colors.border }]}
        >
          <Text style={[styles.buttonText, (!canOperate || !canRemit) && { color: colors.muted }]}>
            {!canRemit ? "No pending remittance" : canOperate ? "Remit to Admin" : "Complete shift handoff to remit"}
          </Text>
        </Pressable>
        {!canOperate ? <Text style={styles.error}>This shift is active on another device. Complete handoff to remit.</Text> : null}
      </View>

      <RemittanceHistorySection
        history={history}
        expanded={historyExpanded}
        onToggle={() => setHistoryExpanded((value) => !value)}
        loading={historyLoading}
        error={historyError}
        onRetry={() => void loadHistory()}
        filter={historyFilter}
        onFilterChange={(value) => { setHistoryFilter(value); setHistoryPage(1); }}
        dateFrom={historyDateFrom}
        onDateFromChange={setHistoryDateFrom}
        dateTo={historyDateTo}
        onDateToChange={setHistoryDateTo}
        page={historyPage}
        onPageChange={setHistoryPage}
        onView={setSelected}
        onPrint={(record) => void printReport(record)}
      />

      {error ? <Text style={[styles.error, { marginTop: 12 }]}>{error}</Text> : null}

      <RemittanceConfirmModal
        visible={confirm}
        onClose={() => setConfirm(false)}
        busy={busy}
        shiftInfo={{ driverName: shift.driverName, unitNumber: shift.unitNumber }}
        totalPassengers={totalPassengers}
        accountableTotals={accountableTotals}
        onConfirm={() => void submit()}
      />

      <RemittanceSuccessModal
        visible={success}
        accountableTotals={submittedTotals ?? accountableTotals}
        unitNumber={shift.unitNumber}
        onClose={exitAfterRemittance}
      />

      <RemittanceReportSlipModal selected={selected} onClose={() => setSelected(null)} shift={shift} />
    </ReportPage>
  );
}
