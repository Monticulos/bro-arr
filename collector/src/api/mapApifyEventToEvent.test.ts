import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mapApifyEventToEvent } from "./mapApifyEventToEvent.js";
import { createApifyEvent } from "../test/createApifyEvent.js";

describe("mapApifyEventToEvent", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("maps Apify event fields to an uncategorized event", () => {
    const apifyEvent = createApifyEvent({
      id: "abc123",
      name: "Rockekonsert",
      description: "En fin konsert",
      utcStartDate: "2026-03-15T19:00:00Z",
      url: "https://example.com/event",
      location: { id: "loc1", name: "Kred", latitude: 0, longitude: 0 },
    });

    const result = mapApifyEventToEvent(apifyEvent);

    expect(result).toEqual({
      id: "abc123",
      title: "Rockekonsert",
      description: "En fin konsert",
      startDate: "2026-03-15T19:00:00Z",
      location: "Kred",
      url: "https://example.com/event",
      collectedAt: "2026-03-01T12:00:00.000Z",
    });
  });
});
