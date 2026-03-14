import type { Event } from "../../../types/Event";
import type { ApifyEvent } from "./fetchApifyEvents.js";
import { categorizeEvent } from "../llm/categorizeEvent.js";

export async function mapApifyEventToEvent(apifyEvent: ApifyEvent): Promise<Event> {
  const category = await categorizeEvent(apifyEvent.name, apifyEvent.description);

  return {
    id: apifyEvent.id,
    title: apifyEvent.name,
    description: apifyEvent.description,
    category,
    startDate: apifyEvent.utcStartDate,
    location: mapLocation(apifyEvent.location.name),
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
  "Havnegata 16": "Cash bar"
};

function mapLocation(location: string): string {
  for (const [address, venueName] of Object.entries(LOCATION_MAP)) {
    if (location.includes(address)) return venueName;
  }
  return location;
}