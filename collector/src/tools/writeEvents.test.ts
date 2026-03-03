import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { writeEvents } from "./writeEvents.js";
import { EVENTS_JSON_PATH } from "./eventsFile.js";
import { createEvent } from "../test/createEvent.js";
import { readFileSync, writeFileSync } from "fs";

vi.mock("fs", () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

describe("writeEvents", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T12:00:00Z"));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("appends new events to existing events", async () => {
    const existingEvent = createEvent({ title: "Existing" });
    const newEvent = createEvent({ title: "New" });

    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({ updatedAt: "2026-02-28T00:00:00Z", events: [existingEvent] })
    );

    await writeEvents([newEvent]);

    const writeCall = vi.mocked(writeFileSync).mock.calls[0];
    expect(writeCall[0]).toBe(EVENTS_JSON_PATH);

    const writtenData = JSON.parse(writeCall[1] as string);
    expect(writtenData.events).toHaveLength(2);
    expect(writtenData.events[0].title).toBe("Existing");
    expect(writtenData.events[1].title).toBe("New");
  });

  it("updates the updatedAt timestamp", async () => {
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({ updatedAt: "2026-02-28T00:00:00Z", events: [] })
    );

    await writeEvents([createEvent()]);

    const writeCall = vi.mocked(writeFileSync).mock.calls[0];
    const writtenData = JSON.parse(writeCall[1] as string);
    expect(writtenData.updatedAt).toBe("2026-03-01T12:00:00.000Z");
  });

  it("creates new file when events.json is missing", async () => {
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error("ENOENT");
    });

    const event = createEvent({ title: "First" });
    await writeEvents([event]);

    const writeCall = vi.mocked(writeFileSync).mock.calls[0];
    const writtenData = JSON.parse(writeCall[1] as string);
    expect(writtenData.events).toHaveLength(1);
    expect(writtenData.events[0].title).toBe("First");
  });
});
