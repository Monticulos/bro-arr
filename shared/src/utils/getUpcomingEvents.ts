import type { Event } from "../types/Event";

const ONGOING_GRACE_HOURS = 12;

export function getUpcomingEvents<EventType extends Event>(
  events: EventType[],
  now: Date = new Date(),
): EventType[] {
  const expiryThreshold = new Date(
    now.getTime() - ONGOING_GRACE_HOURS * 60 * 60 * 1000,
  );
  return events.filter((event) => new Date(event.startDate) >= expiryThreshold);
}
