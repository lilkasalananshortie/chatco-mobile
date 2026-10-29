import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../core/api/chatco-api";
import { Text } from "../../shared/ui/BrandText";
import { Header, ScreenShell } from "../../shared/ui";
import { useAppTheme } from "../../core/theme/ThemeProvider";
import type { Rating, Shift } from "../../core/domain/types";

function StarRating({ score, size = 16 }: { score: number; size?: number }) {
  const { colors, isLofi } = useAppTheme();
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={{ width: size, height: size }}>
          <Ionicons name="star-outline" size={size} color={isLofi ? colors.border : "rgba(255,255,255,0.2)"} />
          <View style={{ position: "absolute", left: 0, top: 0, width: `${Math.min(1, Math.max(0, score - i + 1)) * 100}%`, height: size, overflow: "hidden" }}>
            <Ionicons name="star" size={size} color="#FBBF24" />
          </View>
        </View>
      ))}
    </View>
  );
}

export function MetricsScreen({ onBack }: { shift?: Shift | null; onBack?: () => void }) {
  const { colors, isLofi, styles } = useAppTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 600;
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof api.ratingsSummary>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestVersion = useRef(0);

  const loadRatings = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError("");
    try {
      const data = await api.ratingsSummary();
      if (version === requestVersion.current) setSummary(data);
    } catch (e) {
      if (version === requestVersion.current) setError(e instanceof Error ? e.message : "Unable to load ratings.");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRatings();
    return () => { requestVersion.current++; };
  }, [loadRatings]);
  const metricCount = summary?.total ?? 0;
  const ratings: Rating[] = [];
  const metrics = {
    total: metricCount,
    satisfaction: summary?.satisfaction ?? 0,
    average: summary?.average ?? 0,
    conductorAverage: summary?.conductorAverage ?? 0,
    conductorCount: summary?.conductorCount ?? 0,
    driverAverage: summary?.driverAverage ?? 0,
    driverCount: summary?.driverCount ?? 0,
    distribution: summary?.distribution ?? [0, 0, 0, 0, 0],
  };
  const satisfactionColor = isLofi ? colors.primary : "#62A0EA";
  const cardStyle = {
    backgroundColor: isLofi ? colors.surface : "rgba(255,255,255,0.03)",
    borderColor: colors.border,
    borderWidth: 1,
  } as const;

  return (
    <ScreenShell>
      <Header title="Performance Metrics" subtitle="Commuter ratings across all your shifts" />
      {onBack && <Pressable accessibilityRole="button" onPress={onBack} style={styles.secondaryButton}><Text style={styles.subtitle}>Back to verification</Text></Pressable>}
      <Text style={{ color: colors.primaryLight, fontSize: 12, fontWeight: "600", marginTop: -2, marginBottom: 20 }}>All time</Text>

      {loading ? (
        <View accessibilityRole="progressbar" accessibilityLabel="Loading ratings" style={[cardStyle, { borderRadius: 12, overflow: "hidden" }]}>
          <View style={{ flexDirection: wide ? "row" : "column" }}>
            <View style={{ flex: 1, padding: 22, gap: 18 }}>
              {[28, 110, 70, 1, 80, 80].map((item, index) => <View key={index} style={{ width: item === 1 ? "100%" : item, height: item === 1 ? 1 : 14, borderRadius: 6, backgroundColor: isLofi ? colors.surface2 : "rgba(255,255,255,0.06)" }} />)}
            </View>
            <View style={{ flex: 1, padding: 22, gap: 17, borderTopWidth: wide ? 0 : 1, borderLeftWidth: wide ? 1 : 0, borderColor: colors.border }}>
              {[1, 2, 3, 4, 5].map((row) => <View key={row} style={{ height: 12, borderRadius: 6, backgroundColor: isLofi ? colors.surface2 : "rgba(255,255,255,0.06)" }} />)}
            </View>
          </View>
          <View style={{ height: 112, borderTopWidth: 1, borderColor: colors.border }} />
        </View>
      ) : error ? (
        <View accessibilityRole="alert" style={[cardStyle, { borderColor: isLofi ? "#FECACA" : "rgba(248,113,113,0.2)", backgroundColor: isLofi ? "#FEF2F2" : "rgba(248,113,113,0.05)", borderRadius: 12, padding: 22 }]}>
          <Text style={[styles.cardTitle, { fontSize: 14 }]}>Ratings unavailable</Text>
          <Text style={[styles.subtitle, { marginTop: 8 }]}>{error}</Text>
          <Pressable accessibilityRole="button" onPress={() => void loadRatings()} style={[styles.button, { alignSelf: "flex-start", paddingHorizontal: 18, minHeight: 44 }]}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      ) : metricCount === 0 ? (
        <View style={[cardStyle, { borderRadius: 12, alignItems: "center", paddingHorizontal: 24, paddingVertical: 48 }]}>
          <Ionicons name="star-outline" size={32} color={isLofi ? colors.primary : "rgba(98,160,234,0.7)"} />
          <Text style={[styles.cardTitle, { fontSize: 16, marginTop: 18 }]}>No ratings yet</Text>
          <Text style={[styles.subtitle, { textAlign: "center", maxWidth: 300, marginTop: 8 }]}>
            Your ratings will appear here when commuters submit feedback.
          </Text>
        </View>
      ) : (
        /* Full metrics overview */
        <View style={[cardStyle, { borderRadius: 12, overflow: "hidden" }]}>
          <View style={{ flexDirection: wide ? "row" : "column" }}>
          {/* Combined rating and breakdown */}
          <View style={{ flex: wide ? 0.9 : undefined, minWidth: 0, alignItems: "flex-start", padding: wide ? 24 : 20 }}>
            <Text style={[styles.subtitle, { fontSize: 14, fontWeight: "500" }]}>Combined rating</Text>
            <Text style={{ color: colors.text, fontSize: 52, fontWeight: "600", lineHeight: 58 }}>
              {metrics.average.toFixed(1)}
            </Text>
            <Text style={[styles.subtitle, { fontSize: 14 }]}>/ 5</Text>
            <View style={{ marginTop: 12 }}><StarRating score={metrics.average} /></View>
            <Text style={[styles.subtitle, { marginTop: 10 }]}>Driver and conductor scores combined</Text>

            <View style={{ flexDirection: "row", gap: 20, width: "100%", marginTop: 22, paddingTop: 16, borderTopWidth: 1, borderColor: colors.border }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 20, fontWeight: "600", marginTop: 6 }}>
                  {metrics.total.toLocaleString()}
                </Text>
                <Text style={[styles.subtitle, { fontSize: 12, marginTop: 2 }]}>Total ratings</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: satisfactionColor, fontSize: 20, fontWeight: "600", marginTop: 6 }}>
                  {metrics.satisfaction}%
                </Text>
                <Text style={[styles.subtitle, { fontSize: 12, marginTop: 2 }]}>Rated 4 or 5 stars</Text>
              </View>
            </View>
          </View>

          {/* Rating Distribution */}
          <View style={{ flex: wide ? 1.1 : undefined, minWidth: 0, borderTopWidth: wide ? 0 : 1, borderLeftWidth: wide ? 1 : 0, borderColor: colors.border, padding: wide ? 24 : 20 }}>
            <Text style={[styles.cardTitle, { fontSize: 14 }]}>Rating breakdown</Text>
            <Text style={[styles.subtitle, { fontSize: 12, marginTop: 4, marginBottom: 20 }]}>All driver and conductor scores</Text>
            <View style={{ gap: 16 }}>
              {[5, 4, 3, 2, 1].map((star) => {
                const count = metrics.distribution[star - 1] ?? 0;
                const pct = metrics.total ? Math.round((count / metrics.total) * 100) : 0;
                const barWidth = metrics.total ? (count / metrics.total) * 100 : 0;

                return (
                  <View key={star} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", width: 28, gap: 4 }}>
                      <Text style={{ color: colors.text, fontSize: 12, fontWeight: "500" }}>{star}</Text>
                      <Ionicons name="star" size={12} color={isLofi ? colors.warning : "#FBBF24"} />
                    </View>
                    <View style={{ flex: 1, height: 8, backgroundColor: isLofi ? colors.surface2 : "rgba(255,255,255,0.06)", borderRadius: isLofi ? 2 : 999, overflow: "hidden" }}>
                      <View style={{ width: `${barWidth}%`, height: "100%", backgroundColor: colors.primary, borderRadius: isLofi ? 2 : 999 }} />
                    </View>
                    <Text style={{ width: 32, textAlign: "right", color: colors.text, fontSize: 12, fontVariant: ["tabular-nums"] }}>{count.toLocaleString()}</Text>
                    <Text style={{ width: 34, textAlign: "right", color: colors.muted, fontSize: 12, fontVariant: ["tabular-nums"] }}>{pct}%</Text>
                  </View>
                );
              })}
            </View>
          </View>
          </View>

          {/* Role-specific scores follow the combined breakdown, like web. */}
          <View style={{ flexDirection: wide ? "row" : "column", borderTopWidth: 1, borderColor: colors.border }}>
            <View style={{ flex: 1, minWidth: 0, padding: wide ? 24 : 20, borderBottomWidth: wide ? 0 : 1, borderColor: colors.border }}>
              <Text style={[styles.cardTitle, { fontSize: 14 }]}>Your rating</Text>
              <Text style={[styles.subtitle, { fontSize: 12, marginTop: 4 }]}>Your conductor scores across all shifts</Text>
              <View style={{ marginTop: 16, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
                  <Text style={{ color: isLofi ? colors.primary : "#62A0EA", fontSize: 30, fontWeight: "600" }}>{metrics.conductorCount > 0 ? metrics.conductorAverage.toFixed(1) : "—"}</Text>
                  <Text style={[styles.subtitle, { fontSize: 12 }]}>/ 5</Text>
                </View>
                <Text style={[styles.subtitle, { fontSize: 12 }]}>{metrics.conductorCount.toLocaleString()} {metrics.conductorCount === 1 ? "rating" : "ratings"}</Text>
              </View>
            </View>
            <View style={{ flex: 1, minWidth: 0, padding: wide ? 24 : 20, borderLeftWidth: wide ? 1 : 0, borderColor: colors.border }}>
              <Text style={[styles.cardTitle, { fontSize: 14 }]}>Driver ratings</Text>
              <Text style={[styles.subtitle, { fontSize: 12, marginTop: 4 }]}>Driver scores from the shifts you crewed</Text>
              <View style={{ marginTop: 16, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
                  <Text style={{ color: isLofi ? colors.primary : "#62A0EA", fontSize: 30, fontWeight: "600" }}>{metrics.driverCount > 0 ? metrics.driverAverage.toFixed(1) : "—"}</Text>
                  <Text style={[styles.subtitle, { fontSize: 12 }]}>/ 5</Text>
                </View>
                <Text style={[styles.subtitle, { fontSize: 12 }]}>{metrics.driverCount.toLocaleString()} {metrics.driverCount === 1 ? "rating" : "ratings"}</Text>
              </View>
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
        </View>
      )}
    </ScreenShell>
  );
}
