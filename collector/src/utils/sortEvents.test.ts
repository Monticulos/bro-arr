import { describe, it, expect } from "vitest";
import { sortEvents } from "./sortEvents.js";
import { createEvent } from "../test/createEvent.js";

describe("sortEvents", () => {
  it("sorts events chronologically by startDate", () => {
    const later = createEvent({ title: "Later", startDate: "2026-04-01T00:00:00" });
    const earlier = createEvent({ title: "Earlier", startDate: "2026-03-01T00:00:00" });
    const middle = createEvent({ title: "Middle", startDate: "2026-03-15T00:00:00" });

    const sorted = sortEvents([later, earlier, middle]);

    expect(sorted[0].title).toBe("Earlier");
    expect(sorted[1].title).toBe("Middle");
    expect(sorted[2].title).toBe("Later");
  });

  it("returns empty array for empty input", () => {
    expect(sortEvents([])).toEqual([]);
  });

  it("does not mutate the original array", () => {
    const events = [
      createEvent({ startDate: "2026-04-01T00:00:00" }),
      createEvent({ startDate: "2026-03-01T00:00:00" }),
    ];
    const originalFirst = events[0];

    sortEvents(events);

    expect(events[0]).toBe(originalFirst);
  });
});
