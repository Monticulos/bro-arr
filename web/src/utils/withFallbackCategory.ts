import type { CategorizedEvent, Event } from "../types/event";

/** The collector leaves an event uncategorized when the decision model gives no answer. */
export function withFallbackCategory(event: Event): CategorizedEvent {
  return { ...event, category: event.category ?? "annet" };
}
