import { ChatMistralAI } from "@langchain/mistralai";
import type { z } from "zod";

const LLM_MODEL = "mistral-small-latest";
const LLM_TEMPERATURE = 0;

export async function structuredLlmCall<T>(
  schema: z.ZodType<T>,
  systemPrompt: string,
  userMessage: string
): Promise<T> {
  const llm = new ChatMistralAI({ model: LLM_MODEL, temperature: LLM_TEMPERATURE });
  const structuredLlm = llm.withStructuredOutput(schema);
  const result = await structuredLlm.invoke([
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ]);
  return result as T;
}
