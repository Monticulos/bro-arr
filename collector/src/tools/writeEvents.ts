import type { Event } from "../../../types/Event";
import { readEventsFile, writeEventsFile } from "./eventsFile.js";

export async function writeEvents(newEvents: Event[]): Promise<void> {
  const existingData = readEventsFile();
  existingData.events.push(...newEvents);
  existingData.updatedAt = new Date().toISOString();
  writeEventsFile(existingData);
}
