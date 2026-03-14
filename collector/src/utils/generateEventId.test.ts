import { describe, it, expect } from "vitest";
import { generateEventId } from "./generateEventId.js";

describe("generateEventId", () => {
  it("generates id from source name and startDate", () => {
    const id = generateEventId("Kred", "2026-03-15T20:00:00Z");
    expect(id).toBe("Kred-2026-03-15T20:00:00.000Z");
  });

  it("replaces spaces in source name with hyphens", () => {
    const id = generateEventId("Kafe Kred", "2026-03-15T20:00:00Z");
    expect(id).toBe("Kafe-Kred-2026-03-15T20:00:00.000Z");
  });

  it("produces different ids for different sources with same startDate", () => {
    const id1 = generateEventId("Kred", "2026-03-15T20:00:00Z");
    const id2 = generateEventId("Havnesenteret", "2026-03-15T20:00:00Z");
    expect(id1).not.toBe(id2);
  });
});
