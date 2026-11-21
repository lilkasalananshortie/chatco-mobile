/// <reference types="jest" />
import type { FarePoint } from "../../../core/domain/types";
import { pointSearchDigits, pointsMatchingNumber, selectedPointName } from "../fare-helpers";

const names = ["Calumpit", "C.I. (Colegio de Calumpit)", "Bagbag", "San Marcos"];
const points = Array.from({ length: 33 }, (_, index): FarePoint => ({
  id: String(index + 1),
  pointNumber: index + 1,
  name: names[index] ?? `Point ${index + 1}`,
  code: `P${index + 1}`,
  landmarks: [],
  regularFare: 17,
  discountedFare: 13.5,
}));
const found = (query: string) => pointsMatchingNumber(points, query).map((point) => point.name);

test.each([
  ["2", "C.I. (Colegio de Calumpit)"],
  ["4", "San Marcos"],
  ["04", "San Marcos"],
])("typing %s finds only %s", (query, name) => {
  expect(found(query)).toEqual([name]);
});

test("a one-digit search does not also match 12, 20, or 32", () => {
  expect(pointsMatchingNumber(points, "2").map((point) => point.pointNumber)).toEqual([2]);
});

test("a two-digit search finds that point", () => {
  expect(pointsMatchingNumber(points, "12").map((point) => point.pointNumber)).toEqual([12]);
});

test("names no longer match", () => {
  expect(pointSearchDigits("San Marcos")).toBe("");
  expect(pointsMatchingNumber(points, "San Marcos")).toHaveLength(33);
});

test.each(["0", "34", "999"])("%s finds nothing", (query) => {
  expect(found(query)).toEqual([]);
});

test("an empty search shows every point", () => {
  expect(found("")).toHaveLength(33);
});

test("a chosen sub-stop is part of the saved stop name, as on the web", () => {
  expect(selectedPointName(points[0]!, "Gatbuca")).toBe("Calumpit · Gatbuca");
  expect(selectedPointName(points[0]!, null)).toBe("Calumpit");
});

test("input keeps digits only, up to three", () => {
  expect(pointSearchDigits(" 1a2-3 4")).toBe("123");
});
