import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseEvents } from "./parseEvents.js";
import type { Line } from "../puppeteer/readPageLines.js";
import type { Source } from "../sources.js";

const { nouls, choices } = vi.hoisted(() => ({
  nouls: vi.fn(),
  choices: vi.fn(),
}));

vi.mock("./DecisionModel.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./DecisionModel.js")>()),
  DecisionModel: class {
    nouls = nouls;
    choices = choices;
  },
}));

const NOW = new Date("2026-11-10T09:00:00.000Z");

/** Lines printed evenly down the page, the way one part of it reads. */
const LINE_SPACING = 30;
function printed(texts: Omit<Line, "top">[]): Line[] {
  return texts.map((line, index) => ({ ...line, top: index * LINE_SPACING }));
}
const KINO: Source = {
  url: "https://www.bronnoy.kommune.no/kino/",
  name: "Brønnøy kino",
};

const KIRKE: Source = {
  url: "https://www.bronnoy.kirken.no/Kalender",
  name: "Brønnøy kirke",
};

const KINO_LINES: Line[] = printed([
  { text: "Kino Dato" },
  { text: "Ebenezer (Premerie) 13.11.26 kl. 20:00" },
]);

/** The church writes the day once, then a time, a title and a venue per service under it. */
const KIRKE_DAY_LINES: Line[] = printed([
  { text: "Søndag 29.11" },
  { text: "kl.11.00" },
  { text: "Gudstjeneste", href: `${KIRKE.url}?EventId=aaa` },
  { text: "Brønnøy kirke" },
  { text: "kl.15.00" },
  { text: "Julekonsert", href: `${KIRKE.url}?EventId=bbb` },
  { text: "Velfjord kirke" },
]);

/** Answers question one: which lines begin an event. */
function startsOn(...lineNumbers: number[]) {
  return (questions: Record<string, unknown>) =>
    Object.fromEntries(
      Object.keys(questions).map((key) => [
        key,
        lineNumbers.includes(Number(key.replace("line", ""))) ? 0.9 : 0.05,
      ]),
    );
}

/** Answers question two: what each line says, by line number. */
function saying(fields: Record<number, string>, confidence = 0.9) {
  return (questions: Record<string, unknown>) =>
    Object.fromEntries(
      Object.keys(questions).map((key) => [
        key,
        fields[Number(key.replace("line", ""))]
          ? {
              type: "choice",
              choice: fields[Number(key.replace("line", ""))],
              confidence,
            }
          : null,
      ]),
    );
}

/** Answers question three: every assembled event is real unless told otherwise. */
function allReal(questions: Record<string, unknown>) {
  return Object.fromEntries(Object.keys(questions).map((key) => [key, 0.9]));
}

describe("parseEvents", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    nouls.mockReset().mockImplementation(allReal);
    choices.mockReset().mockImplementation(saying({}));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("builds an event out of the lines the model labeled", async () => {
    nouls
      .mockImplementationOnce(startsOn(2))
      .mockImplementationOnce(allReal);
    choices.mockImplementation(saying({ 1: "other", 2: "title", 3: "date" }));

    const events = await parseEvents(KINO, printed([
      { text: "Kino Dato" },
      { text: "Ebenezer (Premerie)" },
      { text: "13.11.26 kl. 20:00" },
    ]));

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

  it("asks where events start and what each line says, sharing one state", async () => {
    nouls.mockImplementationOnce(startsOn(2)).mockImplementationOnce(allReal);
    choices.mockImplementation(saying({ 2: "title", 3: "date" }));

    await parseEvents(KINO, printed([
      { text: "Kino Dato" },
      { text: "Ebenezer (Premerie)" },
      { text: "13.11.26 kl. 20:00" },
    ]));

    const [startQuestions, startState] = nouls.mock.calls[0];
    const [, , fieldState] = choices.mock.calls[0];

    expect(Object.keys(startQuestions)).toEqual(["line1", "line2", "line3"]);
    expect(startState).toEqual({
      source: KINO.name,
      line1: "Kino Dato",
      line2: "Ebenezer (Premerie)",
      line3: "13.11.26 kl. 20:00",
    });
    expect(fieldState).toEqual(startState);
  });

  it("throws away the lines above the first event", async () => {
    nouls.mockImplementationOnce(startsOn(2)).mockImplementationOnce(allReal);
    choices.mockImplementation(saying({ 1: "title", 2: "title", 3: "date" }));

    const events = await parseEvents(KINO, printed([
      { text: "Hopp til innhold" },
      { text: "Ebenezer (Premerie)" },
      { text: "13.11.26 kl. 20:00" },
    ]));

    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("Ebenezer (Premerie)");
  });

  it("starts a new event on every line that says so, inside one calendar day", async () => {
    nouls.mockImplementationOnce(startsOn(1, 5)).mockImplementationOnce(allReal);
    choices.mockImplementation(
      saying({
        1: "date",
        2: "startTime",
        3: "title",
        4: "location",
        5: "startTime",
        6: "title",
        7: "location",
      }),
    );

    const events = await parseEvents(KIRKE, KIRKE_DAY_LINES);

    expect(events).toEqual([
      expect.objectContaining({
        title: "Gudstjeneste",
        startDate: "2026-11-29T10:00:00.000Z",
        location: "Brønnøy kirke",
        url: `${KIRKE.url}?EventId=aaa`,
      }),
      expect.objectContaining({
        title: "Julekonsert",
        location: "Velfjord kirke",
        url: `${KIRKE.url}?EventId=bbb`,
      }),
    ]);
  });

  it("gives an event without a date of its own the day written above it", async () => {
    nouls.mockImplementationOnce(startsOn(1, 5)).mockImplementationOnce(allReal);
    choices.mockImplementation(
      saying({
        1: "date",
        2: "startTime",
        3: "title",
        4: "location",
        5: "startTime",
        6: "title",
        7: "location",
      }),
    );

    const [, second] = await parseEvents(KIRKE, KIRKE_DAY_LINES);

    expect(second.startDate).toBe("2026-11-29T14:00:00.000Z");
  });

  it("ends an event where the page opens up, so the footer stays out of it", async () => {
    nouls.mockImplementationOnce(startsOn(1)).mockImplementationOnce(allReal);
    choices.mockImplementation(
      saying({ 1: "title", 2: "date", 3: "location", 4: "location" }),
    );

    const [event] = await parseEvents(KINO, [
      { text: "Ebenezer (Premerie)", top: 0 },
      { text: "13.11.26 kl. 20:00", top: 30 },
      { text: "Brønnøy kino", top: 60 },
      { text: "8905 Brønnøysund", top: 900 },
    ]);

    expect(event.location).toBe("Brønnøy kino");
  });

  it("drops an event the model says is not one", async () => {
    nouls
      .mockImplementationOnce(startsOn(1))
      .mockImplementationOnce(() => ({ event1: 0.04 }));
    choices.mockImplementation(saying({ 1: "title", 2: "date" }));

    const events = await parseEvents(KINO, printed([
      { text: "Voksenvaksinasjon 2026" },
      { text: "11.11.2026" },
    ]));

    expect(events).toEqual([]);
  });

  it("takes the venue a page writes after the word introducing it", async () => {
    nouls.mockImplementationOnce(startsOn(1)).mockImplementationOnce(allReal);
    choices.mockImplementation(
      saying({ 1: "title", 2: "date", 3: "location", 4: "location" }),
    );

    const [event] = await parseEvents(KIRKE, printed([
      { text: "Barseltreff" },
      { text: "17.11" },
      { text: "Plassering" },
      { text: "Kefas" },
    ]));

    expect(event.location).toBe("Kefas");
  });

  it("gives a location the name the site uses for that venue", async () => {
    nouls.mockImplementationOnce(startsOn(1)).mockImplementationOnce(allReal);
    choices.mockImplementation(saying({ 1: "title", 2: "date", 3: "location" }));

    const [event] = await parseEvents(KIRKE, printed([
      { text: "Barseltreff" },
      { text: "17.11" },
      { text: "Brønnøy bibliotek Brønnøysund" },
    ]));

    expect(event.location).toBe("Brønnøy bibliotek");
  });

  it("gives an event an end when the page writes a closing time", async () => {
    nouls.mockImplementationOnce(startsOn(1)).mockImplementationOnce(allReal);
    choices.mockImplementation(
      saying({ 1: "title", 2: "date", 3: "startTime", 4: "endTime" }),
    );

    const [event] = await parseEvents(KIRKE, printed([
      { text: "Barseltreff" },
      { text: "17.11" },
      { text: "11:00" },
      { text: "14:00" },
    ]));

    expect(event.startDate).toBe("2026-11-17T10:00:00.000Z");
    expect(event.endDate).toBe("2026-11-17T13:00:00.000Z");
  });

  it.each([
    ["no closing time was found", "other"],
    ["the closing time is not after the start", "endTime"],
  ])("leaves an event without an end when %s", async (_, lastField) => {
    nouls.mockImplementationOnce(startsOn(1)).mockImplementationOnce(allReal);
    choices.mockImplementation(
      saying({ 1: "title", 2: "date", 3: "startTime", 4: lastField }),
    );

    const [event] = await parseEvents(KIRKE, printed([
      { text: "Barseltreff" },
      { text: "17.11" },
      { text: "14:00" },
      { text: "11:00" },
    ]));

    expect(event.endDate).toBeUndefined();
  });

  it("leaves the confidence bar to the decision model", async () => {
    nouls.mockImplementationOnce(startsOn(1)).mockImplementationOnce(allReal);

    await parseEvents(KINO, KINO_LINES);

    expect(choices.mock.calls[0][3]).toBe(0.6);
  });

  it.each([
    ["no line starts one", []],
    ["the only line has no title", [1]],
  ])("collects nothing when %s", async (_, starts) => {
    nouls
      .mockImplementationOnce(startsOn(...starts))
      .mockImplementationOnce(allReal);
    choices.mockImplementation(saying({ 1: "date", 2: "date" }));

    expect(await parseEvents(KINO, KINO_LINES)).toEqual([]);
  });

  it("drops an event whose date cannot be read", async () => {
    nouls.mockImplementationOnce(startsOn(1)).mockImplementationOnce(allReal);
    choices.mockImplementation(saying({ 1: "title" }));

    expect(await parseEvents(KIRKE, printed([{ text: "Konsert en gang" }]))).toEqual([]);
  });

  it("asks nothing at all about a page with no lines", async () => {
    expect(await parseEvents(KINO, [])).toEqual([]);
    expect(nouls).not.toHaveBeenCalled();
    expect(choices).not.toHaveBeenCalled();
  });

  it("lets a decisions api failure through, so it is not read as a page without events", async () => {
    nouls.mockRejectedValue(new Error("Service unavailable"));

    await expect(parseEvents(KINO, KINO_LINES)).rejects.toThrow(
      "Service unavailable",
    );
  });
});
