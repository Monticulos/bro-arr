import type { Event } from "../../../shared/src/types/Event";
import type { ApifyEvent } from "./fetchApifyEvents.js";
import { mapLocation } from "../utils/mapLocation.js";

export function mapApifyEventToEvent(apifyEvent: ApifyEvent): Event {
  return {
    id: apifyEvent.id,
    title: apifyEvent.name,
    description: apifyEvent.description,
    startDate: apifyEvent.utcStartDate,
    location: mapLocation(apifyEvent.location.name),
    url: apifyEvent.url,
    collectedAt: new Date().toISOString(),
  };
}
