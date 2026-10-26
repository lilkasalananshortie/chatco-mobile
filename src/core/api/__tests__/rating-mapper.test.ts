/// <reference types="jest" />
import { normalizeRatings, normalizeRatingSummary } from "../rating-mapper";

test("all-time summary combines independent personnel distributions like web", () => {
  expect(normalizeRatingSummary({ conductor: { total_count: 2, average_rating: 4.5, distribution: { "5": 1, "4": 1 } }, driver: { total_count: 1, average_rating: 2, distribution: { "2": 1 } } })).toEqual({
    total: 3, average: 3.7, satisfaction: 67, conductorCount: 2, conductorAverage: 4.5, driverCount: 1, driverAverage: 2, distribution: [0, 1, 0, 1, 1],
  });
});
test("empty all-time summary has no division by zero", () => {
  const empty = { total_count: 0, average_rating: 0, distribution: {} };
  expect(normalizeRatingSummary({ conductor: empty, driver: empty })).toMatchObject({ total: 0, average: 0, satisfaction: 0 });
});
test("separates independent driver and conductor ratings like web", () => {
  const rows = normalizeRatings([{ id: "f", rating: 2, conductor_rating: 5, driver_id: "d", conductor_id: "c", comment: "driver", conductor_comment: "conductor" }], "s");
  expect(rows.map(row => [row.targetRole, row.score, row.comment])).toEqual([["DRIVER", 2, "driver"], ["CONDUCTOR", 5, "conductor"]]);
  expect(new Set(rows.map(row => row.ratingId)).size).toBe(2);
});
test("legacy null conductor score falls back to driver score", () => {
  expect(normalizeRatings([{ id: "f", rating: 4, conductor_rating: null }], "s")[1]?.score).toBe(4);
});
test("already normalized ratings are not split twice", () => {
  expect(normalizeRatings([{ id: "f", targetRole: "DRIVER", score: 3 }], "s")).toHaveLength(1);
});
test("empty feedback remains empty", () => expect(normalizeRatings([], "s")).toEqual([]));
