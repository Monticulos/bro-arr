import type { Event } from "../../../shared/types/Event";
import { getUpcomingEvents } from "../../../shared/utils/getUpcomingEvents";
import { logPhase } from "./logger.js";

export function deleteExpiredEvents(events: Event[]): Event[] {
  const upcomingEvents = getUpcomingEvents(events);
  const removedCount = events.length - upcomingEvents.length;

  logPhase(
    removedCount > 0
      ? `Removed ${removedCount} expired events.`
      : "No expired events found.",
  );
  return upcomingEvents;
}
