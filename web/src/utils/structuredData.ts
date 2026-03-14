import type { Event } from "../types/event";

interface SchemaPlace {
  "@type": "Place";
  name: string;
}

interface SchemaEvent {
  "@type": "Event";
  name: string;
  description: string;
  startDate: string;
  location?: SchemaPlace;
  url?: string;
}

interface SchemaGraph {
  "@context": "https://schema.org";
  "@graph": SchemaEvent[];
}

function mapEventToSchema(event: Event): SchemaEvent {
  const schemaEvent: SchemaEvent = {
    "@type": "Event",
    name: event.title,
    description: event.description,
    startDate: event.dateTime,
  };

  if (event.location) {
    schemaEvent.location = { "@type": "Place", name: event.location };
  }

  if (event.url) {
    schemaEvent.url = event.url;
  }

  return schemaEvent;
}

export function buildEventsJsonLd(events: Event[]): SchemaGraph {
  return {
    "@context": "https://schema.org",
    "@graph": events.map(mapEventToSchema),
  };
}
