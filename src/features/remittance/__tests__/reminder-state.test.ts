/// <reference types="jest" />
import { unreadReminders } from "../reminder-state";
import type { Announcement } from "../../../core/domain/types";
const notice: Announcement = { id: "r", title: "Cash due", body: "Visit office", isRead: false, type: "REMITTANCE_REMINDER" };
test("only unread targeted reminders are displayed", () => {
  expect(unreadReminders([notice, { ...notice, id: "read", isRead: true }, { ...notice, id: "news", type: "GENERAL" }], new Set())).toEqual([notice]);
});
test("dismissed notices do not reopen on the next poll", () => {
  expect(unreadReminders([notice], new Set(["r"]))).toEqual([]);
});
test("a new reminder remains visible after dismissing the previous one", () => {
  expect(unreadReminders([notice, { ...notice, id: "next" }], new Set(["r"]))).toHaveLength(1);
});
