import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { norwegianDateToday, norwegianTimeToUtc } from "./norwegianTime.js";

describe("norwegianTimeToUtc", () => {
  it("converts CET winter time to UTC (offset +1)", () => {
    const result = norwegianTimeToUtc("2026-01-15T18:00:00");
    expect(result).toBe("2026-01-15T17:00:00.000Z");
  });

  it("converts CEST summer time to UTC (offset +2)", () => {
    const result = norwegianTimeToUtc("2026-07-15T18:00:00");
    expect(result).toBe("2026-07-15T16:00:00.000Z");
  });

  it("converts date-only input as midnight local time", () => {
    const result = norwegianTimeToUtc("2026-03-20");
    expect(result).toBe("2026-03-19T23:00:00.000Z");
  });

  it("converts time without seconds", () => {
    const result = norwegianTimeToUtc("2026-01-15T18:00");
    expect(result).toBe("2026-01-15T17:00:00.000Z");
  });

  it("handles DST transition day correctly (March 29 2026, clocks spring forward)", () => {
    const result = norwegianTimeToUtc("2026-03-29T18:00:00");
    expect(result).toBe("2026-03-29T16:00:00.000Z");
  });
});

describe("norwegianDateToday", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats the date as day, short month and year", () => {
    vi.setSystemTime(new Date("2026-11-14T10:00:00Z"));
    expect(norwegianDateToday()).toBe("14. nov. 2026");
  });

  it("returns the Norwegian date when it is past midnight in Norway but not in UTC", () => {
    vi.setSystemTime(new Date("2026-11-14T23:30:00Z"));
    expect(norwegianDateToday()).toBe("15. nov. 2026");
  });
});
