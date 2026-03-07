import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { upsertEvents } from "./upsertEvents.js";
import { EVENTS_JSON_PATH } from "./eventsFile.js";
import { createEvent } from "../test/createEvent.js";
import { readFileSync, writeFileSync } from "fs";

vi.mock("fs", () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

function mockExistingEvents(...events: ReturnType<typeof createEvent>[]) {
  vi.mocked(readFileSync).mockReturnValue(
    JSON.stringify({ updatedAt: "2026-02-28T00:00:00Z", events })
  );
}

function getWrittenEvents() {
  const writeCall = vi.mocked(writeFileSync).mock.calls[0];
  return JSON.parse(writeCall[1] as string);
}

describe("upsertEvents", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T12:00:00Z"));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("appends new events to existing events", async () => {
    const existingEvent = createEvent({ id: "existing-1", title: "Existing" });
    const newEvent = createEvent({ id: "new-1", title: "New" });
    mockExistingEvents(existingEvent);

    await upsertEvents([newEvent]);

    const writtenData = getWrittenEvents();
    expect(writtenData.events).toHaveLength(2);
    expect(writtenData.events[0].title).toBe("Existing");
    expect(writtenData.events[1].title).toBe("New");
  });

  it("updates existing event with matching id instead of duplicating", async () => {
    const existingEvent = createEvent({ id: "event-1", title: "Old Title" });
    const updatedEvent = createEvent({ id: "event-1", title: "New Title" });
    mockExistingEvents(existingEvent);

    await upsertEvents([updatedEvent]);

    const writtenData = getWrittenEvents();
    expect(writtenData.events).toHaveLength(1);
    expect(writtenData.events[0].title).toBe("New Title");
  });

  it("handles mix of new and existing events", async () => {
    const existingEvent = createEvent({ id: "event-1", title: "Existing" });
    const updatedEvent = createEvent({ id: "event-1", title: "Updated" });
    const brandNewEvent = createEvent({ id: "event-2", title: "Brand New" });
    mockExistingEvents(existingEvent);

    await upsertEvents([updatedEvent, brandNewEvent]);

    const writtenData = getWrittenEvents();
    expect(writtenData.events).toHaveLength(2);
    expect(writtenData.events[0].title).toBe("Updated");
    expect(writtenData.events[1].title).toBe("Brand New");
  });

  it("updates the updatedAt timestamp", async () => {
    mockExistingEvents();

    await upsertEvents([createEvent()]);

    const writtenData = getWrittenEvents();
    expect(writtenData.updatedAt).toBe("2026-03-01T12:00:00.000Z");
  });

  it("writes to the correct file path", async () => {
    mockExistingEvents();

    await upsertEvents([createEvent()]);

    const writeCall = vi.mocked(writeFileSync).mock.calls[0];
    expect(writeCall[0]).toBe(EVENTS_JSON_PATH);
  });

  it("creates new file when events.json is missing", async () => {
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error("ENOENT");
    });

    const event = createEvent({ title: "First" });
    await upsertEvents([event]);

    const writtenData = getWrittenEvents();
    expect(writtenData.events).toHaveLength(1);
    expect(writtenData.events[0].title).toBe("First");
  });
});
