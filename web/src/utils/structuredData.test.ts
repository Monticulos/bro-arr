import { describe, it, expect } from "vitest";
import { buildEventsJsonLd } from "./structuredData";
import { createEvent } from "../test/factories";

describe("buildEventsJsonLd", () => {
  it("returns correct Schema.org structure for events", () => {
    const events = [
      createEvent({
        location: "Torget Bar",
        url: "https://example.com/quiz",
      }),
    ];

    const result = buildEventsJsonLd(events);

    expect(result).toEqual({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Event",
          name: "Quiz Night",
          description: "Weekly pub quiz",
          startDate: "2025-06-15T19:00:00Z",
          location: { "@type": "Place", name: "Torget Bar" },
          url: "https://example.com/quiz",
        },
      ],
    });
  });

  it("returns empty @graph for empty array", () => {
    const result = buildEventsJsonLd([]);

    expect(result["@graph"]).toEqual([]);
  });

  it("omits location when not provided", () => {
    const events = [createEvent({ location: undefined })];

    const result = buildEventsJsonLd(events);

    expect(result["@graph"][0]).not.toHaveProperty("location");
  });

  it("omits url when not provided", () => {
    const events = [createEvent({ url: undefined })];

    const result = buildEventsJsonLd(events);

    expect(result["@graph"][0]).not.toHaveProperty("url");
  });
});
