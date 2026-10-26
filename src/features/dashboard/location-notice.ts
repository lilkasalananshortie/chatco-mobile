import { appStorage } from "../../core/storage/app-storage";

export const LOCATION_NOTICE_VERSION = "2026-10-26";
export const LOCATION_NOTICE_TEXT = "ChatCo collects this vehicle's location during your active shift, including when the app is minimized or not in use, to show the unit to commuters and Admin and support route and safety monitoring. Tracking is limited to the authorized operating device. Device and network restrictions may interrupt updates. You can change location permission in device Settings. This acknowledgement does not grant shift or assignment authorization.";
const key = (userId: string) => `chatco_location_notice:${userId}`;

export async function hasLocationNotice(userId: string): Promise<boolean> {
  return (await appStorage.getItem(key(userId), { strict: true })) === LOCATION_NOTICE_VERSION;
}

export async function acknowledgeLocationNotice(userId: string): Promise<void> {
  await appStorage.setItem(key(userId), LOCATION_NOTICE_VERSION, { strict: true });
}
