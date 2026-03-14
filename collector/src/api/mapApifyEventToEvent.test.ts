import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mapApifyEventToEvent, LOCATION_MAP } from "./mapApifyEventToEvent.js";
import { createApifyEvent } from "../test/createApifyEvent.js";

vi.mock("../llm/categorizeEvent.js", () => ({
  categorizeEvent: vi.fn().mockResolvedValue("musikk"),
}));

describe("mapApifyEventToEvent", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("maps Apify event fields to Event", async () => {
    const apifyEvent = createApifyEvent({
      id: "abc123",
      name: "Rockekonsert",
      description: "En fin konsert",
      utcStartDate: "2026-03-15T19:00:00Z",
      url: "https://example.com/event",
      location: { id: "loc1", name: "Kred", latitude: 0, longitude: 0 },
    });

    const result = await mapApifyEventToEvent(apifyEvent);

    expect(result).toEqual({
      id: "abc123",
      title: "Rockekonsert",
      description: "En fin konsert",
      category: "musikk",
      startDate: "2026-03-15T19:00:00Z",
      location: "Kred",
      url: "https://example.com/event",
      collectedAt: "2026-03-01T12:00:00.000Z",
    });
  });

  it("uses categorizeEvent with the event name and description", async () => {
    const { categorizeEvent } = await import("../llm/categorizeEvent.js");
    const apifyEvent = createApifyEvent({ name: "Stand-up show", description: "Morsomt!" });

    await mapApifyEventToEvent(apifyEvent);

    expect(categorizeEvent).toHaveBeenCalledWith("Stand-up show", "Morsomt!");
  });

  describe("mapLocation", () => {
    it.each(Object.entries(LOCATION_MAP))(
      "maps address '%s' to venue '%s'",
      async (address, expectedVenue) => {
        const apifyEvent = createApifyEvent({ location: { id: "loc1", name: address, latitude: 0, longitude: 0 } });

        const result = await mapApifyEventToEvent(apifyEvent);

        expect(result.location).toBe(expectedVenue);
      }
    );

    it("maps address embedded in a longer string", async () => {
      const apifyEvent = createApifyEvent({
        location: { id: "loc1", name: "Storgata 70, 8900 Brønnøysund", latitude: 0, longitude: 0 },
      });

      const result = await mapApifyEventToEvent(apifyEvent);

      expect(result.location).toBe(LOCATION_MAP["Storgata 70"]);
    });

    it("returns the location unchanged when no address matches", async () => {
      const apifyEvent = createApifyEvent({ location: { id: "loc1", name: "Ukjent sted", latitude: 0, longitude: 0 } });

      const result = await mapApifyEventToEvent(apifyEvent);

      expect(result.location).toBe("Ukjent sted");
    });
  });
});
