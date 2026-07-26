import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { api } from "../../core/api/chatco-api";
import { Header, ScreenShell } from "../../shared/ui";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import type { Rating, Shift } from "../../core/domain/types";

export function MetricsScreen({ shift }: { shift: Shift }) {
  const { colors, styles } = useAppTheme();
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { void api.ratings(shift.shiftId).then(setRatings).catch(e => setError(e.message)); }, [shift.shiftId]);
  const metrics = useMemo(() => {
    const average = (items: Rating[]) => items.length ? Math.round(items.reduce((s, r) => s + r.score, 0) / items.length * 10) / 10 : 0;
    const conductor = ratings.filter(r => r.targetRole === "CONDUCTOR");
    const driver = ratings.filter(r => r.targetRole === "DRIVER");
    const distribution = [1, 2, 3, 4, 5].map(score => ratings.filter(r => r.score === score).length);
    return {
      satisfaction: ratings.length ? Math.round(ratings.filter(r => r.score >= 4).length / ratings.length * 100) : 0,
      average: average(ratings), conductorAverage: average(conductor), driverAverage: average(driver),
      conductorCount: conductor.length, driverCount: driver.length, distribution,
    };
  }, [ratings]);
  return <ScreenShell>
    <Header title="Performance Metrics" subtitle="Shift ratings overview." />
    <View style={[styles.card, { alignItems: "center" }]}><Text style={{ color: metrics.satisfaction >= 75 ? colors.primaryLight : colors.warning, fontSize: 48, fontWeight: "900" }}>{metrics.satisfaction}%</Text><Text style={styles.label}>Satisfaction</Text><Text style={styles.subtitle}>Average {metrics.average.toFixed(1)} · {ratings.length} ratings</Text></View>
    <View style={{ flexDirection: "row", gap: 10 }}><Score title="Your Performance" subtitle="Conductor" average={metrics.conductorAverage} count={metrics.conductorCount} /><Score title="Driver Performance" subtitle={shift.driverName} average={metrics.driverAverage} count={metrics.driverCount} /></View>
    <Text style={[styles.label, { marginTop: 22 }]}>Rating distribution</Text>
    {[5, 4, 3, 2, 1].map(star => {
      const count = metrics.distribution[star - 1] ?? 0;
      const pct = ratings.length ? count / ratings.length * 100 : 0;
      return <View key={star} style={styles.card}><View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={styles.cardTitle}>{star} ★</Text><Text style={styles.subtitle}>{count} · {Math.round(pct)}%</Text></View><View style={{ height: 7, backgroundColor: colors.surface2, marginTop: 9 }}><View style={{ width: `${pct}%`, height: 7, backgroundColor: colors.warning }} /></View></View>;
    })}
    <Text style={[styles.label, { marginTop: 22 }]}>Recent feedback</Text>
    {ratings.filter(r => r.comment).map(r => <View key={r.ratingId} style={styles.card}><Text style={styles.cardTitle}>{"★".repeat(r.score)} · {r.targetRole === "CONDUCTOR" ? "Conductor" : "Driver"}</Text><Text style={styles.subtitle}>{r.comment}</Text><Text style={styles.subtitle}>{r.commuterName} · {new Date(r.createdAt).toLocaleDateString()}</Text></View>)}
    {!ratings.length && !error ? <Text style={styles.subtitle}>No ratings have been submitted for this shift.</Text> : null}
    {error ? <Text style={styles.error}>{error}</Text> : null}
  </ScreenShell>;
  function Score({ title, subtitle, average, count }: { title: string; subtitle: string; average: number; count: number }) {
    return <View style={[styles.card, { flex: 1 }]}><Text style={styles.label}>{title}</Text><Text style={styles.title}>{average.toFixed(1)}</Text><Text style={styles.subtitle}>{subtitle} · {count} ratings</Text></View>;
  }
}
