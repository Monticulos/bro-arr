import { describe, it, expect } from "vitest";
import { shouldRunApify } from "./apifyConfig.js";

describe("shouldRunApify", () => {
  it("returns true on an even UTC date", () => {
    expect(shouldRunApify(new Date("2026-03-06T00:00:00Z"))).toBe(true);
  });

  it("returns false on an odd UTC date", () => {
    expect(shouldRunApify(new Date("2026-03-07T00:00:00Z"))).toBe(false);
  });

  it("uses UTC date, not local date", () => {
    // 2026-03-07T23:00:00Z is an odd UTC day regardless of local timezone
    expect(shouldRunApify(new Date("2026-03-07T23:00:00Z"))).toBe(false);
  });
});
