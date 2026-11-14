import type { Event } from "../../../shared/types/Event";
import type { ApifyEvent } from "./fetchApifyEvents.js";
import { categorizeEvent } from "../decisions/categorizeEvent.js";

export async function mapApifyEventToEvent(
  apifyEvent: ApifyEvent,
): Promise<Event> {
  const location = mapLocation(apifyEvent.location.name);
  const category = await categorizeEvent({
    title: apifyEvent.name,
    description: apifyEvent.description,
    location,
  });

  return {
    id: apifyEvent.id,
    title: apifyEvent.name,
    description: apifyEvent.description,
    category,
    startDate: apifyEvent.utcStartDate,
    location,
    url: apifyEvent.url,
    collectedAt: new Date().toISOString(),
  };
}

export const LOCATION_MAP: Record<string, string> = {
  "Storgata 70": "Den andre puben",
  "Storgata 61": "Kred",
  "Storgata 68": "Svang",
  "Skolegata 7": "Brønnøy bibliotek",
  "Skolegata 10": "Brønnøysund videregående skole",
  "Ytre Høgåsvei 37": "Forsamlingslokalet",
  "Gårdsøyveien 5": "Felleskjøpet",
  "Havnegata 16": "Cash bar",
  "Storgata 58": "Havnesenteret",
};

function mapLocation(location: string): string {
  for (const [address, venueName] of Object.entries(LOCATION_MAP)) {
    if (location.includes(address)) return venueName;
  }
  return location;
}
