import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import { api } from "../../core/api/chatco-api";

export const LOCATION_TASK_NAME = "chatco-conductor-location";

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error || !data) return;
  const locations = (data as { locations?: Location.LocationObject[] }).locations ?? [];
  const location = locations.at(-1);
  if (!location) return;
  void api.location(
    location.coords.latitude,
    location.coords.longitude,
    location.coords.speed,
    location.coords.heading,
    location.coords.accuracy,
    new Date(location.timestamp).toISOString(),
  ).catch(() => undefined);
});
