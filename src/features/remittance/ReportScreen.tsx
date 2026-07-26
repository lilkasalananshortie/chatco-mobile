import { useEffect, useMemo, useState } from "react";
import { Pressable, Share, Text, TextInput, View } from "react-native";
import { api } from "../../core/api/chatco-api";
import type { Remittance, Shift, ShiftEarnings, Transaction } from "../../core/domain/types";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import { Header, ModalShell, ScreenShell } from "../../shared/ui";

const money = (value: number | string | undefined) => `₱${Number(value ?? 0).toFixed(2)}`;

export function ReportScreen({ shift, refreshKey, onEnded }: {
  shift: Shift;
  refreshKey: number;
  onEnded: () => void;
}) {
  const { colors, styles } = useAppTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [earnings, setEarnings] = useState<ShiftEarnings | null>(null);
  const [history, setHistory] = useState<Remittance[]>([]);
  const [declared, setDeclared] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selected, setSelected] = useState<Remittance | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"ALL" | "WEEK" | "MONTH">("ALL");
  const [page, setPage] = useState(1);

  const load = async () => {
    try {
      const [current, authoritativeEarnings] = await Promise.all([
        api.transactions(shift.shiftId),
        api.earnings(shift.shiftId),
      ]);
      setTransactions(current);
      setEarnings(authoritativeEarnings);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load the report.");
    }
  };

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
  }, [shift.shiftId, refreshKey]);

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

  const declaredCash = declared.trim() === "" ? accountableTotals.cash : Number(declared);
  const variance = Number.isFinite(declaredCash) ? declaredCash - accountableTotals.cash : 0;

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
    if (!Number.isFinite(declaredCash) || declaredCash < 0) {
      setError("Enter a valid amount of cash physically counted.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.remit(shift, accountableTotals.cash, accountableTotals.gcash, declaredCash);
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

  return (
    <ScreenShell>
      <Header
        eyebrow="Shift settlement"
        title="End-of-day report"
        subtitle={`Unit ${shift.unitNumber} · ${transactions.length} passenger transactions`}
      />

      <View style={styles.card}>
        <Text style={styles.label}>Grand total collected</Text>
        <Text style={[styles.title, { marginTop: 6 }]}>{money(accountableTotals.all)}</Text>
        <Breakdown label="Cash" value={accountableTotals.cash} />
        <Breakdown label="GCash" value={accountableTotals.gcash} />
        <Breakdown label="Voucher" value={totals.voucher} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cash declaration</Text>
        <Text style={styles.subtitle}>Count the physical cash in your possession before remitting.</Text>
        <TextInput
          value={declared}
          onChangeText={setDeclared}
          keyboardType="decimal-pad"
          style={styles.input}
          placeholder={accountableTotals.cash.toFixed(2)}
          placeholderTextColor={colors.muted}
        />
        <View style={{ marginTop: 12 }}>
          <Breakdown label="Expected cash" value={accountableTotals.cash} />
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
            <Text style={styles.subtitle}>{variance === 0 ? "Balanced" : variance > 0 ? "Overage" : "Shortage"}</Text>
            <Text style={[styles.cardTitle, { color: variance === 0 ? colors.success : colors.warning }]}>
              {variance > 0 ? "+" : ""}{money(variance)}
            </Text>
          </View>
        </View>
      </View>

      <Pressable style={styles.button} onPress={() => setConfirm(true)}>
        <Text style={styles.buttonText}>Remit to Admin and end shift</Text>
      </Pressable>
      <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => { setHistoryOpen(true); void loadHistory(); }}>
        <Text style={styles.buttonText}>Remittance history</Text>
      </Pressable>
      <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => void shareReport()}>
        <Text style={styles.buttonText}>Share current official report</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ModalShell visible={confirm} title="Confirm remittance" onClose={() => setConfirm(false)}>
        <Text style={styles.subtitle}>Review these amounts carefully. Confirming submits the official report and closes the active shift.</Text>
        <View style={styles.card}>
          <Breakdown label="Total collected" value={accountableTotals.all} />
          <Breakdown label="Cash accountable" value={accountableTotals.cash} />
          <Breakdown label="Cash declared" value={declaredCash} />
          <Breakdown label={variance < 0 ? "Shortage" : "Overage"} value={Math.abs(variance)} />
        </View>
        {variance !== 0 ? (
          <Text style={[styles.subtitle, { color: colors.warning }]}>
            This report contains a cash {variance < 0 ? "shortage" : "overage"} and will be visible to the administrator.
          </Text>
        ) : null}
        <Pressable disabled={busy} style={styles.button} onPress={() => void submit()}>
          <Text style={styles.buttonText}>{busy ? "Submitting…" : "Confirm and end shift"}</Text>
        </Pressable>
      </ModalShell>

      <ModalShell visible={success} title="Remittance complete" onClose={() => { setSuccess(false); onEnded(); }}>
        <Text style={[styles.title, { color: colors.success }]}>Shift successfully closed</Text>
        <Text style={styles.subtitle}>The official end-of-day report was submitted to the existing ChatCo backend.</Text>
        <View style={styles.card}>
          <Breakdown label="Grand total" value={accountableTotals.all} />
          <Breakdown label="Cash declared" value={declaredCash} />
          <Breakdown label="Variance" value={variance} />
        </View>
        <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => void shareReport()}>
          <Text style={styles.buttonText}>Share report copy</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={() => { setSuccess(false); onEnded(); }}>
          <Text style={styles.buttonText}>Return to unit verification</Text>
        </Pressable>
      </ModalShell>

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

      <ModalShell visible={selected !== null} title="Official remittance report" onClose={() => setSelected(null)}>
        {selected ? (
          <>
            <Text style={styles.label}>CHATCO official record</Text>
            <Text style={[styles.title, { marginTop: 8 }]}>Unit {selected.unit_number ?? shift.unitNumber}</Text>
            <Text style={styles.subtitle}>{selected.date ?? selected.remitted_at ?? "Completed shift"}</Text>
            <View style={styles.card}>
              <ReportLine label="Report ID" value={selected.id ?? "—"} />
              <ReportLine label="Shift ID" value={selected.shift_id ?? "—"} />
              <ReportLine label="Conductor" value={selected.conductor_name ?? shift.conductorName} />
              <ReportLine label="Driver" value={selected.driver_name ?? shift.driverName} />
              <ReportLine label="Time In" value={selected.time_in || "—"} />
              <ReportLine label="Time Out" value={selected.time_out || "—"} />
              <ReportLine label="Passengers" value={Number(selected.total_passengers ?? 0)} />
              <ReportLine label="Cash" value={money(selected.cash_total)} />
              <ReportLine label="GCash" value={money(selected.gcash_total)} />
              <ReportLine label="Voucher" value={money(selected.voucher_total)} />
              <ReportLine label="Total Cashless" value={money(selected.total_cashless)} />
              <ReportLine label="Declared" value={money(selected.declared_amount ?? selected.total_collected)} />
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
    `Declared: ${money(item.declared_amount ?? item.total_collected)}`,
    `Status: ${item.remittance_status ?? item.status ?? "Submitted"}`,
  ].join("\n");
}
