import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import type { Event } from "../../../types/Event";
import type { Source } from "../sources.js";
import { CATEGORY_SLUGS } from "../../../types/categories";
import { generateEventId } from "../utils/generateEventId.js";
import { norwegianTimeToUtc } from "../utils/norwegianTimeToUtc.js";
import { structuredLlmCall } from "./structuredLlmCall.js";

const PROMPTS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "prompts");
const SYSTEM_PROMPT = readFileSync(resolve(PROMPTS_DIR, "format-events.md"), "utf-8");

const EventSchema = z.object({
  title: z.string().describe("Event title only. Must not contain dates, times, or weekday names"),
  description: z.string().describe("Description as is from source. If missing, use event title without dates, times, or weekday names"),
  category: z.enum(CATEGORY_SLUGS),
  startDate: z.string().describe("ISO 8601 datetime in Norwegian local time without Z suffix, e.g. 2026-03-07T18:00:00"),
  location: z.string().optional().describe("The event location, usually the source name"),
  url: z.string().optional().describe("The url to the individual event, unless it is a Brønnøy kino event. If so, it should be the source url"),
});

const EventsResponseSchema = z.object({
  events: z.array(EventSchema),
});

export async function formatEvents(source: Source, rawText: string): Promise<Event[]> {
  if (!rawText) return [];

  const userMessage = `Source: ${source.name}\nSource URL: ${source.url}\n\n${rawText}`;
  const result = await structuredLlmCall(EventsResponseSchema, SYSTEM_PROMPT, userMessage);

  return result.events.map((event) => toEvent(event, source.name));
}

type LlmEvent = z.infer<typeof EventSchema>;

function toEvent(llmEvent: LlmEvent, sourceName: string): Event {
  const utcStartDate = norwegianTimeToUtc(llmEvent.startDate);
  return {
    ...llmEvent,
    id: generateEventId(sourceName, utcStartDate),
    startDate: utcStartDate,
    collectedAt: new Date().toISOString(),
  };
}
