import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isExpired, deleteExpiredEvents } from "./deleteExpiredEvents.js";
import { createEvent } from "../test/createEvent.js";

describe("isExpired", () => {
  const now = new Date("2026-03-01T12:00:00Z");

  it("returns true for events more than 12 hours ago", () => {
    const oldEvent = createEvent({ startDate: "2026-02-28T23:00:00" });
    expect(isExpired(oldEvent, now)).toBe(true);
  });

  it("returns false for events less than 12 hours ago", () => {
    const recentEvent = createEvent({ startDate: "2026-03-01T01:00:00" });
    expect(isExpired(recentEvent, now)).toBe(false);
  });

  it("returns false for future events", () => {
    const futureEvent = createEvent({ startDate: "2026-06-01T00:00:00" });
    expect(isExpired(futureEvent, now)).toBe(false);
  });

  it("returns true for event exactly at the 12-hour boundary", () => {
    const boundaryEvent = createEvent({ startDate: "2026-02-28T23:59:59" });
    expect(isExpired(boundaryEvent, now)).toBe(true);
  });

  it("returns false for event just inside the 12-hour window", () => {
    const justInsideEvent = createEvent({ startDate: "2026-03-01T06:00:00Z" });
    expect(isExpired(justInsideEvent, now)).toBe(false);
  });
});

describe("deleteExpiredEvents", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("removes expired events and keeps valid ones", () => {
    const expired = createEvent({ id: "1", startDate: "2026-02-28T20:00:00Z" });
    const valid = createEvent({ id: "2", startDate: "2026-03-01T10:00:00Z" });

    const result = deleteExpiredEvents([expired, valid]);

    expect(result).toEqual([valid]);
  });

  it("returns all events when none are expired", () => {
    const events = [
      createEvent({ id: "1", startDate: "2026-03-01T06:00:00Z" }),
      createEvent({ id: "2", startDate: "2026-06-01T00:00:00Z" }),
    ];

    const result = deleteExpiredEvents(events);

    expect(result).toEqual(events);
  });

  it("returns empty array when all events are expired", () => {
    const events = [
      createEvent({ id: "1", startDate: "2026-02-27T00:00:00Z" }),
      createEvent({ id: "2", startDate: "2026-02-28T00:00:00Z" }),
    ];

    const result = deleteExpiredEvents(events);

    expect(result).toEqual([]);
  });
});
