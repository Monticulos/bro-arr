import { describe, it, expect } from "vitest";
import { withFallbackCategory } from "./withFallbackCategory";
import { createEvent } from "../test/factories";

describe("withFallbackCategory", () => {
  it("keeps the category the collector chose", () => {
    const event = createEvent({ category: "musikk" });

    expect(withFallbackCategory(event).category).toBe("musikk");
  });

  it("falls back to annet for an event the collector left uncategorized", () => {
    const uncategorizedEvent = { ...createEvent(), category: undefined };

    expect(withFallbackCategory(uncategorizedEvent).category).toBe("annet");
  });

  it("leaves every other field untouched", () => {
    const event = createEvent({ location: "Kulturhuset" });

    expect(withFallbackCategory(event)).toEqual(event);
  });
});
