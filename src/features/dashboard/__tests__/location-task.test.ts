/// <reference types="jest" />
let mockTask: (event: any) => Promise<void>;
jest.mock("expo-task-manager", () => ({ defineTask: (_name: string, task: typeof mockTask) => { mockTask = task; } }));
jest.mock("../../../core/api/chatco-api", () => ({ api: { location: jest.fn() } }));
import { api } from "../../../core/api/chatco-api";
import "../location-task";

beforeEach(() => { jest.clearAllMocks(); });
const event = { data: { locations: [{ coords: { latitude: 14.8, longitude: 120.9, speed: 0, heading: 0, accuracy: 5 }, timestamp: 10000 }] } };

test("background task remains active until the location upload finishes", async () => {
  let finish!: () => void;
  (api.location as jest.Mock).mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
  let completed = false;
  const task = mockTask(event).then(() => { completed = true; });
  await Promise.resolve(); await Promise.resolve();
  expect(api.location).toHaveBeenCalledTimes(1);
  expect(completed).toBe(false);
  finish(); await task;
  expect(completed).toBe(true);
});

test("failed uploads do not reject the native task", async () => {
  (api.location as jest.Mock).mockRejectedValue(new Error("Offline"));
  await expect(mockTask(event)).resolves.toBeUndefined();
});

test("empty or failed native location events do not upload", async () => {
  await mockTask({ data: { locations: [] } });
  await mockTask({ error: new Error("No GPS fix") });
  expect(api.location).not.toHaveBeenCalled();
});
