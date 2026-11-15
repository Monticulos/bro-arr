import "dotenv/config";
import type { Event } from "../../shared/types/Event.js";
import { TARGET_SOURCES } from "./sources.js";
import { extractEvents } from "./puppeteer/extractEvents.js";
import { formatEvents } from "./llm/formatEvents.js";
import { categorizeEvents } from "./decisions/categorizeEvents.js";
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

async function collectPuppeteerEvents(): Promise<Event[]> {
  logPhase("Starting Puppeteer event collection...");
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
      logDetail(`Found ${events.length} events.`);
    } catch (error) {
      warnDetail(`Failed to format events from ${source.name}:`, error);
    }
  }

  return collectedEvents;
}

async function collectApifyEvents(
  datasetId: string,
): Promise<Event[]> {
  logPhase("Fetching Apify events...");
  const collectedEvents: Event[] = [];

  const apifyEvents = await getValidApifyEvents(datasetId);
  for (const apifyEvent of apifyEvents) {
    logDetail(`Fetched Apify event ${apifyEvent.name}.`);
    try {
      collectedEvents.push(mapApifyEventToEvent(apifyEvent));
    } catch (error) {
      warnDetail(`Failed to map Apify event "${apifyEvent.name}":`, error);
    }
  }

  return collectedEvents;
}
async function collectApifyEventsOrNone(
  runId: string,
): Promise<Event[]> {
  try {
    return await collectApifyEvents(await waitForActorRun(runId));
  } catch (error) {
    warnPhase("Failed to collect Apify events:", error);
    return [];
  }
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
  let apifyEvents: Event[] = [];
  let runId: string | undefined;

  if (runApify) {
    logPhase("Starting Apify actor run...");
    runId = await startApifyActorRun();
  } else {
    logPhase("Skipping Apify today - rest day.");
  }

  const puppeteerEvents = await collectPuppeteerEvents();
  logPhase(`Collected ${puppeteerEvents.length} Puppeteer events.`);

  if (runApify && runId) {
    apifyEvents = await collectApifyEventsOrNone(runId);
    logPhase(`Collected ${apifyEvents.length} Apify events.`);
  }

  const collectedEvents = [...puppeteerEvents, ...apifyEvents];
  await upsertEvents(
    await categorizeEvents(collectedEvents, readEventsFile().events),
  );

  cleanEventsFile();

  if (runApify && apifyEvents.length === 0) {
    warnPhase("Apify returned no events. Keeping events from the previous run.");
  }

  if (puppeteerEvents.length === 0) {
    throw new Error(
      `No events collected from any of the ${TARGET_SOURCES.length} Puppeteer sources.`,
    );
  }

  logPhase(`Done! ${eventCount()} events in file.`);
}

main();
