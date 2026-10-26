import type { Rating } from "../domain/types";

export function normalizeRatingSummary(data: { conductor: { total_count: number; average_rating: number; distribution: Record<string, number> }; driver: { total_count: number; average_rating: number; distribution: Record<string, number> } }) {
  const distribution = [1, 2, 3, 4, 5].map(star => Number(data.conductor.distribution[String(star)] ?? 0) + Number(data.driver.distribution[String(star)] ?? 0));
  const total = Number(data.conductor.total_count) + Number(data.driver.total_count);
  return {
    total, distribution,
    average: total ? Math.round(distribution.reduce((sum, count, index) => sum + count * (index + 1), 0) / total * 10) / 10 : 0,
    satisfaction: total ? Math.round(((distribution[3] ?? 0) + (distribution[4] ?? 0)) / total * 100) : 0,
    conductorCount: Number(data.conductor.total_count), conductorAverage: Number(data.conductor.average_rating),
    driverCount: Number(data.driver.total_count), driverAverage: Number(data.driver.average_rating),
  };
}

/** Match the web proxy's driver/conductor split, including legacy feedback. */
export function normalizeRatings(rows: any[], shiftId: string): Rating[] {
  return rows.flatMap(row => {
    const base = {
      commuterId: String(row.commuterId ?? row.commuter_id ?? ""),
      commuterName: row.commuterName ?? row.commuter_name ?? "Anonymous Commuter",
      shiftId: String(row.shiftId ?? row.shift_id ?? shiftId),
      createdAt: row.createdAt ?? row.created_at,
    };
    if (row.targetRole || row.target_role) return [{ ...base,
      ratingId: String(row.ratingId ?? row.rating_id ?? row.id),
      targetRole: row.targetRole ?? row.target_role, targetId: String(row.targetId ?? row.target_id ?? ""),
      score: Number(row.score), comment: row.comment ?? "",
    }];
    return [
      { ...base, ratingId: `${row.id}-drv`, targetRole: "DRIVER" as const,
        targetId: String(row.driver_id ?? ""), score: Number(row.rating), comment: row.comment ?? "" },
      { ...base, ratingId: `${row.id}-cond`, targetRole: "CONDUCTOR" as const,
        targetId: String(row.conductor_id ?? ""), score: Number(row.conductor_rating ?? row.rating), comment: row.conductor_comment ?? "" },
    ];
  });
}
