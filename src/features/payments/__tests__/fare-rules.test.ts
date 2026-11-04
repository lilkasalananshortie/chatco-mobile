/// <reference types="jest" />
import { DEFAULT_FARE_CONFIG, getFareBetween } from "../fare-helpers";
import type { FarePoint } from "../../../core/domain/types";

const point = (n: number): FarePoint => ({ id: String(n), pointNumber: n, name: String(n), code: String(n), landmarks: [], regularFare: 17 + Math.max(0, n - 4) * 2.25, discountedFare: (17 + Math.max(0, n - 4) * 2.25) * .8 });

test.each([[1, 1, 17], [1, 4, 17], [1, 5, 19.25], [5, 10, 21.5], [10, 5, 21.5]])("stops %s to %s match backend fare %s", (from, to, amount) => {
  expect(getFareBetween(point(from), point(to), DEFAULT_FARE_CONFIG, false)).toBe(amount);
  expect(getFareBetween(point(from), point(to), DEFAULT_FARE_CONFIG, true)).toBe(Math.round(amount * .8 * 100) / 100);
});

test.each([0, 25, 100])("uses current %s percent discount and custom fare settings", discountRate => {
  const config = { ...DEFAULT_FARE_CONFIG, baseFareRegular: 20, baseBarangayCount: 3, succeedingFareRegular: 3, discountRate };
  expect(getFareBetween(point(1), point(9), config, false)).toBe(38);
  expect(getFareBetween(point(1), point(9), config, true)).toBe(38 * (1 - discountRate / 100));
});
