import { writeEventsFile } from "./eventsFile.js";

export function deleteSavedEvents(): void {
  writeEventsFile({ updatedAt: new Date().toISOString(), events: [] });
}
