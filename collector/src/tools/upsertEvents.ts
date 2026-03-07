import type { Event } from "../../../types/Event";
import { readEventsFile, writeEventsFile } from "./eventsFile.js";

export async function upsertEvents(newEvents: Event[]): Promise<void> {
  const data = readEventsFile();
  const eventById = new Map(data.events.map((e) => [e.id, e]));

  for (const newEvent of newEvents) {
    eventById.set(newEvent.id, newEvent);
  }

  data.events = Array.from(eventById.values());
  data.updatedAt = new Date().toISOString();
  writeEventsFile(data);
}
