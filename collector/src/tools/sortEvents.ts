import type { Event } from "../../../types/Event";

export function sortEvents(events: Event[]): Event[] {
  console.log("Sorting events by date.");
  return [...events].sort((a, b) => a.startDate.localeCompare(b.startDate));
}
