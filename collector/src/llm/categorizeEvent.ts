import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import type { Event } from "../../../types/Event";
import { CATEGORY_SLUGS } from "../../../types/categories";
import { structuredLlmCall } from "./structuredLlmCall.js";

const PROMPTS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "prompts");
const SYSTEM_PROMPT = readFileSync(resolve(PROMPTS_DIR, "categorize-event.md"), "utf-8");

const CategorySchema = z.object({
  category: z.enum(CATEGORY_SLUGS),
});

export async function categorizeEvent(title: string, description: string): Promise<Event["category"]> {
  const userMessage = `Title: ${title}\n\nDescription: ${description}`;
  const result = await structuredLlmCall(CategorySchema, SYSTEM_PROMPT, userMessage);
  return result.category;
}
