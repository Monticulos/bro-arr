import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import type { EventsData } from "../../../types/Event";

const currentDir = dirname(fileURLToPath(import.meta.url));
export const EVENTS_JSON_PATH = resolve(
  currentDir,
  "../../../web/public/data/events.json"
);

export function readEventsFile(): EventsData {
  try {
    const raw = readFileSync(EVENTS_JSON_PATH, "utf-8");
    return JSON.parse(raw) as EventsData;
  } catch {
    return { updatedAt: new Date().toISOString(), events: [] };
  }
}

export function writeEventsFile(data: EventsData): void {
  writeFileSync(EVENTS_JSON_PATH, JSON.stringify(data, null, 2), "utf-8");
}
