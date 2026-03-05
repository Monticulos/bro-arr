import "dotenv/config";
import { TARGET_SOURCES } from "./sources.js";
import { deleteSavedEvents } from "./tools/deleteSavedEvents.js";
import { extractEvents } from "./tools/extractEvents.js";
import { formatEvents } from "./llm/formatEvents.js";
import { writeEvents } from "./tools/writeEvents.js";
import { sortEvents } from "./tools/sortEvents.js";
import { deleteExpiredEvents } from "./tools/deleteExpiredEvents.js";
import { readEventsFile } from "./tools/eventsFile.js";
import { fetchApifyEvents } from "./api/fetchApifyEvents.js";
import { mapApifyEventToEvent } from "./api/mapApifyEventToEvent.js";

async function main() {
  deleteSavedEvents();
    
  console.log("Starting event collection...");

  for (const source of TARGET_SOURCES) {
    console.log(`Processing: ${source.name}...`);

    const rawText = await extractEvents(source);
    if (!rawText) {
      console.log(`  Skipping ${source.name} — no content extracted.`);
      continue;
    }

    console.log(`  Extracted content from ${source.url}.`)

    const events = await formatEvents(source, rawText);
    await writeEvents(events);

    console.log(`  Formatted and saved ${events.length} event(s).`);
  }

  console.log("Fetching Apify events...");

  const apifyEvents = await fetchApifyEvents();
  for (const apifyEvent of apifyEvents.filter((e) => !e.isPast)) {
    const event = await mapApifyEventToEvent(apifyEvent);
    await writeEvents([event]);
    console.log(`  Saved Apify event: ${event.title}`);
  }

  sortEvents();
  deleteExpiredEvents();

  const savedEventCount = readEventsFile().events.length;
  if (savedEventCount === 0) {
    throw new Error("No events were collected from any source.");
  }
  
  console.log(`Done! ${savedEventCount} events saved to file.`);
}

main();
