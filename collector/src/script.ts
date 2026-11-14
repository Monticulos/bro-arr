import "dotenv/config";
import type { Event } from "../../shared/types/Event.js";
import { TARGET_SOURCES } from "./sources.js";
import { extractEvents } from "./puppeteer/extractEvents.js";
import { formatEvents } from "./llm/formatEvents.js";
import { upsertEvents } from "./io/upsertEvents.js";
import { sortEvents } from "./utils/sortEvents.js";
import { deleteExpiredEvents } from "./utils/deleteExpiredEvents.js";
import { deleteDuplicateEvents } from "./utils/deleteDuplicateEvents.js";
import {
  readEventsFile,
  writeEventsFile,
  eventCount,
} from "./io/eventsFile.js";
import { getValidApifyEvents } from "./api/fetchApifyEvents.js";
import { mapApifyEventToEvent } from "./api/mapApifyEventToEvent.js";
import { startApifyActorRun, waitForActorRun } from "./api/runApifyActor.js";
import { shouldRunApify } from "./api/apifyConfig.js";
import {
  logPhase,
  logDetail,
  warnPhase,
  warnDetail,
} from "./utils/logger.js";

async function collectPuppeteerEvents(): Promise<number> {
  logPhase("Starting Puppeteer event collection.");
  const collectedEvents: Event[] = [];

  for (const source of TARGET_SOURCES) {
    logPhase(`Processing ${source.name}...`);

    const rawText = await extractEvents(source);
    if (!rawText) {
      logDetail(`Skipping ${source.name} - no content extracted.`);
      continue;
    }

    logDetail(`Extracted content from ${source.url}.`);

    try {
      const events = await formatEvents(source, rawText);
      collectedEvents.push(...events);
      logDetail(`Formatted ${events.length} events.`);
    } catch (error) {
      warnDetail(`Failed to format events from ${source.name}:`, error);
    }
  }

  await upsertEvents(collectedEvents);
  return collectedEvents.length;
}

async function collectApifyEvents(datasetId: string): Promise<number> {
  logPhase("Fetching Apify events...");
  const collectedEvents: Event[] = [];

  const apifyEvents = await getValidApifyEvents(datasetId);
  for (const apifyEvent of apifyEvents) {
    logDetail(`Fetched Apify event ${apifyEvent.name}.`);
    try {
      const event = await mapApifyEventToEvent(apifyEvent);
      collectedEvents.push(event);
    } catch (error) {
      warnDetail(`Failed to map Apify event "${apifyEvent.name}":`, error);
    }
  }

  await upsertEvents(collectedEvents);
  return collectedEvents.length;
}

function cleanEventsFile() {
  const data = readEventsFile();
  data.events = deleteExpiredEvents(data.events);
  data.events = deleteDuplicateEvents(data.events);
  data.events = sortEvents(data.events);
  writeEventsFile(data);
}

async function main() {
  const runApify = shouldRunApify();
  let apifyEventCount = 0;
  let runId: string | undefined;

  if (runApify) {
    logPhase("Starting Apify actor run...");
    runId = await startApifyActorRun();
  } else {
    logPhase("Skipping Apify today - rest day.");
  }

  const puppeteerEventCount = await collectPuppeteerEvents();
  logPhase(`Added ${puppeteerEventCount} Puppeteer events.`);

  if (runApify && runId) {
    const datasetId = await waitForActorRun(runId);
    apifyEventCount = await collectApifyEvents(datasetId);
    logPhase(`Added ${apifyEventCount} Apify event.`);
  }

  cleanEventsFile();

  if (runApify && apifyEventCount === 0) {
    warnPhase("Apify returned no events. Keeping events from the previous run.");
  }

  if (puppeteerEventCount === 0) {
    throw new Error(
      `No events collected from any of the ${TARGET_SOURCES.length} Puppeteer sources.`,
    );
  }

  logPhase(`Done! ${eventCount()} events in file.`);
}

main();
