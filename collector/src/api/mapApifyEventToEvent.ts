import type { Event } from "../types.js";
import type { ApifyEvent } from "./fetchApifyEvents.js";
import { categorizeEvent } from "../llm/categorizeEvent.js";

export async function mapApifyEventToEvent(apifyEvent: ApifyEvent): Promise<Event> {
  const category = await categorizeEvent(apifyEvent.name, apifyEvent.description);

  return {
    id: apifyEvent.id,
    title: apifyEvent.name,
    description: apifyEvent.description,
    category,
    dateTime: apifyEvent.utcStartDate,
    location: apifyEvent.location.name,
    url: apifyEvent.url,
    collectedAt: new Date().toISOString(),
  };
}
