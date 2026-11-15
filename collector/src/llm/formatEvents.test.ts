import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatEvents } from "./formatEvents.js";
import type { Source } from "../sources.js";

const { structuredLlmCall } = vi.hoisted(() => ({
  structuredLlmCall: vi.fn(),
}));

vi.mock("./structuredLlmCall.js", () => ({ structuredLlmCall }));

const SOURCE: Source = { name: "Cash bar", url: "https://cashbar.no" };

const EXTRACTED_EVENT = {
  title: "Humorquiz",
  description: "Quiz med premier.",
  startDate: "2026-03-07T18:00:00",
  location: "Cash bar",
  url: "https://cashbar.no/quiz",
};

describe("formatEvents", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T12:00:00Z"));
    structuredLlmCall.mockResolvedValue({ events: [EXTRACTED_EVENT] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("returns an uncategorized event with a UTC converted extraction", async () => {
    const events = await formatEvents(SOURCE, "Humorquiz 7. mars kl 18:00");

    expect(events).toEqual([
      {
        id: "Cash-bar-2026-03-07T17:00:00.000Z",
        title: "Humorquiz",
        description: "Quiz med premier.",
        startDate: "2026-03-07T17:00:00.000Z",
        location: "Cash bar",
        url: "https://cashbar.no/quiz",
        collectedAt: "2026-03-01T12:00:00.000Z",
      },
    ]);
  });

  it("returns every extracted event", async () => {
    structuredLlmCall.mockResolvedValue({
      events: [EXTRACTED_EVENT, { ...EXTRACTED_EVENT, title: "Konsert" }],
    });

    const events = await formatEvents(SOURCE, "Noe tekst");

    expect(events.map((event) => event.title)).toEqual([
      "Humorquiz",
      "Konsert",
    ]);
  });

  it("tells the model today's date, so dates without a year are not guessed", async () => {
    await formatEvents(SOURCE, "Noe tekst");

    expect(structuredLlmCall).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.stringContaining("Today's date: 1. mars 2026"),
    );
  });

  it("returns no events without asking the model when the source has no text", async () => {
    const events = await formatEvents(SOURCE, "");

    expect(events).toEqual([]);
    expect(structuredLlmCall).not.toHaveBeenCalled();
  });
});
