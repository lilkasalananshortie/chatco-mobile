/// <reference types="jest" />
jest.mock("../../storage/app-storage", () => ({ appStorage: { getItem: jest.fn(), setItem: jest.fn() } }));
jest.mock("../../storage/device-id", () => ({ CONDUCTOR_DEVICE_TYPE: "MOBILE", getConductorDeviceId: async () => "device" }));
jest.mock("../api-client", () => ({
  request: jest.fn(), post: jest.fn(), NetworkError: class NetworkError extends Error {},
}));
import { appStorage } from "../../storage/app-storage";
import { NetworkError, request } from "../api-client";
import { cachedPublishedFares, FARE_CACHE_MAX_AGE_MS, normalizePublishedFares, savePublishedFares } from "../fare-matrix-cache";
import { paymentService } from "../payment-service";
import { mapTransaction } from "../api-mappers";
const raw = { route: { id: "route" }, points: [
  { id: "one", pointNumber: 1, name: "Terminal", code: "A", regularFare: 17, discountedFare: 13.6, landmarks: "Market, School" },
  { id: "two", pointNumber: 5, name: "Town", code: "B", regularFare: 26, discountedFare: 20.8, landmarks: '["Hall"]' },
] };
beforeEach(() => {
  jest.resetAllMocks();
  (appStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  (appStorage.getItem as jest.Mock).mockResolvedValue(null);
});
test("published points and identifiers are preserved without synthetic places", () => {
  const data = normalizePublishedFares(raw, "route");
  expect(data.points.map((p) => p.id)).toEqual(["one", "two"]);
  expect(data.points.map((p) => p.pointNumber)).toEqual([1, 5]);
  expect(data.points[0]!.landmarks).toEqual(["Market", "School"]);
  expect(data.points[1]!.landmarks).toEqual(["Hall"]);
});
test("new defaults do not override explicit backend tariffs", () => {
  expect(normalizePublishedFares(raw).config).toMatchObject({ baseFareRegular: 17, baseFareDiscounted: 13.6, succeedingFareDiscounted: 1.8 });
  expect(normalizePublishedFares({ ...raw, config: { baseFareRegular: 15, baseFareDiscounted: 12 } }).config.baseFareRegular).toBe(15);
});
test("invalid or mismatched route data is rejected", () => {
  expect(() => normalizePublishedFares(raw, "other-route")).toThrow("different route");
  expect(() => normalizePublishedFares({ ...raw, points: [] })).toThrow("No published");
  expect(() => normalizePublishedFares({ ...raw, points: [{ ...raw.points[0], regularFare: "bad" }] })).toThrow("invalid");
  expect(() => normalizePublishedFares({ ...raw, points: [raw.points[0], raw.points[0]] })).toThrow("invalid");
});
test("recent published fares survive offline restart for their originating route", async () => {
  const matrix = normalizePublishedFares(raw, "route");
  const now = Date.now(); await savePublishedFares(matrix, "route", now);
  const [, saved] = (appStorage.setItem as jest.Mock).mock.calls[0]!;
  (appStorage.getItem as jest.Mock).mockResolvedValue(saved);
  expect(await cachedPublishedFares("route", now + 100)).toMatchObject({ isCached: true, routeId: "route", loadedAt: now });
  expect(await cachedPublishedFares("other", now + 100)).toBeNull();
});
test("expired, future and malformed cache cannot authorize estimated fares", async () => {
  const now = Date.now(); const matrix = normalizePublishedFares(raw);
  (appStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({ version: 2, savedAt: now - FARE_CACHE_MAX_AGE_MS - 1, matrix }));
  expect(await cachedPublishedFares(undefined, now)).toBeNull();
  (appStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({ version: 2, savedAt: now + 1, matrix }));
  expect(await cachedPublishedFares(undefined, now)).toBeNull();
  (appStorage.getItem as jest.Mock).mockResolvedValue("corrupt");
  expect(await cachedPublishedFares()).toBeNull();
  expect(appStorage.setItem).not.toHaveBeenCalled();
});
test("fare fetch requests the shift route and saves only published values", async () => {
  (request as jest.Mock).mockResolvedValue(raw);
  expect((await paymentService.fareMatrix("route")).isCached).toBe(false);
  expect(request).toHaveBeenCalledWith("/mobile/fare-matrix?route_id=route");
  expect(appStorage.setItem).toHaveBeenCalledTimes(1);
});
test("network failure can use recent cached fares but authorization errors cannot", async () => {
  const matrix = normalizePublishedFares(raw);
  (appStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({ version: 2, savedAt: Date.now(), matrix }));
  (request as jest.Mock).mockRejectedValue(new NetworkError("Offline"));
  expect((await paymentService.fareMatrix("route")).isCached).toBe(true);
  (request as jest.Mock).mockRejectedValue(new Error("Forbidden"));
  await expect(paymentService.fareMatrix("route")).rejects.toThrow("Forbidden");
});
test("no recent cache produces a clear error, never fictional stop data", async () => {
  (request as jest.Mock).mockRejectedValue(new NetworkError("Offline"));
  await expect(paymentService.fareMatrix("route")).rejects.toThrow("Reconnect");
});
test("cache write failure does not discard fresh server fares", async () => {
  (request as jest.Mock).mockResolvedValue(raw);
  (appStorage.setItem as jest.Mock).mockRejectedValue(new Error("Storage full"));
  expect((await paymentService.fareMatrix()).points).toHaveLength(2);
});
test.each([[false, false], [true, false], [false, true], [true, true]])("receipt options QR=%s manual=%s retain independent values", async (qr, code) => {
  (request as jest.Mock).mockResolvedValue({ receipt_show_qr_code: String(qr), receipt_show_manual_code: String(code) });
  expect(await paymentService.receiptSettings()).toMatchObject({ showQrCode: qr, showManualCode: code });
});
test("older backend defaults preserve QR and manual receipt support", async () => {
  (request as jest.Mock).mockResolvedValue({});
  expect(await paymentService.receiptSettings()).toMatchObject({ showQrCode: true, showManualCode: true });
});
test("offline receipt settings retain the last Admin QR/manual choices", async () => {
  (request as jest.Mock).mockResolvedValue({ receipt_show_qr_code: "false", receipt_show_manual_code: "false" });
  const saved = await paymentService.receiptSettings();
  (request as jest.Mock).mockRejectedValue(new NetworkError("Offline"));
  (appStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(saved));
  expect(await paymentService.receiptSettings()).toMatchObject({ showQrCode: false, showManualCode: false });
});
test("GCash payment QR and voucher cash are not mapped as reward claim QR", () => {
  expect(mapTransaction({ payment_method: "GCASH", qr_token: "pay" }).receiptQrToken).toBeNull();
  expect(mapTransaction({ payment_method: "CASH", voucher_id: "v", qr_token: "pay" }).receiptQrToken).toBeNull();
  expect(mapTransaction({ payment_method: "CASH", reward_eligible: false, qr_token: "pay" }).receiptQrToken).toBeNull();
  expect(mapTransaction({ payment_method: "CASH", qr_token: "receipt" }).receiptQrToken).toBe("receipt");
});
