import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { ChatMistralAI } from "@langchain/mistralai";
import { z } from "zod";
import { readEventsFile, writeEventsFile } from "./eventsFile.js";

const EditorResponseSchema = z.object({
  eventIdsToRemove: z.array(z.string()).describe("IDs of duplicate events to remove"),
});

const PROMPTS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "prompts");
const SYSTEM_PROMPT = readFileSync(resolve(PROMPTS_DIR, "editor-agent.md"), "utf-8");

export async function runEditorAgent(): Promise<number> {
  const data = readEventsFile();

  if (data.events.length <= 1) return 0;

  const llm = new ChatMistralAI({ model: "mistral-small-latest", temperature: 0 });
  const structuredLlm = llm.withStructuredOutput(EditorResponseSchema);

  const eventsJson = JSON.stringify(data.events, null, 2);
  const result = await structuredLlm.invoke([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: eventsJson },
  ]);

  const idsToRemove = new Set(result.eventIdsToRemove);
  if (idsToRemove.size === 0) return 0;

  data.events = data.events.filter((event) => !idsToRemove.has(event.id));
  data.updatedAt = new Date().toISOString();
  writeEventsFile(data);
  return idsToRemove.size;
}
