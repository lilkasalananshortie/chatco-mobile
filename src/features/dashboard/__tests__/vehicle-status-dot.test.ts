/// <reference types="jest" />
import { rearStatusDotPosition, vehicleMarkerSvg } from "../map-presentation";

test("one status dot moves to the opposite rear corner after a turnaround", () => {
  const south = rearStatusDotPosition("s");
  const north = rearStatusDotPosition("n");
  expect(south.x).toBeGreaterThan(43);
  expect(north.x).toBeLessThan(43);
  expect(south.y).toBeLessThan(40);
  expect(north.y).toBeGreaterThan(40);
  const svg = vehicleMarkerSvg("AVAILABLE", false);
  expect(svg.match(/<circle\b/g)).toHaveLength(1);
});
