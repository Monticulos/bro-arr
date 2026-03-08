import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { ChatMistralAI } from "@langchain/mistralai";
import { z } from "zod";
import type { Event } from "../../../types/Event";
import type { Source } from "../sources.js";
import { CATEGORY_SLUGS } from "../../../types/categories";
import { generateEventId } from "../tools/generateEventId.js";
import { norwegianTimeToUtc } from "../tools/norwegianTimeToUtc.js";

const EventSchema = z.object({
  title: z.string().describe("Event title only. Must not contain dates, times, or weekday names"),
  description: z.string().describe("Description as is from source. If missing, use event title without dates, times, or weekday names"),
  category: z.enum(CATEGORY_SLUGS),
  dateTime: z.string().describe("ISO 8601 datetime in Norwegian local time without Z suffix, e.g. 2026-03-07T18:00:00"),
  location: z.string().optional().describe("The event location, usually the source name"),
  url: z.string().optional().describe("The url to the individual event, unless it is a Brønnøy kino event. If so, it should be the source url"),
});

const EventsResponseSchema = z.object({
  events: z.array(EventSchema),
});

const PROMPTS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "prompts");
const SYSTEM_PROMPT = readFileSync(resolve(PROMPTS_DIR, "format-events.md"), "utf-8");

export async function formatEvents(source: Source, rawText: string): Promise<Event[]> {
  if (!rawText) return [];

  const llm = new ChatMistralAI({ model: "mistral-small-latest", temperature: 0 });
  const structuredLlm = llm.withStructuredOutput(EventsResponseSchema);

  const result = await structuredLlm.invoke([
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Source: ${source.name}\nSource URL: ${source.url}\n\n${rawText}`,
    },
  ]);

  return result.events.map((event) => toEvent(event, source.name));
}

type LlmEvent = z.infer<typeof EventSchema>;

function toEvent(llmEvent: LlmEvent, sourceName: string): Event {
  const utcDateTime = norwegianTimeToUtc(llmEvent.dateTime);
  return {
    ...llmEvent,
    id: generateEventId(sourceName, utcDateTime),
    dateTime: utcDateTime,
    collectedAt: new Date().toISOString(),
  };
}
