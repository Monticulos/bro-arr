import { describe, it, expect } from "vitest";
import { parseNorwegianDate } from "./parseNorwegianDate.js";

const TODAY = new Date("2026-11-15T09:00:00.000Z");

describe("parseNorwegianDate", () => {
  it.each([
    ["13.11.26 kl. 20:00", "2026-11-13T20:00:00"],
    ["Søndag 15.11 kl.11.00", "2026-11-15T11:00:00"],
    ["Fredag 13. nov kl. 20:00", "2026-11-13T20:00:00"],
    ["Lørdag 3. januar 2027 kl 19.30", "2027-01-03T19:30:00"],
    ["13.11.2026", "2026-11-13T00:00:00"],
  ])("reads %s as %s", (text, expected) => {
    expect(parseNorwegianDate(text, TODAY)).toBe(expected);
  });

  it("gives a date without a year the next year when it has already been this year", () => {
    expect(parseNorwegianDate("5. jan", TODAY)).toBe("2027-01-05T00:00:00");
  });

  it("gives a date without a year this year when it is still to come", () => {
    expect(parseNorwegianDate("31.12 kl. 23:59", TODAY)).toBe(
      "2026-12-31T23:59:00",
    );
  });

  it("reads a two-digit year as this century", () => {
    expect(parseNorwegianDate("01.02.27", TODAY)).toBe("2027-02-01T00:00:00");
  });

  it("tells the date apart from the time when both are written with dots", () => {
    expect(parseNorwegianDate("15.11 Kino kl.19.00", TODAY)).toBe(
      "2026-11-15T19:00:00",
    );
  });

  it.each([
    ["there is no date at all", "Siste dag *"],
    ["the text is empty", ""],
    ["there is only a time", "kl.11.00"],
    ["the day and month are out of range", "32.13"],
    ["the day does not exist that month", "31.02.2027"],
  ])("gives null when %s", (_, text) => {
    expect(parseNorwegianDate(text, TODAY)).toBeNull();
  });
});
