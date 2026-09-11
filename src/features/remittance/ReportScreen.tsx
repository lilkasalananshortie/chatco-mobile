import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Pressable, Share, Text, View } from "react-native";
import { api } from "../../core/api/chatco-api";
import { syncPendingCashTransactions } from "../../core/api/chatco-api";
import type { Remittance, Shift, ShiftEarnings, Transaction } from "../../core/domain/types";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import { Header, ScreenShell } from "../../shared/ui";
import { loadTripCycleState, type TripCycleState } from "../../core/utils/trip-cycle-tracker";
import { money, officialReportText } from "./remittance-helpers";
import { RemittanceConfirmModal } from "./components/RemittanceConfirmModal";
import { RemittanceSuccessModal } from "./components/RemittanceSuccessModal";
import { RemittanceHistoryModal } from "./components/RemittanceHistoryModal";
import { RemittanceReportSlipModal } from "./components/RemittanceReportSlipModal";
import { RemittanceCollectionsCard } from "./components/RemittanceCollectionsCard";

export function ReportScreen({ shift, refreshKey, canOperate, onEnded }: {
  shift: Shift;
  refreshKey: number;
  canOperate: boolean;
  onEnded: () => void;
}) {
  const { colors, isLofi, styles } = useAppTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [earnings, setEarnings] = useState<ShiftEarnings | null>(null);
  const [history, setHistory] = useState<Remittance[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selected, setSelected] = useState<Remittance | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [filter, setFilter] = useState<"ALL" | "WEEK" | "MONTH">("ALL");
  const [page, setPage] = useState(1);
  const [tripCycle, setTripCycle] = useState<TripCycleState | null>(null);
  const loadInFlight = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (shift.shiftId) {
      void loadTripCycleState(shift.shiftId, shift.timeIn).then(setTripCycle);
    }
  }, [shift.shiftId, shift.timeIn]);

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
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Unable to load the report.");
      } finally {
        loadInFlight.current = null;
      }
    })();
    loadInFlight.current = request;
    return request;
  }, [shift.shiftId]);

  const loadHistory = async () => {
    setHistoryError("");
    try {
      setHistory(await api.remittances());
    } catch {
      setHistory([]);
      setHistoryError("Remittance history is temporarily unavailable because the server returned an error.");
    }
  };

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 15000);
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") void load();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [load, refreshKey]);

  const totals = useMemo(() => transactions.reduce((sum, transaction) => {
    if (transaction.paymentMethod === "Cash") sum.cash += transaction.finalAmount;
    if (transaction.paymentMethod === "GCash") sum.gcash += transaction.finalAmount;
    if (transaction.paymentMethod === "Voucher") sum.voucher += transaction.finalAmount;
    sum.all += transaction.finalAmount;
    return sum;
  }, { cash: 0, gcash: 0, voucher: 0, all: 0 }), [transactions]);
  const accountableTotals = earnings
    ? {
        ...totals,
        cash: earnings.cashTotal,
        gcash: earnings.gcashTotal,
        all: earnings.total,
      }
    : totals;

  const filtered = useMemo(() => history.filter(item => {
    if (filter === "ALL") return true;
    const rawDate = item.remitted_at ?? item.date;
    if (!rawDate) return false;
    const value = new Date(rawDate).getTime();
    if (!Number.isFinite(value)) return false;
    const age = Date.now() - value;
    return age <= (filter === "WEEK" ? 7 : 31) * 24 * 60 * 60 * 1000;
  }), [filter, history]);
  const pageSize = 5;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visibleHistory = filtered.slice((page - 1) * pageSize, page * pageSize);

  const submit = async () => {
    if (!canOperate) {
      setError("This shift is active on another device. Complete the handoff before remitting here.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      // A local offline cash receipt is not part of the server's authoritative
      // earnings yet. Flush it before remittance and block if it remains
      // queued, so the official report cannot omit collected cash.
      await syncPendingCashTransactions();
      const pendingForShift = await api.pendingCashCount(shift.shiftId);
      if (pendingForShift > 0) {
        throw new Error(
          "Some cash transactions are still waiting to sync. Reconnect to the internet and try again before submitting remittance.",
        );
      }

      await api.remit(shift, accountableTotals.cash, accountableTotals.gcash);
      setConfirm(false);
      setSuccess(true);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to submit the remittance.");
    } finally {
      setBusy(false);
    }
  };

  const shareReport = async (item: Remittance | null = null) => {
    const body = item
      ? officialReportText(item, shift)
      : [
          "CHATCO OFFICIAL SHIFT REPORT",
          `Unit: ${shift.unitNumber}`,
          `Conductor: ${shift.conductorName}`,
          `Driver: ${shift.driverName}`,
          `Transactions: ${transactions.length}`,
          `Cash: ${money(accountableTotals.cash)}`,
          `GCash: ${money(accountableTotals.gcash)}`,
          `Voucher: ${money(totals.voucher)}`,
          `Grand total: ${money(accountableTotals.all)}`,
        ].join("\n");
    await Share.share({ title: "ChatCo Official Report", message: body });
  };

  const totalPassengers = useMemo(() => {
    return transactions.reduce((sum, t) => sum + (t.totalPassengers ?? 1), 0);
  }, [transactions]);

  const cashCount = useMemo(() => transactions.filter(t => t.paymentMethod === "Cash").length, [transactions]);
  const gcashCount = useMemo(() => transactions.filter(t => t.paymentMethod === "GCash").length, [transactions]);
  const voucherCount = useMemo(() => transactions.filter(t => t.paymentMethod === "Voucher").length, [transactions]);

  const hasRemitted = success;

  return (
    <ScreenShell>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <Header
          eyebrow="Shift Settlement"
          title="End of Day Report"
          subtitle={`Unit ${shift.unitNumber} · ${transactions.length} passenger transactions`}
        />
        {hasRemitted ? (
          <View style={{ backgroundColor: isLofi ? "rgba(22, 112, 90, 0.12)" : "rgba(52, 211, 153, 0.15)", borderColor: isLofi ? colors.success : "rgba(52, 211, 153, 0.3)", borderWidth: isLofi ? 1.5 : 1, borderRadius: isLofi ? 3 : 999, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: colors.success, fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Submitted
            </Text>
          </View>
        ) : null}
      </View>

      {/* Driver and Unit Banner Card */}
      <View style={[styles.card, { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 }]}>
        <View style={{ width: 44, height: 44, borderRadius: isLofi ? 4 : 22, backgroundColor: isLofi ? colors.surface2 : "rgba(26, 95, 180, 0.2)", alignItems: "center", justifyContent: "center", borderWidth: isLofi ? 1.5 : 1, borderColor: colors.border }}>
          <Text style={{ color: colors.primary, fontSize: 18, fontWeight: "800" }}>
            {(shift.driverName || "D")[0]?.toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { fontSize: 15 }]}>{shift.driverName}</Text>
          <Text style={[styles.subtitle, { fontSize: 12, marginTop: 2 }]}>
            Unit {shift.unitNumber} · {shift.route || "Regular Route"}
          </Text>
        </View>
      </View>

      {/* Total Collections & Payment Breakdown Cards */}
      <RemittanceCollectionsCard
        totalAmount={accountableTotals.all}
        totalPassengers={totalPassengers}
        transactionCount={transactions.length}
        tripCycle={tripCycle}
        accountableTotals={accountableTotals}
        voucherTotal={totals.voucher}
        cashCount={cashCount}
        gcashCount={gcashCount}
        voucherCount={voucherCount}
      />

      {/* Collection Summary: Cash vs GCash Overview */}
      <View style={[styles.card, { backgroundColor: isLofi ? colors.surface : "rgba(26, 95, 180, 0.08)", borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.primary, marginBottom: 10 }]}>Collection Summary</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1, backgroundColor: colors.surface2, borderRadius: isLofi ? 3 : 12, padding: 12, borderWidth: isLofi ? 1.5 : 1, borderColor: colors.border }}>
            <Text style={[styles.label, { color: colors.primary, fontSize: 9 }]}>GCASH</Text>
            <Text style={{ color: colors.primary, fontSize: 17, fontWeight: "900", marginTop: 3 }}>
              {money(accountableTotals.gcash)}
            </Text>
          </View>
          <View style={{ flex: 1, backgroundColor: colors.surface2, borderRadius: isLofi ? 3 : 12, padding: 12, borderWidth: isLofi ? 1.5 : 1, borderColor: colors.border }}>
            <Text style={[styles.label, { color: colors.success, fontSize: 9 }]}>CASH</Text>
            <Text style={{ color: colors.success, fontSize: 17, fontWeight: "900", marginTop: 3 }}>
              {money(accountableTotals.cash)}
            </Text>
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 10 }} />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={[styles.label, { color: colors.muted }]}>Grand Total</Text>
          <Text style={{ color: colors.primary, fontSize: 22, fontWeight: "900" }}>{money(accountableTotals.all)}</Text>
        </View>
      </View>

      {/* Remittance Action Section */}
      {!hasRemitted ? (
        <View style={{ marginTop: 6, gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surface2, borderColor: colors.border, borderWidth: isLofi ? 1.5 : 1, borderRadius: isLofi ? 4 : 12, padding: 12 }}>
            <View style={{ width: 34, height: 34, borderRadius: isLofi ? 3 : 8, backgroundColor: isLofi ? colors.surface : "rgba(26, 95, 180, 0.2)", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 16 }}>🏛</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: "700" }}>Remittance to Admin</Text>
              <Text style={{ color: colors.muted, fontSize: 10, marginTop: 2 }}>
                All recorded transactions will be submitted to admin.
              </Text>
            </View>
          </View>

          <Pressable
            disabled={!canOperate}
            style={[styles.button, !canOperate && { opacity: 0.45 }]}
            onPress={() => setConfirm(true)}
          >
            <Text style={styles.buttonText}>Remit to Admin and end shift</Text>
          </Pressable>
          {!canOperate ? <Text style={styles.error}>This shift is active on another device. Complete handoff to remit.</Text> : null}
        </View>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: isLofi ? "rgba(22, 112, 90, 0.12)" : "rgba(52, 211, 153, 0.08)", borderColor: isLofi ? colors.success : "rgba(52, 211, 153, 0.25)", borderWidth: isLofi ? 1.5 : 1, borderRadius: isLofi ? 4 : 16, padding: 14, marginTop: 6 }}>
          <View style={{ width: 38, height: 38, borderRadius: isLofi ? 4 : 19, backgroundColor: isLofi ? colors.surface2 : "rgba(52, 211, 153, 0.2)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: colors.success, fontSize: 18, fontWeight: "900" }}>✓</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.success, fontSize: 14, fontWeight: "800" }}>Submitted to Admin</Text>
            <Text style={[styles.subtitle, { fontSize: 11, marginTop: 2 }]}>
              GCash {money(accountableTotals.gcash)} · Cash {money(accountableTotals.cash)} · Total {money(accountableTotals.all)}
            </Text>
          </View>
        </View>
      )}

      {/* Auxiliary Actions */}
      <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => { setHistoryOpen(true); void loadHistory(); }}>
        <Text style={[styles.buttonText, styles.secondaryButtonText]}>Remittance history</Text>
      </Pressable>
      <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => void shareReport()}>
        <Text style={[styles.buttonText, styles.secondaryButtonText]}>Share current official report</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Confirmation Modal */}
      <RemittanceConfirmModal
        visible={confirm}
        onClose={() => setConfirm(false)}
        busy={busy}
        accountableTotals={{ ...accountableTotals, voucher: totals.voucher }}
        onConfirm={() => void submit()}
      />

      {/* Success Modal */}
      <RemittanceSuccessModal
        visible={success}
        onClose={() => {
          setSuccess(false);
          onEnded();
        }}
        accountableTotals={accountableTotals}
        onShareReport={() => void shareReport()}
        onReturn={() => {
          setSuccess(false);
          onEnded();
        }}
      />

      {/* History Modal */}
      <RemittanceHistoryModal
        visible={historyOpen}
        onClose={() => setHistoryOpen(false)}
        historyError={historyError}
        filter={filter}
        setFilter={setFilter}
        page={page}
        setPage={setPage}
        totalPages={pages}
        totalFiltered={filtered.length}
        pageSize={pageSize}
        visibleHistory={visibleHistory}
        onSelect={setSelected}
      />

      {/* Official Report Slip Modal */}
      <RemittanceReportSlipModal
        selected={selected}
        onClose={() => setSelected(null)}
        shift={shift}
        onShare={(item) => void shareReport(item)}
      />
    </ScreenShell>
  );
}
