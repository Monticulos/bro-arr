import type { Event } from "../types.js";
import { readEventsFile, writeEventsFile } from "./eventsFile.js";

const EXPIRY_HOURS = 12;

export function isExpired(event: Event, now: Date = new Date()): boolean {
  const expiryThreshold = new Date(now.getTime() - EXPIRY_HOURS * 60 * 60 * 1000);
  return new Date(event.dateTime) < expiryThreshold;
}

export function deleteExpiredEvents(): number {
  const data = readEventsFile();
  const originalCount = data.events.length;
  data.events = data.events.filter((event) => !isExpired(event));
  writeEventsFile(data);
  return originalCount - data.events.length;
}
