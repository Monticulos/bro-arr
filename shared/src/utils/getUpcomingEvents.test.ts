import { describe, it, expect } from "vitest";
import { getUpcomingEvents } from "./getUpcomingEvents";
import { createEvent } from "../test/createEvent";

describe("getUpcomingEvents", () => {
  const now = new Date("2026-03-01T12:00:00Z");

  it("keeps future events", () => {
    const futureEvent = createEvent({ startDate: "2026-06-01T00:00:00Z" });
    expect(getUpcomingEvents([futureEvent], now)).toEqual([futureEvent]);
  });

  it("keeps events that started inside the grace window", () => {
    const recentEvent = createEvent({ startDate: "2026-03-01T06:00:00Z" });
    expect(getUpcomingEvents([recentEvent], now)).toEqual([recentEvent]);
  });

  it("keeps an event starting exactly at the threshold", () => {
    const boundaryEvent = createEvent({ startDate: "2026-03-01T00:00:00Z" });
    expect(getUpcomingEvents([boundaryEvent], now)).toEqual([boundaryEvent]);
  });

  it("removes events that started before the threshold", () => {
    const expiredEvent = createEvent({ startDate: "2026-02-28T23:59:59Z" });
    expect(getUpcomingEvents([expiredEvent], now)).toEqual([]);
  });

  it("returns an empty array for empty input", () => {
    expect(getUpcomingEvents([], now)).toEqual([]);
  });
});
