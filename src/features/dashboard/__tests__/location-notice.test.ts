/// <reference types="jest" />
import { acknowledgeLocationNotice, hasLocationNotice, LOCATION_NOTICE_TEXT, LOCATION_NOTICE_VERSION } from "../location-notice";
import { appStorage } from "../../../core/storage/app-storage";
jest.mock("../../../core/storage/app-storage", () => ({ appStorage: { getItem: jest.fn(), setItem: jest.fn() } }));
beforeEach(() => jest.resetAllMocks());
test.each([null, "old-version"])("missing or outdated acknowledgement %s never enables tracking", async value => {
  (appStorage.getItem as jest.Mock).mockResolvedValue(value);
  expect(await hasLocationNotice("owner")).toBe(false);
});
test("acknowledgement is scoped to the signed-in account and version", async () => {
  (appStorage.getItem as jest.Mock).mockImplementation(async key => key === "chatco_location_notice:owner" ? LOCATION_NOTICE_VERSION : null);
  expect(await hasLocationNotice("owner")).toBe(true);
  expect(await hasLocationNotice("other")).toBe(false);
});
test("only an explicit acknowledgement writes the version using strict storage", async () => {
  await hasLocationNotice("owner"); expect(appStorage.setItem).not.toHaveBeenCalled();
  await acknowledgeLocationNotice("owner");
  expect(appStorage.setItem).toHaveBeenCalledWith("chatco_location_notice:owner", LOCATION_NOTICE_VERSION, { strict: true });
});
test("storage failure is not treated as a saved acknowledgement", async () => {
  (appStorage.setItem as jest.Mock).mockRejectedValue(new Error("Storage unavailable"));
  await expect(acknowledgeLocationNotice("owner")).rejects.toThrow("Storage unavailable");
});
test("disclosure describes background collection and its actual audience", () => {
  expect(LOCATION_NOTICE_TEXT).toContain("minimized or not in use");
  expect(LOCATION_NOTICE_TEXT).toContain("commuters and Admin");
  expect(LOCATION_NOTICE_TEXT).toContain("does not grant shift or assignment authorization");
});
