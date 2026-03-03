import { describe, it, expect, vi } from "vitest";
import { formatEvents } from "./formatEvents.js";
import type { Source } from "../sources.js";

vi.mock("@langchain/mistralai", () => ({
  ChatMistralAI: vi.fn().mockImplementation(() => ({
    withStructuredOutput: vi.fn().mockReturnValue({
      invoke: vi.fn().mockResolvedValue({
        events: [
          {
            id: "kred-konsert-2026-03-15",
            title: "Konsert",
            description: "En konsert på Kred",
            category: "musikk",
            dateTime: "2026-03-15T20:00:00",
            location: "Kred",
            url: "https://www.cafekred.no/arrangementer",
            collectedAt: "2026-03-01T12:00:00.000Z",
          },
        ],
      }),
    }),
  })),
}));

const testSource: Source = {
  url: "https://www.cafekred.no/arrangementer",
  name: "Kred",
  selector: ".slides",
};

describe("formatEvents", () => {
  it("returns empty array for empty rawText", async () => {
    const result = await formatEvents(testSource, "");
    expect(result).toEqual([]);
  });

  it("returns events from LLM structured output", async () => {
    const result = await formatEvents(testSource, "Some page content about a concert");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Konsert");
    expect(result[0].category).toBe("musikk");
    expect(result[0].dateTime).toBe("2026-03-15T20:00:00");
  });
});
