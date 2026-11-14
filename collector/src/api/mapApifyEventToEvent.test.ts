import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mapApifyEventToEvent, LOCATION_MAP } from "./mapApifyEventToEvent.js";
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

  describe("mapLocation", () => {
    it.each(Object.entries(LOCATION_MAP))(
      "maps address '%s' to venue '%s'",
      (address, expectedVenue) => {
        const apifyEvent = createApifyEvent({ location: { id: "loc1", name: address, latitude: 0, longitude: 0 } });

        const result = mapApifyEventToEvent(apifyEvent);

        expect(result.location).toBe(expectedVenue);
      }
    );

    it("maps address embedded in a longer string", () => {
      const apifyEvent = createApifyEvent({
        location: { id: "loc1", name: "Storgata 70, 8900 Brønnøysund", latitude: 0, longitude: 0 },
      });

      const result = mapApifyEventToEvent(apifyEvent);

      expect(result.location).toBe(LOCATION_MAP["Storgata 70"]);
    });

    it("returns the location unchanged when no address matches", () => {
      const apifyEvent = createApifyEvent({ location: { id: "loc1", name: "Ukjent sted", latitude: 0, longitude: 0 } });

      const result = mapApifyEventToEvent(apifyEvent);

      expect(result.location).toBe("Ukjent sted");
    });
  });
});
