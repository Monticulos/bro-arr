import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatEvents } from "./formatEvents.js";
import type { Source } from "../sources.js";

const { structuredLlmCall, categorizeEvent } = vi.hoisted(() => ({
  structuredLlmCall: vi.fn(),
  categorizeEvent: vi.fn(),
}));

vi.mock("./structuredLlmCall.js", () => ({ structuredLlmCall }));
vi.mock("../decisions/categorizeEvent.js", () => ({ categorizeEvent }));

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
    categorizeEvent.mockResolvedValue("quiz");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("returns an event with a categorized and UTC converted extraction", async () => {
    const events = await formatEvents(SOURCE, "Humorquiz 7. mars kl 18:00");

    expect(events).toEqual([
      {
        id: "Cash-bar-2026-03-07T17:00:00.000Z",
        title: "Humorquiz",
        description: "Quiz med premier.",
        category: "quiz",
        startDate: "2026-03-07T17:00:00.000Z",
        location: "Cash bar",
        url: "https://cashbar.no/quiz",
        collectedAt: "2026-03-01T12:00:00.000Z",
      },
    ]);
  });

  it("categorizes every extracted event", async () => {
    structuredLlmCall.mockResolvedValue({
      events: [EXTRACTED_EVENT, { ...EXTRACTED_EVENT, title: "Konsert" }],
    });

    await formatEvents(SOURCE, "Noe tekst");

    expect(categorizeEvent).toHaveBeenCalledTimes(2);
    expect(categorizeEvent).toHaveBeenCalledWith(EXTRACTED_EVENT);
  });

  it("tells the model today's date, so dates without a year are not guessed", async () => {
    await formatEvents(SOURCE, "Noe tekst");

    expect(structuredLlmCall).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.stringContaining("Today's date: 1. mars 2026"),
    );
  });

  it("returns no events without asking the models when the source has no text", async () => {
    const events = await formatEvents(SOURCE, "");

    expect(events).toEqual([]);
    expect(structuredLlmCall).not.toHaveBeenCalled();
    expect(categorizeEvent).not.toHaveBeenCalled();
  });
});
