/// <reference types="jest" />
jest.mock("../api-client", () => ({ post: jest.fn(), request: jest.fn() }));
jest.mock("../../storage/app-storage", () => ({ appStorage: {} }));
jest.mock("../../storage/device-id", () => ({
  CONDUCTOR_DEVICE_TYPE: "MOBILE",
  getConductorDeviceId: jest.fn(async () => "mobile-direction-device"),
}));

import { post } from "../api-client";
import { shiftService } from "../shift-service";
import { mapShift } from "../api-mappers";

beforeEach(() => jest.clearAllMocks());

test.each(["FORWARD", "REVERSE"] as const)("saves %s through the existing mobile endpoint with device ownership", async direction => {
  (post as jest.Mock).mockResolvedValueOnce({ trip_direction: direction });
  await shiftService.updateTripDirection(direction);
  expect(post).toHaveBeenCalledWith("/mobile/conductor/trip-direction", {
    trip_direction: direction,
    device_id: "mobile-direction-device",
    device_type: "MOBILE",
  });
});

test("preserves server errors so the direction dialog can retry", async () => {
  (post as jest.Mock).mockRejectedValueOnce(new Error("This shift is active on another device."));
  await expect(shiftService.updateTripDirection("REVERSE")).rejects.toThrow("another device");
});

test("restores an explicit server direction without overwriting legacy local direction when absent", () => {
  expect(mapShift({ trip_direction: "REVERSE" }).tripDirection).toBe("REVERSE");
  expect(mapShift({ trip_direction: "FORWARD" }).tripDirection).toBe("FORWARD");
  expect(mapShift({}).tripDirection).toBeUndefined();
});
