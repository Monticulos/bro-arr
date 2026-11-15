import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseEvents } from "./parseEvents.js";
import type { Source } from "../sources.js";

const { choice, choices } = vi.hoisted(() => ({
  choice: vi.fn(),
  choices: vi.fn(),
}));

vi.mock("./DecisionModel.js", () => ({
  DecisionModel: class {
    choice = choice;
    choices = choices;
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

const KINO_TABLE = `<table class="InnholdTabell"><tbody>
  <tr class="InnholdTabellTekst"><td><span><a href="https://www.filmweb.no/film/EDI20251675">Ebenezer (Premerie)</a></span></td><td><span>13.11.26 kl. 20:00</span></td></tr>
  <tr class="InnholdTabellTekst"><td><span></span></td><td><span>Siste dag *</span></td></tr>
</tbody></table>`;

const KIRKE_ITEM = `<div class="calendar-item">
  <div class="calendar-date">15.11 </div><div class="event-time">kl.11.00</div>
  <p class="info-text"><a href="CalendarPage?EventId=89bb">Gudstjeneste med dåp</a></p>
  <span class="calendar-location">Brønnøy kirke</span>
</div>`;

const KIRKE_DAY = `<div class="calendar-item">
  <div class="calendar-date">29.11 </div>
  <div class="event"><div class="event-time">kl.11.00</div><p><a href="CalendarPage?EventId=aaa">Gudstjeneste</a></p><span class="calendar-location">Brønnøy kirke</span></div>
  <div class="event"><div class="event-time">kl.15.00</div><p><a href="CalendarPage?EventId=bbb">Gudstjeneste</a></p><span class="calendar-location">Velfjord kirke</span></div>
</div>`;

function choiceAnswer(chosen: string) {
  return { type: "choice", choice: chosen, confidence: 0.9 };
}

function chooseGroupHolding(signature: string) {
  return (_: string, criteria: Record<string, string>) =>
    Object.keys(criteria).find((key) =>
      criteria[key].includes(`<${signature}>`),
    ) ?? null;
}

describe("parseEvents", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    choice.mockReset().mockResolvedValue("whole");
    choices.mockReset().mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("builds an event out of the row the model labeled", async () => {
    choice.mockImplementation(chooseGroupHolding("tr.InnholdTabellTekst"));
    choices.mockResolvedValue({
      event1piece1: choiceAnswer("title"),
      event1piece2: choiceAnswer("date"),
      event2piece1: choiceAnswer("date"),
    });

    const events = await parseEvents(KINO, KINO_TABLE);

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

  it("offers the model every repeated group, the whole section and no events at all", async () => {
    await parseEvents(KINO, KINO_TABLE);

    expect(choice).toHaveBeenCalledTimes(1);
    expect(choice.mock.calls[0][1]).toEqual({
      group1: expect.stringContaining("<tr.InnholdTabellTekst>"),
      group2: expect.stringContaining("<td>"),
      whole: expect.any(String),
      none: expect.any(String),
    });
  });

  it("asks about every piece of every event in a single call", async () => {
    choice.mockImplementation(chooseGroupHolding("tr.InnholdTabellTekst"));

    await parseEvents(KINO, KINO_TABLE);

    expect(choices).toHaveBeenCalledTimes(1);
    expect(choices.mock.calls[0][0]).toEqual({
      event1piece1: expect.stringContaining("event1piece1"),
      event1piece2: expect.stringContaining("event1piece2"),
      event2piece1: expect.stringContaining("event2piece1"),
    });
    expect(choices.mock.calls[0][2]).toEqual({
      source: KINO.name,
      event1piece1: { tag: "a", text: "Ebenezer (Premerie)" },
      event1piece2: { tag: "span", text: "13.11.26 kl. 20:00" },
      event2piece1: { tag: "span", text: "Siste dag *" },
    });
  });

  it("reads a page holding a single event as one whole event", async () => {
    choices.mockResolvedValue({
      event1piece1: choiceAnswer("date"),
      event1piece2: choiceAnswer("startTime"),
      event1piece3: choiceAnswer("title"),
      event1piece4: choiceAnswer("location"),
    });

    const events = await parseEvents(KIRKE, KIRKE_ITEM);

    expect(events).toEqual([
      expect.objectContaining({
        title: "Gudstjeneste med dåp",
        startDate: "2026-11-15T10:00:00.000Z",
        location: "Brønnøy kirke",
        url: "https://www.bronnoy.kirken.no/CalendarPage?EventId=89bb",
      }),
    ]);
  });

  it("splits a container holding a whole day into one event per title", async () => {
    choices.mockResolvedValue({
      event1piece1: choiceAnswer("date"),
      event1piece2: choiceAnswer("startTime"),
      event1piece3: choiceAnswer("title"),
      event1piece4: choiceAnswer("location"),
      event1piece5: choiceAnswer("startTime"),
      event1piece6: choiceAnswer("title"),
      event1piece7: choiceAnswer("location"),
    });

    const events = await parseEvents(KIRKE, KIRKE_DAY);

    expect(events).toEqual([
      expect.objectContaining({
        title: "Gudstjeneste",
        startDate: "2026-11-29T10:00:00.000Z",
        location: "Brønnøy kirke",
        url: "https://www.bronnoy.kirken.no/CalendarPage?EventId=aaa",
      }),
      expect.objectContaining({
        title: "Gudstjeneste",
        startDate: "2026-11-29T14:00:00.000Z",
        location: "Velfjord kirke",
        url: "https://www.bronnoy.kirken.no/CalendarPage?EventId=bbb",
      }),
    ]);
  });

  it("gives a location the name the site uses for that venue", async () => {
    const container = `<li><span>17.11</span><span>Barseltreff</span><span>Brønnøy bibliotek Brønnøysund</span></li>`;
    choices.mockResolvedValue({
      event1piece1: choiceAnswer("date"),
      event1piece2: choiceAnswer("title"),
      event1piece3: choiceAnswer("location"),
    });

    const [event] = await parseEvents(KIRKE, container);

    expect(event.location).toBe("Brønnøy bibliotek");
  });

  it("gives an event an end when the page writes a closing time", async () => {
    const container = `<li><span>17.11</span><span>Barseltreff</span><time>11:00</time><time>14:00</time></li>`;
    choices.mockResolvedValue({
      event1piece1: choiceAnswer("date"),
      event1piece2: choiceAnswer("title"),
      event1piece3: choiceAnswer("startTime"),
      event1piece4: choiceAnswer("endTime"),
    });

    const [event] = await parseEvents(KIRKE, container);

    expect(event.startDate).toBe("2026-11-17T10:00:00.000Z");
    expect(event.endDate).toBe("2026-11-17T13:00:00.000Z");
  });

  it.each([
    ["no closing time was found", "other"],
    ["the closing time is not after the start", "endTime"],
  ])("leaves an event without an end when %s", async (_, lastField) => {
    const container = `<li><span>17.11</span><span>Barseltreff</span><time>14:00</time><time>11:00</time></li>`;
    choices.mockResolvedValue({
      event1piece1: choiceAnswer("date"),
      event1piece2: choiceAnswer("title"),
      event1piece3: choiceAnswer("startTime"),
      event1piece4: choiceAnswer(lastField),
    });

    const [event] = await parseEvents(KIRKE, container);

    expect(event.endDate).toBeUndefined();
  });

  it("gives an event its own description when the model found one", async () => {
    choices.mockResolvedValue({
      event1piece1: choiceAnswer("date"),
      event1piece2: choiceAnswer("startTime"),
      event1piece3: choiceAnswer("title"),
      event1piece4: choiceAnswer("description"),
    });

    const [event] = await parseEvents(KIRKE, KIRKE_ITEM);

    expect(event.description).toBe("Brønnøy kirke");
    expect(event.location).toBe(KIRKE.name);
  });

  it.each([
    ["the model found no list of events", "none"],
    ["the model could not decide", null],
  ])("collects nothing when %s", async (_, answer) => {
    choice.mockResolvedValue(answer);

    expect(await parseEvents(KINO, KINO_TABLE)).toEqual([]);
    expect(choice).toHaveBeenCalledTimes(1);
    expect(choices).not.toHaveBeenCalled();
  });

  it.each([
    ["has no title", "other"],
    ["has no answer at all", null],
  ])("drops an event whose only piece %s", async (_, answer) => {
    choice.mockImplementation(chooseGroupHolding("tr.InnholdTabellTekst"));
    choices.mockResolvedValue({
      event1piece1: answer && choiceAnswer(answer),
      event1piece2: choiceAnswer("date"),
    });

    expect(await parseEvents(KINO, KINO_TABLE)).toEqual([]);
  });

  it("drops an event whose date cannot be read", async () => {
    choices.mockResolvedValue({
      event1piece1: choiceAnswer("title"),
      event1piece2: choiceAnswer("other"),
      event1piece3: choiceAnswer("other"),
      event1piece4: choiceAnswer("other"),
    });

    expect(await parseEvents(KIRKE, "<div><p>Konsert en gang</p></div>")).toEqual(
      [],
    );
  });

  it.each([
    ["finding the events", choice],
    ["labeling the pieces", choices],
  ])("collects nothing when the decisions api fails while %s", async (_, failing) => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    failing.mockRejectedValue(new Error("Service unavailable"));

    expect(await parseEvents(KINO, KINO_TABLE)).toEqual([]);
  });
});
