import { describe, it, expect, vi } from "vitest";
import { sortByDateTime } from "./sortEvents.js";
import { createEvent } from "../test/createEvent.js";

describe("sortByDateTime", () => {
  it("sorts events chronologically by dateTime", () => {
    const later = createEvent({ title: "Later", dateTime: "2026-04-01T00:00:00" });
    const earlier = createEvent({ title: "Earlier", dateTime: "2026-03-01T00:00:00" });
    const middle = createEvent({ title: "Middle", dateTime: "2026-03-15T00:00:00" });

    const sorted = sortByDateTime([later, earlier, middle]);

    expect(sorted[0].title).toBe("Earlier");
    expect(sorted[1].title).toBe("Middle");
    expect(sorted[2].title).toBe("Later");
  });

  it("returns empty array for empty input", () => {
    expect(sortByDateTime([])).toEqual([]);
  });

  it("does not mutate the original array", () => {
    const events = [
      createEvent({ dateTime: "2026-04-01T00:00:00" }),
      createEvent({ dateTime: "2026-03-01T00:00:00" }),
    ];
    const originalFirst = events[0];

    sortByDateTime(events);

    expect(events[0]).toBe(originalFirst);
  });
});
