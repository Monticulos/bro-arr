import type { Event } from "../../../types/Event";
import { readEventsFile, writeEventsFile } from "./eventsFile.js";

const EXPIRY_HOURS = 12;

export function isExpired(event: Event, now: Date = new Date()): boolean {
  const expiryThreshold = new Date(now.getTime() - EXPIRY_HOURS * 60 * 60 * 1000);
  return new Date(event.dateTime) < expiryThreshold;
}

export function deleteExpiredEvents(): void {
  const data = readEventsFile();
  const originalCount = data.events.length;
  data.events = data.events.filter((event) => !isExpired(event));
  writeEventsFile(data);

  const removedCount = originalCount - data.events.length;
  console.log(removedCount > 0 ? `Removed ${removedCount} expired events.` : "No expired events found.");
}