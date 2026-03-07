import "dotenv/config";
import type { Event } from "../../types/Event.js";
import { TARGET_SOURCES } from "./sources.js";
import { extractEvents } from "./tools/extractEvents.js";
import { formatEvents } from "./llm/formatEvents.js";
import { upsertEvents } from "./tools/writeEvents.js";
import { sortEvents } from "./tools/sortEvents.js";
import { deleteExpiredEvents } from "./tools/deleteExpiredEvents.js";
import { readEventsFile } from "./tools/eventsFile.js";
import { getValidApifyEvents } from "./api/fetchApifyEvents.js";
import { mapApifyEventToEvent } from "./api/mapApifyEventToEvent.js";
import { startApifyActorRun, waitForActorRun } from "./api/runApifyActor.js";
import { shouldRunApify } from "./api/apifyConfig.js";

async function collectPuppeteerEvents(): Promise<number> {
  console.log("Starting puppeteer event collection...");
  const collectedEvents: Event[] = [];

  for (const source of TARGET_SOURCES) {
    console.log(`Processing ${source.name}...`);

    const rawText = await extractEvents(source);
    if (!rawText) {
      console.log(`  Skipping ${source.name} — no content extracted.`);
      continue;
    }

    console.log(`  Extracted content from ${source.url}.`);

    try {
      const events = await formatEvents(source, rawText);
      collectedEvents.push(...events);
      console.log(`  Formatted ${events.length} event(s).`);
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
    console.log(`  Fetched Apify event ${apifyEvent.name}`)
    try {
      const event = await mapApifyEventToEvent(apifyEvent);
      collectedEvents.push(event);
      console.log(`  Mapped event with category ${event.category}`);
    } catch (error) {
      console.warn(`  Failed to map Apify event "${apifyEvent.name}":`, error);
    }
  }

  await upsertEvents(collectedEvents);
  return collectedEvents.length;
}

async function main() {
  const runApify = shouldRunApify();
  let apifyEventCount = 0;
  let runId: string | undefined;

  if (runApify) {
    console.log("Starting Apify actor run...");
    runId = await startApifyActorRun();
  } else {
    console.log("Skipping Apify today. Previous events preserved.");
  }

  const puppeteerEventCount = await collectPuppeteerEvents();

  if (runApify && runId) {
    const datasetId = await waitForActorRun(runId);
    apifyEventCount = await collectApifyEvents(datasetId);
  }

  deleteExpiredEvents();
  sortEvents();

  const apifyFailed = runApify && apifyEventCount === 0;
  if (puppeteerEventCount === 0 || apifyFailed) {
    throw new Error(
      `Collection incomplete — puppeteer: ${puppeteerEventCount}, apify: ${apifyEventCount} (ran: ${runApify}). Events not updated.`
    );
  }

  const savedEventCount = readEventsFile().events.length;
  console.log(`Done! ${savedEventCount} events saved to file.`);
}

main();
