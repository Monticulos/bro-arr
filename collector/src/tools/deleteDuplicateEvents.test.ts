import { describe, it, expect } from "vitest";
import type { Event } from "../../../types/Event";
import { hasSimilarTitle, isDuplicate, findDuplicateIds, deleteDuplicateEvents } from "./deleteDuplicateEvents";

function createEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "1",
    title: "Test Event",
    description: "Description",
    category: "musikk",
    startDate: "2026-03-07T20:00:00.000Z",
    collectedAt: "2026-03-07T09:00:00.000Z",
    ...overrides,
  };
}

describe("hasSimilarTitle", () => {
  it("matches identical titles", () => {
    expect(hasSimilarTitle("Stand Up Spesial", "Stand Up Spesial")).toBe(true);
  });

  it("matches titles with different casing", () => {
    expect(
      hasSimilarTitle("Mat og vinkveld med Erik Strugstad", "Mat og Vinkveld med Erik Strugstad")
    ).toBe(true);
  });

  it("matches titles where one uses & and the other uses og", () => {
    expect(
      hasSimilarTitle("Ole Soo og Nils-Ingar Aadne", "Ole Soo & Nils-Ingar Aadne")
    ).toBe(true);
  });

  it("matches when one title is a shorter version of the other", () => {
    expect(hasSimilarTitle("Kred's Musikkbingo", "MusikkBingo")).toBe(true);
  });

  it("matches titles with minor wording differences", () => {
    expect(
      hasSimilarTitle(
        "Christer Torjussen: Stand Up Spesial",
        "Stand Up Spesial med Christer Torjussen"
      )
    ).toBe(true);
  });

  it("does not match completely different titles", () => {
    expect(hasSimilarTitle("AllmenQuiz", "MusikkBingo")).toBe(false);
  });

  it("does not match titles sharing only one common word", () => {
    expect(hasSimilarTitle("Konsert med Jonas Knutsson", "Konsert med Christer Torjussen")).toBe(
      false
    );
  });

  it("does not match empty titles", () => {
    expect(hasSimilarTitle("", "Some Event")).toBe(false);
  });
});

describe("isDuplicate", () => {
  it("detects duplicate when same time and similar title", () => {
    const apifyEvent = createEvent({
      id: "123456789",
      title: "Mat og vinkveld med Erik Strugstad",
      startDate: "2026-03-20T18:00:00.000Z",
    });
    const puppeteerEvent = createEvent({
      id: "Kred-2026-03-20T18:00:00.000Z",
      title: "Mat og Vinkveld med Erik Strugstad",
      startDate: "2026-03-20T18:00:00.000Z",
    });

    expect(isDuplicate(apifyEvent, puppeteerEvent)).toBe(true);
  });

  it("does not detect duplicate with same title an hour apart", () => {
    const apifyEvent = createEvent({
      id: "123456789",
      title: "Kortfilm: Nordland",
      startDate: "2026-03-20T17:00:00.000Z",
    });
    const puppeteerEvent = createEvent({
      id: "Kred-2026-03-20T18:00:00.000Z",
      title: "Kortfilm: Nordland",
      startDate: "2026-03-20T18:00:00.000Z",
    });

    expect(isDuplicate(apifyEvent, puppeteerEvent)).toBe(false);
  });

  it("detects duplicate when times straddle midnight", () => {
    const apifyEvent = createEvent({
      id: "123456789",
      title: "Stand Up Spesial",
      startDate: "2026-03-20T23:30:00.000Z",
    });
    const puppeteerEvent = createEvent({
      id: "Kred-2026-03-21T00:15:00.000Z",
      title: "Stand Up Spesial",
      startDate: "2026-03-21T00:15:00.000Z",
    });

    expect(isDuplicate(apifyEvent, puppeteerEvent)).toBe(true);
  });

  it("does not detect duplicate when different dates", () => {
    const apifyEvent = createEvent({
      id: "123456789",
      title: "Stand Up Spesial",
      startDate: "2026-03-20T20:00:00.000Z",
    });
    const puppeteerEvent = createEvent({
      id: "Kred-2026-03-21T20:00:00.000Z",
      title: "Stand Up Spesial",
      startDate: "2026-03-21T20:00:00",
    });

    expect(isDuplicate(apifyEvent, puppeteerEvent)).toBe(false);
  });

  it("does not detect duplicate when different titles on same date", () => {
    const apifyEvent = createEvent({
      id: "123456789",
      title: "AllmenQuiz",
      startDate: "2026-03-12T20:00:00.000Z",
    });
    const puppeteerEvent = createEvent({
      id: "Kred-2026-03-12T20:00:00.000Z",
      title: "MusikkBingo",
      startDate: "2026-03-12T20:00:00.000Z",
    });

    expect(isDuplicate(apifyEvent, puppeteerEvent)).toBe(false);
  });
});

describe("findDuplicateIds", () => {
  it("returns puppeteer event ids that have apify duplicates", () => {
    const events = [
      createEvent({
        id: "1592827455088754",
        title: "Mat og vinkveld med Erik Strugstad",
        startDate: "2026-03-20T18:00:00.000Z",
      }),
      createEvent({
        id: "Kred-2026-03-20T18:00:00.000Z",
        title: "Mat og Vinkveld med Erik Strugstad",
        startDate: "2026-03-20T18:00:00.000Z",
      }),
      createEvent({
        id: "Brønnøy-kirke-2026-03-15T10:00:00.000Z",
        title: "Gudstjeneste",
        startDate: "2026-03-15T10:00:00.000Z",
      }),
    ];

    const duplicateIds = findDuplicateIds(events);

    expect(duplicateIds).toEqual(new Set(["Kred-2026-03-20T18:00:00.000Z"]));
  });

  it("returns empty set when there are no duplicates", () => {
    const events = [
      createEvent({
        id: "123456789",
        title: "Concert A",
        startDate: "2026-03-20T18:00:00.000Z",
      }),
      createEvent({
        id: "Kred-2026-03-21T18:00:00.000Z",
        title: "Concert B",
        startDate: "2026-03-21T18:00:00.000Z",
      }),
    ];

    const duplicateIds = findDuplicateIds(events);

    expect(duplicateIds.size).toBe(0);
  });

  it("never removes apify events", () => {
    const events = [
      createEvent({
        id: "111111111",
        title: "Same Event",
        startDate: "2026-03-20T18:00:00.000Z",
      }),
      createEvent({
        id: "222222222",
        title: "Same Event",
        startDate: "2026-03-20T19:00:00.000Z",
      }),
    ];

    const duplicateIds = findDuplicateIds(events);

    expect(duplicateIds.size).toBe(0);
  });

  it("handles multiple duplicate pairs", () => {
    const events = [
      createEvent({
        id: "1535081147792962",
        title: "Christer Torjussen - Stand Up Spesial",
        startDate: "2026-03-27T20:00:00.000Z",
      }),
      createEvent({
        id: "Kred-2026-03-27T20:00:00.000Z",
        title: "Christer Torjussen: Stand Up Spesial",
        startDate: "2026-03-27T20:00:00.000Z",
      }),
      createEvent({
        id: "1592827455088754",
        title: "Mat og vinkveld med Erik Strugstad",
        startDate: "2026-03-20T18:00:00.000Z",
      }),
      createEvent({
        id: "Kred-2026-03-20T18:00:00.000Z",
        title: "Mat og Vinkveld med Erik Strugstad",
        startDate: "2026-03-20T18:00:00.000Z",
      }),
    ];

    const duplicateIds = findDuplicateIds(events);

    expect(duplicateIds).toEqual(
      new Set(["Kred-2026-03-27T20:00:00.000Z", "Kred-2026-03-20T18:00:00.000Z"])
    );
  });
});

describe("deleteDuplicateEvents", () => {
  it("removes puppeteer duplicates and keeps apify events", () => {
    const apifyEvent = createEvent({
      id: "1592827455088754",
      title: "Mat og vinkveld med Erik Strugstad",
      startDate: "2026-03-20T18:00:00.000Z",
    });
    const puppeteerDuplicate = createEvent({
      id: "Kred-2026-03-20T18:00:00.000Z",
      title: "Mat og Vinkveld med Erik Strugstad",
      startDate: "2026-03-20T18:00:00.000Z",
    });
    const uniqueEvent = createEvent({
      id: "Brønnøy-kirke-2026-03-15T10:00:00.000Z",
      title: "Gudstjeneste",
      startDate: "2026-03-15T10:00:00.000Z",
    });

    const result = deleteDuplicateEvents([apifyEvent, puppeteerDuplicate, uniqueEvent]);

    expect(result).toEqual([apifyEvent, uniqueEvent]);
  });

  it("returns all events when there are no duplicates", () => {
    const events = [
      createEvent({ id: "123456789", title: "Concert A", startDate: "2026-03-20T18:00:00.000Z" }),
      createEvent({ id: "Kred-2026-03-21T18:00:00.000Z", title: "Concert B", startDate: "2026-03-21T18:00:00.000Z" }),
    ];

    const result = deleteDuplicateEvents(events);

    expect(result).toEqual(events);
  });
});
