import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, AppState, Easing, Platform, Pressable, Share, View } from "react-native";
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
import { PastShiftRemittance } from "./components/PastShiftRemittance";
import { shiftTotals } from "../../core/domain/transaction-summary";
import type { CashReviewTicket } from "../../core/storage/offline-cash-queue";
import { readShiftAccess, remittanceTotals } from "../../core/api/shift-access";
import { useReducedMotion } from "../../shared/ui/useWebEntrance";

type ReportLoadState = "loading" | "success" | "error";

const CASH_WAITING_TO_SYNC = "Some cash transactions are still waiting to sync. Check your connection, keep the app open, and try again in a minute.";

export function ReportScreen({ shift, outstanding, refreshKey, canOperate, onEnded, onBack, onSignOut, onSubmitting }: {
  shift: Shift;
  outstanding?: Remittance;
  refreshKey: number;
  canOperate: boolean;
  onEnded: () => void;
  onBack?: () => void;
  /** Replaces Back while settling a closed shift. */
  onSignOut?: () => void | Promise<void>;
  onSubmitting?: (value: boolean) => void;
}) {
  const { colors, isLofi, isLowFidelity, styles } = useReportTheme();
  const reduceMotion = useReducedMotion();
  const skeletonOpacity = useRef(new Animated.Value(0.55)).current;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [earnings, setEarnings] = useState<ShiftEarnings | null>(null);
  const [reportState, setReportState] = useState<ReportLoadState>("loading");
  useEffect(() => {
    if (reportState !== "loading" || isLowFidelity || reduceMotion) {
      skeletonOpacity.stopAnimation();
      skeletonOpacity.setValue(0.55);
      return;
    }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(skeletonOpacity, { toValue: 0.9, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(skeletonOpacity, { toValue: 0.45, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [reportState, isLowFidelity, reduceMotion, skeletonOpacity]);
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
  const [signingOut, setSigningOut] = useState(false);
  const [reviewTickets, setReviewTickets] = useState<CashReviewTicket[]>([]);
  const loadInFlight = useRef<Promise<void> | null>(null);
  const endedRef = useRef(false);
  const onEndedRef = useRef(onEnded);
  const submitting = useRef(false);
  const preparing = useRef(false);
  const completed = useRef(false);
  const hasOutstanding = Boolean(outstanding);
  // Like the web, any closed shift still holding cash is settled here, then the
  // conductor continues to unit verification.
  const returnToVerification = hasOutstanding;

  useEffect(() => { onEndedRef.current = onEnded; }, [onEnded]);

  const load = useCallback(async () => {
    if (submitting.current || completed.current) return;
    if (outstanding) {
      try { remittanceTotals(outstanding); setReportState("success"); }
      catch (cause) { setError((cause as Error).message); setReportState("error"); }
      return;
    }
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
  }, [shift.shiftId, outstanding]);

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
    const timer = setInterval(() => {
      if (AppState.currentState !== "background" && AppState.currentState !== "inactive") void load();
    }, 20000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void load();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [load, refreshKey]);

  useEffect(() => {
    if (historyExpanded && !historyLoaded && !historyLoading && !historyError) void loadHistory();
  }, [historyExpanded, historyLoaded, historyLoading, historyError, loadHistory]);

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
    const summary = shiftTotals(transactions, earnings);
    return { ...summary, all: summary.total };
  }, [transactions, earnings]);
  const accountableTotals = outstanding ? remittanceTotals(outstanding) : totals;

  // Each group passenger has a row, and every row repeats the group's size.
  const totalPassengers = useMemo(
    () => transactions.reduce((sum, transaction) => sum + (transaction.groupId ? 1 : transaction.totalPassengers ?? 1), 0),
    [transactions],
  );

  // Refused tickets are shown as collected until now, but the server won't count them.
  const excludedCash = outstanding ? 0 : reviewTickets.reduce((sum, ticket) => sum + ticket.amount, 0);
  const confirmTotals = {
    ...accountableTotals,
    cash: Math.max(0, accountableTotals.cash - excludedCash),
    all: Math.max(0, accountableTotals.all - excludedCash),
  };
  const confirmPassengers = outstanding
    ? Number(outstanding.total_passengers ?? 0)
    : Math.max(0, totalPassengers - reviewTickets.length);

  const canRemit = hasOutstanding || transactions.length > 0;
  const allowed = hasOutstanding || canOperate;

  const handlePressRemit = async () => {
    if (!canRemit || preparing.current || submitting.current || completed.current) return;
    if (!allowed) {
      setError("This shift is active on another device. Complete the handoff before remitting here.");
      return;
    }
    setError("");
    preparing.current = true;
    try {
      await syncPendingCashTransactions({ drain: true });
      const pending = await api.pendingCashCount(shift.shiftId);
      if (pending > 0) {
        setError(CASH_WAITING_TO_SYNC);
        return;
      }
      setReviewTickets(await api.cashNeedingReview(shift.shiftId));
      setConfirm(true);
    } catch {
      setError(CASH_WAITING_TO_SYNC);
    } finally { preparing.current = false; }
  };

  const submit = async () => {
    if (!canRemit || submitting.current || completed.current) return;
    if (!allowed) {
      setError("This shift is active on another device. Complete the handoff before remitting here.");
      return;
    }
    submitting.current = true;
    onSubmitting?.(true);
    setBusy(true);
    setError("");
    try {
      await syncPendingCashTransactions({ drain: true });
      const pendingForShift = await api.pendingCashCount(shift.shiftId);
      if (pendingForShift > 0) throw new Error(CASH_WAITING_TO_SYNC);
      let snapshot = accountableTotals;
      if (hasOutstanding) {
        const access = await readShiftAccess();
        if (access.kind !== "unremitted" || access.remittance.shift_id !== shift.shiftId) {
          throw new Error("This shift's remittance has changed. Return to verification and check again.");
        }
        snapshot = { ...accountableTotals, ...remittanceTotals(access.remittance) };
      } else {
        const fresh = await api.earnings(shift.shiftId);
        snapshot = { ...accountableTotals, cash: fresh.cashTotal, gcash: fresh.gcashTotal, all: fresh.total };
      }
      if (await api.pendingCashCount(shift.shiftId) > 0) throw new Error("Cash transactions still need to sync. Reconnect and retry.");
      const result = await api.remit(shift, snapshot.cash, snapshot.gcash);
      completed.current = true;
      // The server has committed the remittance. A missing or partial totals
      // payload must not turn that success into a retryable error.
      let captured = snapshot;
      if (result?.remittance) {
        try { captured = remittanceTotals(result.remittance); }
        catch { /* Use the freshly verified totals above. */ }
      }
      setSubmittedTotals({ cash: captured.cash, gcash: captured.gcash, all: captured.all });
      setConfirm(false);
      setSuccess(true);
    } catch (cause) {
      onSubmitting?.(false);
      setError(cause instanceof Error ? cause.message : "Unable to submit the remittance.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  const printReport = async (record: Remittance) => {
    const body = officialReportText(record, shift);
    if (Platform.OS === "ios") {
      await Share.share({ title: "E-CHATCO Official Report", message: body });
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

  const handleSignOut = async () => {
    if (!onSignOut || signingOut || submitting.current || completed.current) return;
    setSigningOut(true);
    try { await onSignOut(); }
    finally { setSigningOut(false); }
  };
  const signOutLocked = signingOut || busy || success;
  const signOutAction = onSignOut ? (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: signOutLocked, busy: signingOut }} disabled={signOutLocked} onPress={() => void handleSignOut()} style={{ minHeight: 40, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", opacity: signOutLocked ? 0.5 : 1 }}>
      <Text style={{ color: colors.text, fontSize: 12, fontWeight: "600" }}>{signingOut ? "Signing out…" : "Sign out"}</Text>
    </Pressable>
  ) : undefined;
  const pageNavigation = returnToVerification ? { headerAction: signOutAction } : { onBack };

  if (reportState === "loading") {
    return (
      <ReportPage {...pageNavigation}>
        {[80, 112, 192, 128, 56].map((height, index) => (
          <Animated.View key={index} style={[styles.card, { height, marginTop: index === 0 ? 4 : 12, opacity: skeletonOpacity }]} />
        ))}
      </ReportPage>
    );
  }

  if (reportState === "error") {
    return (
      <ReportPage {...pageNavigation}>
        <Pressable accessibilityRole="button" onPress={() => { setReportState("loading"); void load(); }} style={[styles.card, { paddingVertical: 32, alignItems: "center" }]}>
          <Text style={styles.error}>{error}</Text>
          <Text style={[styles.subtitle, { marginTop: 8 }]}>Tap to retry.</Text>
        </Pressable>
      </ReportPage>
    );
  }

  const remittanceModals = <>
    <RemittanceConfirmModal
      visible={confirm}
      onClose={() => { if (!submitting.current) setConfirm(false); }}
      busy={busy}
      error={error}
      shiftInfo={{ driverName: shift.driverName, unitNumber: shift.unitNumber }}
      totalPassengers={confirmPassengers}
      accountableTotals={confirmTotals}
      excludedTickets={reviewTickets}
      onConfirm={submit}
    />

    <RemittanceSuccessModal
      visible={success}
      late={returnToVerification}
      accountableTotals={submittedTotals ?? accountableTotals}
      unitNumber={shift.unitNumber}
      onClose={exitAfterRemittance}
    />

    <RemittanceReportSlipModal selected={selected} onClose={() => setSelected(null)} shift={shift} />
  </>;

  if (outstanding) {
    return (
      <ReportPage title="Pending Remittance" headerAction={signOutAction}>
        <PastShiftRemittance
          record={outstanding}
          shift={shift}
          totals={accountableTotals}
          disabled={!canRemit || busy || success || signingOut}
          onRemit={() => void handlePressRemit()}
        />
        {error ? <Text style={[styles.error, { marginTop: 12 }]}>{error}</Text> : null}
        {remittanceModals}
      </ReportPage>
    );
  }

  return (
    <ReportPage onBack={busy || success ? undefined : onBack}>

      <View style={[styles.card, { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 }]}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="person-outline" size={18} color="#FFFFFF" />
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
        shiftTimeIn={shift.timeIn}
      />

      <View style={[styles.card, { gap: 12 }]}>
        <Text style={styles.label}>Collection Summary</Text>
        <View style={{ flexDirection: "row", gap: 12 }}>
          {[
            { label: "GCash", amount: accountableTotals.gcash },
            { label: "Cash", amount: accountableTotals.cash },
          ].map((item) => (
            <View key={item.label} style={{ flex: 1, backgroundColor: colors.surface2, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border }}>
              <Text style={[styles.label, { fontWeight: "600" }]}>{item.label}</Text>
              <Text style={{ color: colors.text, fontSize: 18, lineHeight: 28, fontWeight: "800", marginTop: 2 }}>{money(item.amount)}</Text>
            </View>
          ))}
        </View>
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={[styles.label, { color: colors.secondary, fontSize: 12, lineHeight: 16 }]}>Grand Total</Text>
          <Text style={{ color: colors.text, fontSize: 24, lineHeight: 32, fontWeight: "800" }}>{money(accountableTotals.all)}</Text>
        </View>
      </View>

      <View style={{ gap: 12 }}>
        <View style={[styles.card, { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, backgroundColor: colors.surface2 }]}>
          <ConductorIcon name="globe" size={18} color={colors.primaryLight} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.secondary, fontSize: 12, lineHeight: 16, fontWeight: "600" }}>Remittance to Admin</Text>
            <Text style={{ color: isLofi ? "#6B7280" : "rgba(255,255,255,0.3)", fontSize: 10, lineHeight: 15, marginTop: 2 }}>All recorded transactions will be submitted to admin</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !allowed || !canRemit || busy || success, busy }}
          disabled={!allowed || !canRemit || busy || success}
          onPress={() => void handlePressRemit()}
          style={[styles.button, (!allowed || !canRemit) && { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border }]}
        >
          <Text style={[styles.buttonText, (!allowed || !canRemit) && { color: colors.muted }]}>
            {!canRemit ? "No pending remittance" : allowed ? "Remit to Admin" : "Complete shift handoff to remit"}
          </Text>
        </Pressable>
        {!allowed ? <Text style={styles.error}>This shift is active on another device. Complete handoff to remit.</Text> : null}
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

      {remittanceModals}
    </ReportPage>
  );
}
