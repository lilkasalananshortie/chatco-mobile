/// <reference types="jest" />
jest.mock("../api-client", () => ({ request: jest.fn(), post: jest.fn(), NetworkError: class extends Error {} }));
jest.mock("../../storage/device-id", () => ({ getConductorDeviceId: jest.fn(), CONDUCTOR_DEVICE_TYPE: "MOBILE" }));
jest.mock("../../storage/app-storage", () => ({ appStorage: { getItem: jest.fn(), setItem: jest.fn() } }));
import { post, request } from "../api-client";
import { fleetService } from "../fleet-service";
import { paymentService } from "../payment-service";
import { shiftService } from "../shift-service";
import { transactionSummary } from "../../domain/transaction-summary";
beforeEach(() => jest.clearAllMocks());
test("history requests subsequent backend pages with the selected filter", async () => {
  (request as jest.Mock).mockResolvedValue({ data: [{ id: "old", shift_id: "s" }], current_page: 8, last_page: 9, total: 130 });
  const page = await fleetService.remittancesPage(8, "WEEK");
  expect(request).toHaveBeenCalledWith(expect.stringContaining("page=8&filter=WEEK"));
  expect(page).toMatchObject({ page: 8, lastPage: 9, total: 130 });
  expect(page.items[0]?.id).toBe("old");
});
test("history outages are not presented as an empty successful list", async () => {
  (request as jest.Mock).mockRejectedValue(new Error("offline"));
  await expect(fleetService.remittancesPage()).rejects.toThrow("offline");
});
test("safety limit is loaded from the mobile backend route", async () => {
  (request as jest.Mock).mockResolvedValue({ speed_limit_kmh: 35 });
  expect(await fleetService.safetySettings()).toEqual({ speed_limit_kmh: 35 });
  expect(request).toHaveBeenCalledWith("/mobile/conductor/safety-settings");
});

test("all-time ratings use the shared mobile controller without a shift id", async () => {
  const empty = { total_count: 0, average_rating: 0, distribution: {} };
  (request as jest.Mock).mockResolvedValue({ conductor: empty, driver: empty });
  expect(await fleetService.ratingsSummary()).toMatchObject({ total: 0 });
  expect(request).toHaveBeenCalledWith("/mobile/conductor/ratings?scope=all_time");
});

test("pending payment resume retains processing and delayed-confirmation metadata", async () => {
  (request as jest.Mock).mockResolvedValue({ transaction_id: "payment", status: "PROCESSING", confirmation_delayed: true });
  expect(await paymentService.pendingGcash()).toMatchObject({ transactionId: "payment", status: "processing", confirmationDelayed: true });
  expect(await paymentService.paymentStatusDetails("payment")).toMatchObject({ status: "PROCESSING", confirmationDelayed: true });
});

test("conductor profile photo posts multipart to the mobile endpoint", async () => {
  const body = new FormData(); body.append("photo", "fixture");
  (post as jest.Mock).mockResolvedValue({ profile_picture_url: "https://media.test/profile.jpg" });
  expect(await shiftService.uploadProfilePhoto(body, "owner")).toBe("https://media.test/profile.jpg");
  expect(post).toHaveBeenCalledWith("/mobile/conductor/profile/photo", body);
});

test("an upload without a server-confirmed URL fails visibly", async () => {
  (post as jest.Mock).mockResolvedValue({});
  await expect(shiftService.uploadProfilePhoto(new FormData())).rejects.toThrow("did not confirm");
});

test("dashboard totals exclude all unsettled statuses and retain offline cash", () => {
  const base = { transactionId: "t", finalAmount: 17, from: "A", to: "B", timestamp: 1, paymentMethod: "Cash" as const };
  const excluded = (["PENDING", "PROCESSING", "FAILED", "CANCELLED", "EXPIRED", "REFUNDED"] as const).map(status => ({ ...base, paymentMethod: "GCash" as const, status }));
  expect(transactionSummary([...excluded, base, { ...base, status: "PAID", paymentMethod: "GCash" }, { ...base, status: "PAID", paymentMethod: "Voucher", finalAmount: 0 }])).toEqual({ cash: 17, gcash: 17, voucher: 0, total: 34 });
});

test("GCash initiation preserves a server-confirmed zero fare", async () => {
  (post as jest.Mock).mockResolvedValue({ transaction_id: "zero", amount: 0 });
  expect(await paymentService.initiateGcash({ amount: 17, from: "A", to: "B", baseFare: 17, distance: 1, discountAmount: 0 })).toMatchObject({ amount: 0 });
});

test("reminder polling stays on the mobile route and keeps notice identity", async () => {
  (request as jest.Mock).mockResolvedValue({ data: [{ id: "notice", type: "REMITTANCE_REMINDER", reference_id: "shift", message: "Cash due", is_read: false }] });
  expect(await fleetService.announcements(true)).toMatchObject([{ id: "notice", type: "REMITTANCE_REMINDER", referenceId: "shift", body: "Cash due", isRead: false }]);
  expect(request).toHaveBeenCalledWith("/mobile/conductor/announcements?unread_only=1&notifications_only=1&types=REMITTANCE_REMINDER&per_page=10");
});
