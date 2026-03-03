import type { Event } from "../types.js";
import { readEventsFile, writeEventsFile } from "./eventsFile.js";

export function sortByDateTime(events: Event[]): Event[] {
  return [...events].sort((a, b) => a.dateTime.localeCompare(b.dateTime));
}

export function sortEvents(): void {
  const data = readEventsFile();
  data.events = sortByDateTime(data.events);
  writeEventsFile(data);
}
