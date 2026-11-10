import { appStorage } from "../../core/storage/app-storage";

export const LOCATION_NOTICE_VERSION = "2026-10-26";
export const LOCATION_NOTICE_SECTIONS = [
  { title: "During your active shift", text: "ChatCo collects this vehicle's location during your active shift, including when the app is minimized or not in use, to show the unit to commuters and Admin and support route and safety monitoring." },
  { title: "From this device", text: "Tracking is limited to the authorized operating device. Device and network restrictions may interrupt updates." },
  { title: "You stay in control", text: "You can change location permission in device Settings." },
];
export const LOCATION_NOTICE_AUTHORIZATION = "This acknowledgement does not grant shift or assignment authorization.";
export const LOCATION_NOTICE_TEXT = [...LOCATION_NOTICE_SECTIONS.map(section => section.text), LOCATION_NOTICE_AUTHORIZATION].join(" ");
const key = (userId: string) => `chatco_location_notice:${userId}`;

export async function hasLocationNotice(userId: string): Promise<boolean> {
  return (await appStorage.getItem(key(userId), { strict: true })) === LOCATION_NOTICE_VERSION;
}

export async function acknowledgeLocationNotice(userId: string): Promise<void> {
  await appStorage.setItem(key(userId), LOCATION_NOTICE_VERSION, { strict: true });
}
