import { describe, it, expect } from "vitest";
import {
  formatMonthHeading,
  formatEventDate,
  formatUpdatedAtDate,
} from "./formatDate";

describe("formatMonthHeading", () => {
  it("returns capitalized Norwegian month and year", () => {
    const result = formatMonthHeading("2025-03-15T10:00:00Z");
    expect(result).toBe("Mars 2025");
  });

  it("capitalizes first letter", () => {
    const result = formatMonthHeading("2025-01-01T00:00:00Z");
    expect(result.charAt(0)).toBe(result.charAt(0).toUpperCase());
  });
});

describe("formatEventDate", () => {
  it("returns full date string with weekday and time", () => {
    const result = formatEventDate("2025-06-15T18:30:00Z");
    expect(result).toContain("2025");
    expect(result).toMatch(/\d{2}:\d{2}/);
  });

  it("displays Norwegian local time (CEST) regardless of user timezone", () => {
    const result = formatEventDate("2025-06-15T18:30:00Z");
    expect(result).toContain("20:30");
  });

  it("displays Norwegian local time (CET) regardless of user timezone", () => {
    const result = formatEventDate("2025-01-15T18:30:00Z");
    expect(result).toContain("19:30");
  });
});

describe("formatUpdatedAtDate", () => {
  it("returns date string with time but without weekday", () => {
    const result = formatUpdatedAtDate("2025-06-15T18:30:00Z");
    expect(result).toContain("2025");
    expect(result).toMatch(/\d{2}:\d{2}/);
  });

  it("does not include weekday", () => {
    const withWeekday = formatEventDate("2025-06-15T18:30:00Z");
    const withoutWeekday = formatUpdatedAtDate("2025-06-15T18:30:00Z");
    expect(withoutWeekday.length).toBeLessThan(withWeekday.length);
  });
});
