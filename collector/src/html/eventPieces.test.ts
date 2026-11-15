import { describe, it, expect } from "vitest";
import { findCandidateGroups, findEventUrl, readPieces } from "./eventPieces.js";

const KINO_TABLE = `<table class="InnholdTabell">
  <thead><tr class="InnholdTabellOverskriftTekst"><th class="htLeft htBold">Kino</th><th class="htLeft htBold">Dato</th></tr></thead>
  <tbody>
    <tr class="InnholdTabellTekst"><td class="htLeft"><span><a class="InnholdLinkTekst" href="https://www.filmweb.no/film/EDI20251675">Ebenezer (Premerie)</a></span></td><td class="htLeft"><span>13.11.26 kl. 20:00</span></td></tr>
    <tr class="InnholdTabellTekst"><td><span></span></td><td><span>Siste dag *</span></td></tr>
  </tbody>
</table>`;

const KIRKE_ITEM = `<div class="calendar-item">
  <div class="calendar-data"><div class="calendar-day">Søndag</div><div class="calendar-date">15.11 </div></div>
  <div class="calendar-event"><div class="event"><div class="event-time">kl.11.00</div><div class="event-info">
    <p class="info-text"><a href="CalendarPage?EventId=89bb">Gudstjeneste med dåp</a></p>
    <p class="calendar-kategori"><a href="CalendarPage?EventId=89bb"><span class="calendar-label">Gudstjeneste</span><span class="calendar-label-dash"> - </span><span class="calendar-location">Brønnøy kirke</span></a></p>
  </div></div></div>
</div>`;

const KIRKE_CALENDAR = `<div class="calendar"><div class="calendar-month"><h1>November</h1></div>${KIRKE_ITEM.repeat(3)}</div>`;

const KINO_URL = "https://www.bronnoy.kommune.no/kino/";
const KIRKE_URL = "https://www.bronnoy.kirken.no/Kalender";
const BIBLIOTEK_URL = "https://bronnoybibliotek.no/arrangementer#/";

function signatures(html: string): string[] {
  return findCandidateGroups(html).map((group) => group.signature);
}

describe("findCandidateGroups", () => {
  it("finds the repeated rows of an event table", () => {
    const rows = findCandidateGroups(KINO_TABLE).find(
      (group) => group.signature === "tr.InnholdTabellTekst",
    );

    expect(rows?.containers).toHaveLength(2);
    expect(rows?.containers[0]).toContain("Ebenezer (Premerie)");
  });

  it("finds the repeated items of a calendar and nothing else", () => {
    const groups = findCandidateGroups(KIRKE_CALENDAR);

    expect(groups).toHaveLength(1);
    expect(groups[0].signature).toBe("div.calendar-item");
    expect(groups[0].containers).toHaveLength(3);
  });

  it("finds nothing on a page holding a single event", () => {
    expect(findCandidateGroups(KIRKE_ITEM)).toEqual([]);
  });

  it("leaves out repeated elements that hold no text", () => {
    const html = `<ul><li></li><li></li></ul>`;

    expect(findCandidateGroups(html)).toEqual([]);
  });

  it("keeps the largest group of a signature when it repeats under several parents", () => {
    const html = `<div><section><p class="a">one</p><p class="a">two</p></section>
      <section><p class="a">one</p><p class="a">two</p><p class="a">three</p></section></div>`;

    const paragraphs = findCandidateGroups(html).find(
      (group) => group.signature === "p.a",
    );

    expect(paragraphs?.containers).toHaveLength(3);
  });

  it("returns the ten largest groups at most", () => {
    const html = Array.from(
      { length: 12 },
      (_, index) =>
        `<section><p class="g${index}">one</p><p class="g${index}">two</p></section>`,
    ).join("");

    expect(findCandidateGroups(html)).toHaveLength(10);
  });

  it.each([
    ["empty", ""],
    ["unclosed", "<div><p>Ingen planlagte hendelser"],
  ])("finds nothing in %s html", (_, html) => {
    expect(findCandidateGroups(html)).toEqual([]);
  });

  it("leaves out scripts", () => {
    const html = `<div><script>var a = 1;</script><script>var b = 2;</script></div>`;

    expect(signatures(html)).toEqual([]);
  });
});

describe("readPieces", () => {
  it("reads every text-only element of a calendar item in document order", () => {
    expect(readPieces(KIRKE_ITEM)).toEqual([
      { tag: "div.calendar-day", text: "Søndag" },
      { tag: "div.calendar-date", text: "15.11" },
      { tag: "div.event-time", text: "kl.11.00" },
      { tag: "a", text: "Gudstjeneste med dåp", href: "CalendarPage?EventId=89bb" },
      {
        tag: "span.calendar-label",
        text: "Gudstjeneste",
        href: "CalendarPage?EventId=89bb",
      },
      {
        tag: "span.calendar-label-dash",
        text: "-",
        href: "CalendarPage?EventId=89bb",
      },
      {
        tag: "span.calendar-location",
        text: "Brønnøy kirke",
        href: "CalendarPage?EventId=89bb",
      },
    ]);
  });

  it("skips elements holding no text, so a row without a title has only its date", () => {
    const lastDayRow = findCandidateGroups(KINO_TABLE).find(
      (group) => group.signature === "tr.InnholdTabellTekst",
    )?.containers[1];

    expect(readPieces(lastDayRow ?? "")).toEqual([
      { tag: "span", text: "Siste dag *" },
    ]);
  });

  it("collapses the whitespace inside a piece", () => {
    expect(readPieces("<p>  Gudstjeneste\n  med dåp </p>")).toEqual([
      { tag: "p", text: "Gudstjeneste med dåp" },
    ]);
  });
});

describe("findEventUrl", () => {
  it("resolves a relative link against the source url", () => {
    const url = findEventUrl(KIRKE_ITEM, KIRKE_URL);

    expect(url).toBe("https://www.bronnoy.kirken.no/CalendarPage?EventId=89bb");
  });

  it("stitches a hash link onto the source url", () => {
    const container = `<li><a href="#/events/35215c08">Barseltreff</a></li>`;

    expect(findEventUrl(container, BIBLIOTEK_URL)).toBe(
      "https://bronnoybibliotek.no/arrangementer#/events/35215c08",
    );
  });

  it.each([
    ["the only link leaves the site", KINO_TABLE],
    ["the link cannot be followed", `<p><a href="javascript:print()">Skriv ut</a></p>`],
    ["there is no link at all", `<p>Ebenezer (Premerie)</p>`],
  ])("falls back to the source url when %s", (_, container) => {
    expect(findEventUrl(container, KINO_URL)).toBe(KINO_URL);
  });
});
