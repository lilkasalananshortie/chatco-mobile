/// <reference types="jest" />
import { DEFAULT_FARE_CONFIG, getFareBetween } from "../fare-helpers";
import type { FarePoint } from "../../../core/domain/types";

const point = (n: number): FarePoint => ({ id: String(n), pointNumber: n, name: String(n), code: String(n), landmarks: [], regularFare: 17 + Math.max(0, n - 4) * 2.25, discountedFare: (17 + Math.max(0, n - 4) * 2.25) * .8 });

test("discount precedes quarter rounding", () => {
  const config = { ...DEFAULT_FARE_CONFIG, baseFareRegular: 17.35 };
  expect(getFareBetween(point(1), point(2), config, false)).toBe(17.25);
  expect(getFareBetween(point(1), point(2), config, true)).toBe(14);
});

test.each([[1, 1, 17, 13.5], [1, 4, 17, 13.5], [1, 5, 19.5, 15.5], [5, 10, 21.75, 17.5], [10, 5, 21.75, 17.5], [1, 12, 36.25, 29], [1, 33, 86.5, 69.25]])("stops %s to %s match backend fare %s", (from, to, amount, discounted) => {
  expect(getFareBetween(point(from), point(to), DEFAULT_FARE_CONFIG, false)).toBe(amount);
  expect(getFareBetween(point(from), point(to), DEFAULT_FARE_CONFIG, true)).toBe(discounted);
});

test.each([0, 25, 100])("uses current %s percent discount and custom fare settings", discountRate => {
  const config = { ...DEFAULT_FARE_CONFIG, baseFareRegular: 20, baseBarangayCount: 3, succeedingFareRegular: 3, discountRate };
  expect(getFareBetween(point(1), point(9), config, false)).toBe(38);
  expect(getFareBetween(point(1), point(9), config, true)).toBe(38 * (1 - discountRate / 100));
});
