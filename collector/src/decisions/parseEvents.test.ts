import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseEvents } from "./parseEvents.js";
import type { Piece } from "../puppeteer/readEventPieces.js";
import type { Source } from "../sources.js";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock("./DecisionModel.js", () => ({
  DecisionModel: class {
    create = create;
  },
}));

const NOW = new Date("2026-11-10T09:00:00.000Z");

const KINO: Source = {
  url: "https://www.bronnoy.kommune.no/kino/",
  name: "Brønnøy kino",
  selector: ".InnholdTabell",
};

const KIRKE: Source = {
  url: "https://www.bronnoy.kirken.no/Kalender",
  name: "Brønnøy kirke",
  selector: ".calendar",
};

const KINO_PIECES: Piece[] = [
  { tag: "th", text: "Kino", block: 0 },
  { tag: "th", text: "Dato", block: 1 },
  { tag: "a", text: "Ebenezer (Premerie)", block: 2 },
  { tag: "span", text: "13.11.26 kl. 20:00", block: 2 },
  { tag: "span", text: "Siste dag *", block: 3 },
];

const KINO_FIELDS = ["other", "other", "title", "date", "other"];

/** One calendar item holding a whole day, the way the church writes two services under one date. */
const KIRKE_DAY_PIECES: Piece[] = [
  { tag: "div", text: "29.11", block: 0 },
  { tag: "div", text: "kl.11.00", block: 0 },
  { tag: "a", text: "Gudstjeneste", href: `${KIRKE.url}?EventId=aaa`, block: 0 },
  { tag: "span", text: "Brønnøy kirke", block: 0 },
  { tag: "div", text: "kl.15.00", block: 0 },
  { tag: "a", text: "Julekonsert", href: `${KIRKE.url}?EventId=bbb`, block: 0 },
  { tag: "span", text: "Velfjord kirke", block: 0 },
];

const KIRKE_DAY_FIELDS = [
  "date",
  "startTime",
  "title",
  "location",
  "startTime",
  "title",
  "location",
];

/** Two cards whose pieces do not line up, which is where a nearest-title guess drifts across them. */
const UNEVEN_CARDS: Piece[] = [
  { tag: "h3", text: "Naturtreff", block: 0 },
  { tag: "span", text: "2.12", block: 0 },
  { tag: "time", text: "19:00", block: 0 },
  { tag: "time", text: "20:30", block: 0 },
  { tag: "h3", text: "Barseltreff", block: 1 },
  { tag: "span", text: "8.12", block: 1 },
  { tag: "time", text: "11:00", block: 1 },
  { tag: "time", text: "14:00", block: 1 },
  { tag: "span", text: "Brønnøy bibliotek", block: 1 },
];

const UNEVEN_FIELDS = [
  "title",
  "date",
  "startTime",
  "endTime",
  "title",
  "date",
  "startTime",
  "endTime",
  "location",
];

/** A model answer per piece, where null stands for a piece the model refused to label. */
function answered(listsEvents: number, fields: (string | null)[], confidence = 0.9) {
  return {
    answers: {
      listsEvents: { type: "noul", noul: listsEvents },
      ...Object.fromEntries(
        fields.flatMap((field, index) =>
          field === null
            ? []
            : [[`piece${index + 1}`, { type: "choice", choice: field, confidence }]],
        ),
      ),
    },
  };
}

describe("parseEvents", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    create.mockReset().mockResolvedValue(answered(0.9, []));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("builds an event out of the pieces the model labeled", async () => {
    create.mockResolvedValue(answered(0.99, KINO_FIELDS));

    const events = await parseEvents(KINO, KINO_PIECES);

    expect(events).toEqual([
      {
        id: "Brønnøy-kino-2026-11-13T19:00:00.000Z",
        title: "Ebenezer (Premerie)",
        description: "Ebenezer (Premerie)",
        startDate: "2026-11-13T19:00:00.000Z",
        location: "Brønnøy kino",
        url: KINO.url,
        collectedAt: NOW.toISOString(),
      },
    ]);
  });

  it("asks about the page and every piece of it in a single request", async () => {
    await parseEvents(KINO, KINO_PIECES);

    expect(create).toHaveBeenCalledTimes(1);
    const [{ state, questions }] = create.mock.calls[0];

    expect(state).toEqual({
      source: KINO.name,
      piece1: { tag: "th", text: "Kino" },
      piece2: { tag: "th", text: "Dato" },
      piece3: { tag: "a", text: "Ebenezer (Premerie)" },
      piece4: { tag: "span", text: "13.11.26 kl. 20:00" },
      piece5: { tag: "span", text: "Siste dag *" },
    });
    expect(questions.piece3.instructions).toContain("piece3");
    expect(Object.keys(questions)).toEqual([
      "listsEvents",
      "piece1",
      "piece2",
      "piece3",
      "piece4",
      "piece5",
    ]);
    expect(questions.listsEvents.type).toBe("noul");
    expect(questions.piece3.type).toBe("choice");
  });

  it("splits one long list into an event per title", async () => {
    create.mockResolvedValue(answered(0.97, KIRKE_DAY_FIELDS));

    const events = await parseEvents(KIRKE, KIRKE_DAY_PIECES);

    expect(events).toEqual([
      expect.objectContaining({
        title: "Gudstjeneste",
        startDate: "2026-11-29T10:00:00.000Z",
        location: "Brønnøy kirke",
        url: `${KIRKE.url}?EventId=aaa`,
      }),
      expect.objectContaining({
        title: "Julekonsert",
        startDate: "2026-11-29T14:00:00.000Z",
        location: "Velfjord kirke",
        url: `${KIRKE.url}?EventId=bbb`,
      }),
    ]);
  });

  it("gives an event without a date of its own the day written above it", async () => {
    create.mockResolvedValue(answered(0.97, KIRKE_DAY_FIELDS));

    const [, second] = await parseEvents(KIRKE, KIRKE_DAY_PIECES);

    expect(second.startDate).toBe("2026-11-29T14:00:00.000Z");
  });

  it("keeps a card's pieces out of the card next to it", async () => {
    create.mockResolvedValue(answered(0.95, UNEVEN_FIELDS));

    const events = await parseEvents(KIRKE, UNEVEN_CARDS);

    expect(events).toEqual([
      expect.objectContaining({
        title: "Naturtreff",
        startDate: "2026-12-02T18:00:00.000Z",
        endDate: "2026-12-02T19:30:00.000Z",
      }),
      expect.objectContaining({
        title: "Barseltreff",
        startDate: "2026-12-08T10:00:00.000Z",
        endDate: "2026-12-08T13:00:00.000Z",
      }),
    ]);
  });

  it("takes the venue a page writes after the word introducing it", async () => {
    const pieces: Piece[] = [
      { tag: "h3", text: "Barseltreff", block: 0 },
      { tag: "span", text: "17.11", block: 0 },
      { tag: "span", text: "Plassering", block: 0 },
      { tag: "span", text: "Kefas", block: 0 },
    ];
    create.mockResolvedValue(
      answered(0.9, ["title", "date", "location", "location"]),
    );

    const [event] = await parseEvents(KIRKE, pieces);

    expect(event.location).toBe("Kefas");
  });

  it("gives a location the name the site uses for that venue", async () => {
    const pieces: Piece[] = [
      { tag: "span", text: "17.11", block: 0 },
      { tag: "span", text: "Barseltreff", block: 0 },
      { tag: "span", text: "Brønnøy bibliotek Brønnøysund", block: 0 },
    ];
    create.mockResolvedValue(answered(0.9, ["date", "title", "location"]));

    const [event] = await parseEvents(KIRKE, pieces);

    expect(event.location).toBe("Brønnøy bibliotek");
  });

  it("gives an event an end when the page writes a closing time", async () => {
    const pieces: Piece[] = [
      { tag: "span", text: "17.11", block: 0 },
      { tag: "span", text: "Barseltreff", block: 0 },
      { tag: "time", text: "11:00", block: 0 },
      { tag: "time", text: "14:00", block: 0 },
    ];
    create.mockResolvedValue(
      answered(0.9, ["date", "title", "startTime", "endTime"]),
    );

    const [event] = await parseEvents(KIRKE, pieces);

    expect(event.startDate).toBe("2026-11-17T10:00:00.000Z");
    expect(event.endDate).toBe("2026-11-17T13:00:00.000Z");
  });

  it.each([
    ["no closing time was found", "other"],
    ["the closing time is not after the start", "endTime"],
  ])("leaves an event without an end when %s", async (_, lastField) => {
    const pieces: Piece[] = [
      { tag: "span", text: "17.11", block: 0 },
      { tag: "span", text: "Barseltreff", block: 0 },
      { tag: "time", text: "14:00", block: 0 },
      { tag: "time", text: "11:00", block: 0 },
    ];
    create.mockResolvedValue(
      answered(0.9, ["date", "title", "startTime", lastField]),
    );

    const [event] = await parseEvents(KIRKE, pieces);

    expect(event.endDate).toBeUndefined();
  });

  it("gives an event its own description when the model found one", async () => {
    create.mockResolvedValue(
      answered(0.97, ["date", "startTime", "title", "description"]),
    );

    const [event] = await parseEvents(KIRKE, KIRKE_DAY_PIECES.slice(0, 4));

    expect(event.description).toBe("Brønnøy kirke");
    expect(event.location).toBe(KIRKE.name);
  });

  it("collects nothing when the page lists no events", async () => {
    create.mockResolvedValue(answered(0.07, KINO_FIELDS));

    expect(await parseEvents(KINO, KINO_PIECES)).toEqual([]);
  });

  it("ignores a piece the model is unsure about", async () => {
    create.mockResolvedValue(answered(0.99, KINO_FIELDS, 0.4));

    expect(await parseEvents(KINO, KINO_PIECES)).toEqual([]);
  });

  it.each([
    ["has no title", ["other", "date"]],
    ["has no answer at all", [null, null]],
  ])("drops an event whose pieces say it %s", async (_, fields) => {
    create.mockResolvedValue(answered(0.9, fields));

    expect(await parseEvents(KINO, KINO_PIECES.slice(2, 4))).toEqual([]);
  });

  it("drops an event whose date cannot be read", async () => {
    const pieces: Piece[] = [{ tag: "p", text: "Konsert en gang", block: 0 }];
    create.mockResolvedValue(answered(0.9, ["title"]));

    expect(await parseEvents(KIRKE, pieces)).toEqual([]);
  });

  it("collects nothing when the decisions api fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    create.mockRejectedValue(new Error("Service unavailable"));

    expect(await parseEvents(KINO, KINO_PIECES)).toEqual([]);
  });
});
