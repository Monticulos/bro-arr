import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isExpired } from "./deleteExpiredEvents.js";
import { createEvent } from "../test/createEvent.js";

describe("isExpired", () => {
  const now = new Date("2026-03-01T12:00:00Z");

  it("returns true for events more than 12 hours ago", () => {
    const oldEvent = createEvent({ dateTime: "2026-02-28T23:00:00" });
    expect(isExpired(oldEvent, now)).toBe(true);
  });

  it("returns false for events less than 12 hours ago", () => {
    const recentEvent = createEvent({ dateTime: "2026-03-01T01:00:00" });
    expect(isExpired(recentEvent, now)).toBe(false);
  });

  it("returns false for future events", () => {
    const futureEvent = createEvent({ dateTime: "2026-06-01T00:00:00" });
    expect(isExpired(futureEvent, now)).toBe(false);
  });

  it("returns true for event exactly at the 12-hour boundary", () => {
    const boundaryEvent = createEvent({ dateTime: "2026-02-28T23:59:59" });
    expect(isExpired(boundaryEvent, now)).toBe(true);
  });

  it("returns false for event just inside the 12-hour window", () => {
    const justInsideEvent = createEvent({ dateTime: "2026-03-01T06:00:00Z" });
    expect(isExpired(justInsideEvent, now)).toBe(false);
  });
});
