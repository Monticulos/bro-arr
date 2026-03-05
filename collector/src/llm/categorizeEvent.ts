import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { ChatMistralAI } from "@langchain/mistralai";
import { z } from "zod";
import type { Event } from "../types.js";

const CategorySchema = z.object({
  category: z.enum(["musikk", "stand-up", "kino", "annet"]),
});

const PROMPTS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "prompts");
const SYSTEM_PROMPT = readFileSync(resolve(PROMPTS_DIR, "categorize-event.md"), "utf-8");

export async function categorizeEvent(title: string, description: string): Promise<Event["category"]> {
  const llm = new ChatMistralAI({ model: "mistral-small-latest", temperature: 0 });
  const structuredLlm = llm.withStructuredOutput(CategorySchema);

  const result = await structuredLlm.invoke([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Title: ${title}\n\nDescription: ${description}` },
  ]);

  return result.category;
}
