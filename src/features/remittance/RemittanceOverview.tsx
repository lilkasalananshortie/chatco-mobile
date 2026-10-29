import { useEffect, useState } from "react";
import { Text } from "../../shared/ui/BrandText";
import { Pressable, View } from "react-native";
import { api } from "../../core/api/chatco-api";
import type { Remittance } from "../../core/domain/types";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import { ScreenShell } from "../../shared/ui";

/** Read-only history remains available after the operational shift ends. */
export function RemittanceOverview({ onBack }: { onBack: () => void }) {
  const { styles } = useAppTheme();
  const [items, setItems] = useState<Remittance[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    api.remittancesPage(page, "ALL", 15).then(result => {
      if (!active) return;
      setItems(result.items); setLastPage(result.lastPage);
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load reports."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, retry]);
  return <ScreenShell>
    <Pressable accessibilityRole="button" onPress={onBack} style={[styles.button, styles.secondaryButton]}>
      <Text style={[styles.buttonText, styles.secondaryButtonText]}>Back to verification</Text>
    </Pressable>
    <Text style={[styles.title, { marginTop: 20 }]}>Shift reports</Text>
    <Text style={styles.subtitle}>Hand cash to the office. Admin records your remittance.</Text>
    {loading ? <Text style={styles.subtitle}>Loading reports…</Text> : error ? <Pressable accessibilityRole="button" onPress={() => setRetry(value => value + 1)}><Text style={styles.error}>{error} Tap to retry.</Text></Pressable> : <>
      {items.length === 0 ? <Text style={styles.subtitle}>No shift reports yet.</Text> : items.map(item => <View key={item.id ?? item.shift_id} style={styles.card}>
        <Text style={styles.cardTitle}>{item.unit_number || "Unit"} · {item.remittance_status ?? "PENDING"}</Text>
        <Text style={styles.subtitle}>{item.date} · Cash ₱{Number(item.cash_total ?? 0).toFixed(2)}</Text>
      </View>)}
      <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
        <Pressable accessibilityRole="button" disabled={page <= 1} onPress={() => setPage(value => value - 1)} style={[styles.button, styles.secondaryButton, { flex: 1, opacity: page <= 1 ? 0.5 : 1 }]}><Text style={[styles.buttonText, styles.secondaryButtonText]}>Previous</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={page >= lastPage} onPress={() => setPage(value => value + 1)} style={[styles.button, { flex: 1, opacity: page >= lastPage ? 0.5 : 1 }]}><Text style={styles.buttonText}>Next</Text></Pressable>
      </View>
      <Text style={styles.subtitle}>Page {page} of {lastPage}</Text>
    </>}
  </ScreenShell>;
}
