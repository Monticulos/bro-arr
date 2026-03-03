import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { deleteSavedEvents } from "./deleteSavedEvents.js";
import { EVENTS_JSON_PATH } from "./eventsFile.js";
import { writeFileSync } from "fs";

vi.mock("fs", () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

describe("deleteSavedEvents", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("writes empty events array with current timestamp", () => {
    deleteSavedEvents();

    expect(writeFileSync).toHaveBeenCalledWith(
      EVENTS_JSON_PATH,
      JSON.stringify(
        { updatedAt: "2026-03-01T12:00:00.000Z", events: [] },
        null,
        2
      ),
      "utf-8"
    );
  });
});
