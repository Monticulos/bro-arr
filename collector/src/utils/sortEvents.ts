import type { Event } from "../../../shared/types/Event";
import { logPhase } from "./logger.js";

export function sortEvents(events: Event[]): Event[] {
  logPhase("Sorting events by date.");
  return [...events].sort((a, b) => a.startDate.localeCompare(b.startDate));
}
