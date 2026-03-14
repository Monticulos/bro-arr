import type { Event } from "../../../types/Event";
import { readEventsFile, writeEventsFile } from "./eventsFile.js";
import { mergeEventLists } from "../utils/mergeEvents.js";

export async function upsertEvents(newEvents: Event[]): Promise<void> {
  const data = readEventsFile();
  data.events = mergeEventLists(data.events, newEvents);
  data.updatedAt = new Date().toISOString();
  writeEventsFile(data);
}
