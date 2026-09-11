import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../core/api/chatco-api";
import { Header, ScreenShell } from "../../shared/ui";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import type { Rating, Shift } from "../../core/domain/types";

function getGaugeColor(pct: number): string {
  if (pct >= 90) return "#34D399";
  if (pct >= 75) return "#62A0EA";
  if (pct >= 50) return "#FBBF24";
  return "#F87171";
}

function StarRating({ score, size = 16 }: { score: number; size?: number }) {
  const { colors, isLofi } = useAppTheme();
  const rounded = Math.round(score);
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= rounded ? "star" : "star-outline"}
          size={size}
          color={i <= rounded ? (isLofi ? colors.warning : "#FBBF24") : (isLofi ? colors.border : "rgba(255,255,255,0.2)")}
        />
      ))}
    </View>
  );
}

export function MetricsScreen({ shift }: { shift?: Shift | null }) {
  const { colors, isLofi, styles } = useAppTheme();
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRatings = async (shiftId: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await api.ratings(shiftId);
      setRatings(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load ratings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shift?.shiftId) {
      void loadRatings(shift.shiftId);
    } else {
      setLoading(false);
    }
  }, [shift?.shiftId]);

  const metrics = useMemo(() => {
    const average = (items: Rating[]) =>
      items.length ? Math.round((items.reduce((s, r) => s + r.score, 0) / items.length) * 10) / 10 : 0;
    const conductor = ratings.filter((r) => r.targetRole === "CONDUCTOR");
    const driver = ratings.filter((r) => r.targetRole === "DRIVER");
    const distribution = [1, 2, 3, 4, 5].map(
      (score) => ratings.filter((r) => r.score === score).length
    );
    const satisfied = ratings.filter((r) => r.score >= 4).length;
    const satisfaction = ratings.length ? Math.round((satisfied / ratings.length) * 100) : 0;

    return {
      satisfaction,
      average: average(ratings),
      conductorAverage: average(conductor),
      driverAverage: average(driver),
      conductorCount: conductor.length,
      driverCount: driver.length,
      distribution,
    };
  }, [ratings]);

  const satisfactionColor = getGaugeColor(metrics.satisfaction);
  const maxDistributionCount = Math.max(...metrics.distribution, 1);

  return (
    <ScreenShell>
      <Header title="Performance Metrics" subtitle="Shift ratings overview" />

      {loading ? (
        <View style={{ paddingVertical: 48, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primaryLight} />
          <Text style={[styles.subtitle, { marginTop: 12 }]}>Loading performance data…</Text>
        </View>
      ) : error ? (
        <View style={[styles.card, { borderColor: isLofi ? colors.danger : "rgba(239, 68, 68, 0.3)", backgroundColor: isLofi ? "#FEE2E2" : "rgba(239, 68, 68, 0.08)", alignItems: "center", paddingVertical: 24 }]}>
          <Text style={[styles.error, { marginTop: 0 }]}>{error}</Text>
          {shift?.shiftId ? (
            <Pressable
              style={[styles.button, styles.secondaryButton, { marginTop: 14 }]}
              onPress={() => void loadRatings(shift.shiftId)}
            >
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>Retry</Text>
            </Pressable>
          ) : null}
        </View>
      ) : !shift ? (
        /* No active shift state */
        <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 56, paddingHorizontal: 24 }}>
          <View style={{ width: 72, height: 72, borderRadius: isLofi ? 4 : 36, backgroundColor: isLofi ? colors.surface2 : "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Ionicons name="time-outline" size={36} color={colors.muted} />
          </View>
          <Text style={[styles.cardTitle, { fontSize: 17, marginBottom: 6 }]}>No active shift</Text>
          <Text style={[styles.subtitle, { textAlign: "center", maxWidth: 280 }]}>
            Start a shift from the dashboard to view your performance metrics.
          </Text>
        </View>
      ) : ratings.length === 0 ? (
        /* Empty state: Shift active but no ratings submitted yet */
        <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 56, paddingHorizontal: 24 }}>
          <View style={{ width: 72, height: 72, borderRadius: isLofi ? 4 : 36, backgroundColor: isLofi ? colors.surface2 : "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Ionicons name="star-outline" size={36} color={colors.muted} />
          </View>
          <Text style={[styles.cardTitle, { fontSize: 17, marginBottom: 6 }]}>No ratings yet for this shift</Text>
          <Text style={[styles.subtitle, { textAlign: "center", maxWidth: 280 }]}>
            Ratings from commuters will appear here once they submit feedback.
          </Text>
        </View>
      ) : (
        /* Full metrics overview */
        <>
          {/* Main Satisfaction block */}
          <View style={[styles.card, { alignItems: "center", paddingVertical: 24 }]}>
            <Text style={{ color: satisfactionColor, fontSize: 52, fontWeight: "900", lineHeight: 56 }}>
              {metrics.satisfaction}%
            </Text>
            <Text style={[styles.label, { marginTop: 6, letterSpacing: 1.5 }]}>SATISFACTION</Text>

            <View style={{ flexDirection: "row", gap: 12, width: "100%", marginTop: 20 }}>
              <View style={{ flex: 1, backgroundColor: colors.surface2, borderRadius: isLofi ? 3 : 12, paddingVertical: 12, paddingHorizontal: 8, alignItems: "center", borderWidth: isLofi ? 1.5 : 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 18 }}>⭐</Text>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800", marginTop: 4 }}>
                  {metrics.average.toFixed(1)}
                </Text>
                <Text style={[styles.label, { fontSize: 9, marginTop: 2 }]}>Avg Rating</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.surface2, borderRadius: isLofi ? 3 : 12, paddingVertical: 12, paddingHorizontal: 8, alignItems: "center", borderWidth: isLofi ? 1.5 : 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 18 }}>👥</Text>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800", marginTop: 4 }}>
                  {ratings.length}
                </Text>
                <Text style={[styles.label, { fontSize: 9, marginTop: 2 }]}>Total Ratings</Text>
              </View>
            </View>
          </View>

          {/* Dual Performance cards */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={[styles.card, { flex: 1, padding: 14 }]}>
              <Text style={[styles.cardTitle, { fontSize: 13 }]}>Your Performance</Text>
              <Text style={[styles.subtitle, { fontSize: 11, marginTop: 2 }]}>Conductor</Text>
              <View style={{ marginTop: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
                <View>
                  <Text style={{ color: isLofi ? colors.primary : "#62A0EA", fontSize: 32, fontWeight: "900", lineHeight: 34 }}>
                    {metrics.conductorAverage > 0 ? metrics.conductorAverage.toFixed(1) : "—"}
                  </Text>
                  <Text style={[styles.subtitle, { fontSize: 10, marginTop: 4 }]}>
                    {metrics.conductorCount} {metrics.conductorCount === 1 ? "rating" : "ratings"}
                  </Text>
                </View>
                {metrics.conductorAverage > 0 ? (
                  <StarRating score={metrics.conductorAverage} size={14} />
                ) : null}
              </View>
            </View>

            <View style={[styles.card, { flex: 1, padding: 14 }]}>
              <Text style={[styles.cardTitle, { fontSize: 13 }]}>Driver's Performance</Text>
              <Text style={[styles.subtitle, { fontSize: 11, marginTop: 2 }]} numberOfLines={1}>
                {shift.driverName || "Assigned Driver"}
              </Text>
              <View style={{ marginTop: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
                <View>
                  <Text style={{ color: isLofi ? colors.primaryLight : "#A78BFA", fontSize: 32, fontWeight: "900", lineHeight: 34 }}>
                    {metrics.driverAverage > 0 ? metrics.driverAverage.toFixed(1) : "—"}
                  </Text>
                  <Text style={[styles.subtitle, { fontSize: 10, marginTop: 4 }]}>
                    {metrics.driverCount} {metrics.driverCount === 1 ? "rating" : "ratings"}
                  </Text>
                </View>
                {metrics.driverAverage > 0 ? (
                  <StarRating score={metrics.driverAverage} size={14} />
                ) : null}
              </View>
            </View>
          </View>

          {/* Rating Distribution */}
          <View style={styles.card}>
            <Text style={[styles.label, { marginBottom: 14 }]}>Rating Distribution</Text>
            <View style={{ gap: 10 }}>
              {[5, 4, 3, 2, 1].map((star) => {
                const count = metrics.distribution[star - 1] ?? 0;
                const pct = ratings.length ? Math.round((count / ratings.length) * 100) : 0;
                const barWidth = (count / maxDistributionCount) * 100;

                return (
                  <View key={star} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", width: 34, gap: 3 }}>
                      <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>{star}</Text>
                      <Ionicons name="star" size={12} color={isLofi ? colors.warning : "#FBBF24"} />
                    </View>
                    <View style={{ flex: 1, height: 8, backgroundColor: isLofi ? colors.surface2 : "rgba(255,255,255,0.06)", borderRadius: isLofi ? 2 : 999, overflow: "hidden" }}>
                      <View style={{ width: `${barWidth}%`, height: "100%", backgroundColor: colors.primary, borderRadius: isLofi ? 2 : 999 }} />
                    </View>
                    <View style={{ width: 62, alignItems: "flex-end" }}>
                      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "500" }}>
                        {count} <Text style={{ color: colors.muted, fontSize: 10 }}>({pct}%)</Text>
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Recent Commuter Feedback */}
          {ratings.filter((r) => r.comment).length > 0 ? (
            <>
              <Text style={[styles.label, { marginTop: 22 }]}>Recent Feedback</Text>
              {ratings
                .filter((r) => r.comment)
                .slice(0, 5)
                .map((r) => (
                  <View key={r.ratingId} style={styles.card}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <StarRating score={r.score} size={13} />
                      <Text style={[styles.label, { fontSize: 9 }]}>
                        {r.targetRole === "CONDUCTOR" ? "Conductor Feedback" : "Driver Feedback"}
                      </Text>
                    </View>
                    <Text style={[styles.cardTitle, { fontSize: 13, marginTop: 8 }]}>"{r.comment}"</Text>
                    <Text style={[styles.subtitle, { fontSize: 11, marginTop: 6 }]}>
                      {r.commuterName || "Commuter"} · {new Date(r.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                ))}
            </>
          ) : null}
        </>
      )}
    </ScreenShell>
  );
}
