import type { EventInput } from "@fullcalendar/core";
import type { CategorizedEvent } from "../types/event";

export function mapEventsToCalendar(events: CategorizedEvent[]): EventInput[] {
  return events.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.startDate,
    end: event.endDate,
    url: event.url,
    extendedProps: {
      category: event.category,
      location: event.location,
      description: event.description,
    },
  }));
}
