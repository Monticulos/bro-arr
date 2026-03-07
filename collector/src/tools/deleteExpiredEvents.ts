import type { Event } from "../../../types/Event";

const EXPIRY_HOURS = 12;

export function isExpired(event: Event, now: Date = new Date()): boolean {
  const expiryThreshold = new Date(now.getTime() - EXPIRY_HOURS * 60 * 60 * 1000);
  return new Date(event.dateTime) < expiryThreshold;
}

export function deleteExpiredEvents(events: Event[]): Event[] {
  const filtered = events.filter((event) => !isExpired(event));
  const removedCount = events.length - filtered.length;

  console.log(removedCount > 0 ? `Removed ${removedCount} expired event.` : "No expired events found.");
  return filtered;
}
