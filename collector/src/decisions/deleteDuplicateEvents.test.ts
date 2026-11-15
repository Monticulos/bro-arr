import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { deleteDuplicateEvents } from "./deleteDuplicateEvents.js";
import { createEvent } from "../../../shared/src/test/createEvent";

const { nouls } = vi.hoisted(() => ({ nouls: vi.fn() }));

vi.mock("./DecisionModel.js", () => ({
  DecisionModel: class {
    nouls = nouls;
  },
}));

const APIFY_CONCERT = createEvent({
  id: "27931154943206710",
  title: "Julekonsert med Bugge Wesseltoft",
  description: "Bugge Wesseltoft spiller julesanger i kulturhuset.",
  startDate: "2026-12-03T19:00:00.000Z",
  location: "Brønnøysund kulturhus",
});

const PUPPETEER_CONCERT = createEvent({
  id: "kulturhuset-2026-12-03T20:00:00.000Z",
  title: "Bugge Wesseltoft - julekonsert",
  description: "Julekonsert med Bugge Wesseltoft.",
  startDate: "2026-12-03T20:00:00.000Z",
  location: "Kulturhuset",
});

const PUPPETEER_CHURCH_SERVICE = createEvent({
  id: "bronnoy-kirke-2026-12-06T10:00:00.000Z",
  title: "Gudstjeneste",
  description: "Gudstjeneste med dåp.",
  startDate: "2026-12-06T10:00:00.000Z",
  location: "Brønnøy kirke",
});

describe("deleteDuplicateEvents", () => {
  beforeEach(() => {
    nouls.mockReset();
    nouls.mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("deletes the Puppeteer event when the model says the pair is the same event", async () => {
    nouls.mockResolvedValue({ pair1: 0.95 });

    const events = await deleteDuplicateEvents([APIFY_CONCERT, PUPPETEER_CONCERT]);

    expect(events).toEqual([APIFY_CONCERT]);
  });

  it("asks about every pair starting the same day in a single call, describing both events", async () => {
    await deleteDuplicateEvents([
      APIFY_CONCERT,
      PUPPETEER_CONCERT,
      PUPPETEER_CHURCH_SERVICE,
    ]);

    expect(nouls).toHaveBeenCalledTimes(1);
    expect(nouls).toHaveBeenCalledWith(
      { pair1: expect.stringContaining("pair1") },
      {
        pair1: {
          first: {
            title: APIFY_CONCERT.title,
            description: APIFY_CONCERT.description,
            startDate: APIFY_CONCERT.startDate,
            location: APIFY_CONCERT.location,
          },
          second: {
            title: PUPPETEER_CONCERT.title,
            description: PUPPETEER_CONCERT.description,
            startDate: PUPPETEER_CONCERT.startDate,
            location: PUPPETEER_CONCERT.location,
          },
        },
      },
    );
  });

  it.each([
    ["is not sure enough", { pair1: 0.4 }],
    ["gives no answer", { pair1: null }],
    ["does not answer the question", {}],
  ])("keeps both events when the model %s", async (_, answers) => {
    nouls.mockResolvedValue(answers);

    const events = await deleteDuplicateEvents([APIFY_CONCERT, PUPPETEER_CONCERT]);

    expect(events).toEqual([APIFY_CONCERT, PUPPETEER_CONCERT]);
  });

  it.each([
    ["the events start on different days", [APIFY_CONCERT, PUPPETEER_CHURCH_SERVICE]],
    [
      "both events come from apify",
      [APIFY_CONCERT, createEvent({ ...PUPPETEER_CONCERT, id: "88112233445566" })],
    ],
  ])("asks nothing when %s", async (_, events) => {
    const remaining = await deleteDuplicateEvents(events);

    expect(nouls).not.toHaveBeenCalled();
    expect(remaining).toEqual(events);
  });

  it("keeps every event when the decisions api fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    nouls.mockRejectedValue(new Error("Service unavailable"));

    const events = await deleteDuplicateEvents([APIFY_CONCERT, PUPPETEER_CONCERT]);

    expect(events).toEqual([APIFY_CONCERT, PUPPETEER_CONCERT]);
  });
});
