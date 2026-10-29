import type { Announcement } from "../../core/domain/types";

export function unreadReminders(items: Announcement[], dismissed: ReadonlySet<string>): Announcement[] {
  return items.filter(item => item.type === "REMITTANCE_REMINDER" && !item.isRead && !dismissed.has(item.id));
}
