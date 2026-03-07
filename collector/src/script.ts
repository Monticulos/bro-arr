import "dotenv/config";
import type { Event } from "../../types/Event.js";
import { TARGET_SOURCES } from "./sources.js";
import { extractEvents } from "./tools/extractEvents.js";
import { formatEvents } from "./llm/formatEvents.js";
import { upsertEvents } from "./tools/upsertEvents.js";
import { sortEvents } from "./tools/sortEvents.js";
import { deleteExpiredEvents } from "./tools/deleteExpiredEvents.js";
import { deleteDuplicateEvents } from "./tools/deleteDuplicateEvents.js";
import { readEventsFile, writeEventsFile, eventCount } from "./tools/eventsFile.js";
import { getValidApifyEvents } from "./api/fetchApifyEvents.js";
import { mapApifyEventToEvent } from "./api/mapApifyEventToEvent.js";
import { startApifyActorRun, waitForActorRun } from "./api/runApifyActor.js";
import { shouldRunApify } from "./api/apifyConfig.js";

async function collectPuppeteerEvents(): Promise<number> {
  console.log("Starting Puppeteer event collection.");
  const collectedEvents: Event[] = [];

  for (const source of TARGET_SOURCES) {
    console.log(`Processing ${source.name}...`);

    const rawText = await extractEvents(source);
    if (!rawText) {
      console.log(`  Skipping ${source.name} - no content extracted.`);
      continue;
    }

    console.log(`  Extracted content from ${source.url}.`);

    try {
      const events = await formatEvents(source, rawText);
      collectedEvents.push(...events);
      console.log(`  Formatted ${events.length} events.`);
    } catch (error) {
      console.warn(`  Failed to format events from ${source.name}:`, error);
    }
  }

  await upsertEvents(collectedEvents);
  return collectedEvents.length;
}

async function collectApifyEvents(datasetId: string): Promise<number> {
  console.log("Fetching Apify events...");
  const collectedEvents: Event[] = [];

  const apifyEvents = await getValidApifyEvents(datasetId);
  for (const apifyEvent of apifyEvents) {
    console.log(`  Fetched Apify event ${apifyEvent.name}.`);
    try {
      const event = await mapApifyEventToEvent(apifyEvent);
      collectedEvents.push(event);
      console.log(`  Mapped event with category ${event.category}.`);
    } catch (error) {
      console.warn(`  Failed to map Apify event "${apifyEvent.name}":`, error);
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
    console.log("Starting Apify actor run...");
    runId = await startApifyActorRun();
  } else {
    console.log("Skipping Apify today - rest day.");
  }

  const puppeteerEventCount = await collectPuppeteerEvents();
  console.log(`Added ${puppeteerEventCount} Puppeteer event.`);

  if (runApify && runId) {
    const datasetId = await waitForActorRun(runId);
    apifyEventCount = await collectApifyEvents(datasetId);
    console.log(`Added ${apifyEventCount} Apify event.`);
  }

  cleanEventsFile();

  const apifyFailed = runApify && apifyEventCount === 0;
  if (puppeteerEventCount === 0 || apifyFailed) {
    throw new Error(
      `Collection incomplete — puppeteer: ${puppeteerEventCount}, apify: ${apifyEventCount} (ran: ${runApify}). Events not updated.`
    );
  }

  console.log(`Done! ${eventCount()} events in file.`);
}

main();
