import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Pressable, Share, Text, View } from "react-native";
import { api } from "../../core/api/chatco-api";
import { syncPendingCashTransactions } from "../../core/api/chatco-api";
import type { Remittance, Shift, ShiftEarnings, Transaction } from "../../core/domain/types";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import { Header, ModalShell, ScreenShell } from "../../shared/ui";
import { SlideToConfirm } from "../../shared/ui/SlideToConfirm";

const money = (value: number | string | undefined) => `₱${Number(value ?? 0).toFixed(2)}`;

export function ReportScreen({ shift, refreshKey, canOperate, onEnded }: {
  shift: Shift;
  refreshKey: number;
  canOperate: boolean;
  onEnded: () => void;
}) {
  const { colors, styles } = useAppTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [earnings, setEarnings] = useState<ShiftEarnings | null>(null);
  const [history, setHistory] = useState<Remittance[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selected, setSelected] = useState<Remittance | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"ALL" | "WEEK" | "MONTH">("ALL");
  const [page, setPage] = useState(1);
  const loadInFlight = useRef<Promise<void> | null>(null);

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
    setError("");
    try {
      setHistory(await api.remittances());
    } catch {
      setHistory([]);
      setError("Remittance history is temporarily unavailable because the server returned an error.");
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
          <View style={{ backgroundColor: "rgba(52, 211, 153, 0.15)", borderColor: "rgba(52, 211, 153, 0.3)", borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: "#34D399", fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Submitted
            </Text>
          </View>
        ) : null}
      </View>

      {/* Driver and Unit Banner Card */}
      <View style={[styles.card, { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 }]}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(26, 95, 180, 0.2)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(98, 160, 234, 0.3)" }}>
          <Text style={{ color: "#62A0EA", fontSize: 18, fontWeight: "800" }}>
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

      {/* Grand Total Collections Card */}
      <View style={[styles.card, { paddingVertical: 18 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <Text style={{ fontSize: 14 }}>🧾</Text>
          <Text style={styles.label}>Total Collections</Text>
        </View>
        <Text style={{ color: "#62A0EA", fontSize: 34, fontWeight: "900", letterSpacing: -0.5, marginTop: 4 }}>
          {money(accountableTotals.all)}
        </Text>
        <Text style={[styles.subtitle, { fontSize: 11, marginTop: 4 }]}>
          {totalPassengers} passenger{totalPassengers !== 1 ? "s" : ""} · {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Payment Breakdown Card */}
      <View style={styles.card}>
        <Text style={[styles.label, { marginBottom: 12 }]}>Payment Breakdown</Text>
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#60A5FA" }} />
              <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "600" }}>GCash</Text>
              <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: "600" }}>{gcashCount}x</Text>
            </View>
            <Text style={{ color: "#60A5FA", fontSize: 14, fontWeight: "800" }}>{money(accountableTotals.gcash)}</Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#34D399" }} />
              <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "600" }}>Cash</Text>
              <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: "600" }}>{cashCount}x</Text>
            </View>
            <Text style={{ color: "#34D399", fontSize: 14, fontWeight: "800" }}>{money(accountableTotals.cash)}</Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#FBBF24" }} />
              <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "600" }}>Voucher</Text>
              <Text style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: "600" }}>{voucherCount}x</Text>
            </View>
            <Text style={{ color: "#FBBF24", fontSize: 14, fontWeight: "800" }}>{money(totals.voucher)}</Text>
          </View>

          <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginVertical: 4 }} />

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={[styles.label, { fontSize: 11 }]}>Grand Total</Text>
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "900" }}>{money(accountableTotals.all)}</Text>
          </View>
        </View>
      </View>

      {/* Collection Summary: Cash vs GCash Overview */}
      <View style={[styles.card, { backgroundColor: "rgba(26, 95, 180, 0.08)", borderColor: "rgba(26, 95, 180, 0.25)" }]}>
        <Text style={[styles.label, { color: "rgba(98, 160, 234, 0.8)", marginBottom: 10 }]}>Collection Summary</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" }}>
            <Text style={[styles.label, { color: "rgba(96, 165, 250, 0.7)", fontSize: 9 }]}>GCASH</Text>
            <Text style={{ color: "#60A5FA", fontSize: 17, fontWeight: "900", marginTop: 3 }}>
              {money(accountableTotals.gcash)}
            </Text>
          </View>
          <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" }}>
            <Text style={[styles.label, { color: "rgba(52, 211, 153, 0.7)", fontSize: 9 }]}>CASH</Text>
            <Text style={{ color: "#34D399", fontSize: 17, fontWeight: "900", marginTop: 3 }}>
              {money(accountableTotals.cash)}
            </Text>
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginVertical: 10 }} />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={[styles.label, { color: "rgba(255,255,255,0.7)" }]}>Grand Total</Text>
          <Text style={{ color: "#62A0EA", fontSize: 22, fontWeight: "900" }}>{money(accountableTotals.all)}</Text>
        </View>
      </View>

      {/* Remittance Action Section */}
      {!hasRemitted ? (
        <View style={{ marginTop: 6, gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderRadius: 12, padding: 12 }}>
            <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: "rgba(26, 95, 180, 0.2)", alignItems: "center", justifyContent: "center" }}>
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
          {!canOperate ? <Text style={styles.error}>Remittance is unavailable right now.</Text> : null}
        </View>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(52, 211, 153, 0.08)", borderColor: "rgba(52, 211, 153, 0.25)", borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 6 }}>
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(52, 211, 153, 0.2)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#34D399", fontSize: 18, fontWeight: "900" }}>✓</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#34D399", fontSize: 14, fontWeight: "800" }}>Submitted to Admin</Text>
            <Text style={[styles.subtitle, { fontSize: 11, marginTop: 2 }]}>
              GCash {money(accountableTotals.gcash)} · Cash {money(accountableTotals.cash)} · Total {money(accountableTotals.all)}
            </Text>
          </View>
        </View>
      )}

      {/* Auxiliary Actions */}
      <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => { setHistoryOpen(true); void loadHistory(); }}>
        <Text style={styles.buttonText}>Remittance history</Text>
      </Pressable>
      <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => void shareReport()}>
        <Text style={styles.buttonText}>Share current official report</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Confirmation Modal */}
      <ModalShell visible={confirm} title="Confirm remittance" onClose={() => setConfirm(false)}>
        <Text style={styles.subtitle}>
          Review these amounts carefully. Sliding submits the report and closes the active shift. Admin will count the physical cash separately.
        </Text>
        <View style={styles.card}>
          <Breakdown label="Total collected" value={accountableTotals.all} />
          <Breakdown label="Cash accountable" value={accountableTotals.cash} />
          <Breakdown label="GCash (digital)" value={accountableTotals.gcash} />
          <Breakdown label="Voucher" value={totals.voucher} />
        </View>
        <SlideToConfirm
          label="Slide to confirm remittance"
          disabled={busy}
          onComplete={() => void submit()}
        />
      </ModalShell>

      {/* Success Modal */}
      <ModalShell visible={success} title="Remittance complete" onClose={() => { setSuccess(false); onEnded(); }}>
        <Text style={[styles.title, { color: colors.success }]}>Shift successfully closed</Text>
        <Text style={styles.subtitle}>The official end-of-day report was submitted to the existing ChatCo backend.</Text>
        <View style={styles.card}>
          <Breakdown label="Grand total" value={accountableTotals.all} />
          <Breakdown label="Cash to hand over" value={accountableTotals.cash} />
          <Breakdown label="GCash (digital)" value={accountableTotals.gcash} />
        </View>
        <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => void shareReport()}>
          <Text style={styles.buttonText}>Share report copy</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={() => { setSuccess(false); onEnded(); }}>
          <Text style={styles.buttonText}>Return to unit verification</Text>
        </Pressable>
      </ModalShell>

      {/* History Modal */}
      <ModalShell visible={historyOpen} title="Remittance history" onClose={() => setHistoryOpen(false)}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["ALL", "WEEK", "MONTH"] as const).map(value => (
            <Pressable
              key={value}
              onPress={() => { setFilter(value); setPage(1); }}
              style={[styles.button, styles.secondaryButton, {
                flex: 1,
                minHeight: 38,
                paddingHorizontal: 5,
                backgroundColor: filter === value ? colors.primary : colors.surface2,
              }]}
            >
              <Text style={[styles.buttonText, { fontSize: 11 }]}>{value === "ALL" ? "All" : value === "WEEK" ? "This Week" : "This Month"}</Text>
            </Pressable>
          ))}
        </View>
        {visibleHistory.map((item, index) => (
          <Pressable key={item.id ?? `${item.shift_id}-${index}`} style={styles.card} onPress={() => setSelected(item)}>
            <Text style={styles.cardTitle}>{item.date ?? item.remitted_at ?? "Previous shift"}</Text>
            <Text style={styles.subtitle}>
              {money(item.cash_total)} cash · {money(item.gcash_total)} GCash
            </Text>
            <Text style={[styles.label, { marginTop: 10 }]}>{item.remittance_status ?? item.status ?? "Submitted"} · View official report</Text>
          </Pressable>
        ))}
        {!visibleHistory.length ? <Text style={styles.subtitle}>No remittance reports match this filter.</Text> : null}
        {filtered.length > pageSize ? (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
            <Pressable disabled={page === 1} onPress={() => setPage(value => value - 1)}><Text style={styles.cardTitle}>Previous</Text></Pressable>
            <Text style={styles.subtitle}>Page {page} of {pages}</Text>
            <Pressable disabled={page === pages} onPress={() => setPage(value => value + 1)}><Text style={styles.cardTitle}>Next</Text></Pressable>
          </View>
        ) : null}
      </ModalShell>

      {/* Official Report Slip Modal */}
      <ModalShell visible={selected !== null} title="Official remittance report" onClose={() => setSelected(null)}>
        {selected ? (
          <>
            <View style={{ alignItems: "center", marginVertical: 8 }}>
              <Text style={[styles.title, { fontSize: 20, letterSpacing: 1 }]}>CHATCO</Text>
              <Text style={[styles.label, { fontSize: 9, letterSpacing: 1.5, marginTop: 2 }]}>
                End of Day Remittance Report
              </Text>
            </View>
            <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginBottom: 12 }} />
            <View style={styles.card}>
              <ReportLine label="Date" value={selected.date ?? selected.remitted_at ?? "—"} />
              <ReportLine label="Shift ID" value={selected.shift_id ?? "—"} />
              <ReportLine label="Conductor" value={selected.conductor_name ?? shift.conductorName} />
              <ReportLine label="Driver" value={selected.driver_name ?? shift.driverName} />
              <ReportLine label="Unit Number" value={selected.unit_number ?? shift.unitNumber} />
              <ReportLine label="Passengers" value={Number(selected.total_passengers ?? 0)} />
              <ReportLine label="Cash Accountable" value={money(selected.cash_total)} />
              <ReportLine label="GCash (Digital)" value={money(selected.gcash_total)} />
              <ReportLine label="Voucher" value={money(selected.voucher_total)} />
              <ReportLine label="Total Cashless" value={money(selected.total_cashless)} />
              <ReportLine label="Grand Total" value={money(selected.declared_amount ?? selected.total_collected)} />
              <ReportLine label="Status" value={selected.remittance_status ?? selected.status ?? "Submitted"} />
            </View>
            <Pressable style={styles.button} onPress={() => void shareReport(selected)}>
              <Text style={styles.buttonText}>Share official report</Text>
            </Pressable>
          </>
        ) : null}
      </ModalShell>
    </ScreenShell>
  );
}

function Breakdown({ label, value }: { label: string; value: number }) {
  const { styles } = useAppTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
      <Text style={styles.subtitle}>{label}</Text>
      <Text style={styles.cardTitle}>{money(value)}</Text>
    </View>
  );
}

function ReportLine({ label, value }: { label: string; value: string | number }) {
  const { styles } = useAppTheme();
  return (
    <View style={{ marginBottom: 13 }}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.cardTitle}>{String(value)}</Text>
    </View>
  );
}

function officialReportText(item: Remittance, shift: Shift) {
  return [
    "CHATCO OFFICIAL REMITTANCE REPORT",
    `Report ID: ${item.id ?? "—"}`,
    `Shift ID: ${item.shift_id ?? "—"}`,
    `Unit: ${item.unit_number ?? shift.unitNumber}`,
    `Conductor: ${item.conductor_name ?? shift.conductorName}`,
    `Driver: ${item.driver_name ?? shift.driverName}`,
    `Cash: ${money(item.cash_total)}`,
    `GCash: ${money(item.gcash_total)}`,
    `Voucher: ${money(item.voucher_total)}`,
    `Cash to hand over: ${money(item.cash_total)}`,
    `Status: ${item.remittance_status ?? item.status ?? "Submitted"}`,
  ].join("\n");
}
