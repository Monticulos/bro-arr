import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readEventsFile, writeEventsFile, eventCount, EVENTS_JSON_PATH } from "./eventsFile.js";
import { writeSitemapFile } from "./sitemapFile.js";
import { createEvent } from "../test/createEvent.js";
import { readFileSync, writeFileSync } from "fs";

vi.mock("fs", () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock("./sitemapFile", () => ({
  writeSitemapFile: vi.fn(),
}));

function mockEventsFile(updatedAt: string, events: ReturnType<typeof createEvent>[]) {
  vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ updatedAt, events }));
}

describe("readEventsFile", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T12:00:00Z"));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("parses and returns existing events data", () => {
    const event = createEvent({ title: "Concert" });
    mockEventsFile("2026-03-01T00:00:00Z", [event]);

    const result = readEventsFile();

    expect(result.updatedAt).toBe("2026-03-01T00:00:00Z");
    expect(result.events).toHaveLength(1);
    expect(result.events[0].title).toBe("Concert");
  });

  it("returns empty events with current timestamp when file is missing", () => {
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error("ENOENT");
    });

    const result = readEventsFile();

    expect(result.events).toEqual([]);
    expect(result.updatedAt).toBe("2026-03-01T12:00:00.000Z");
  });

  it("returns empty events with current timestamp when file has invalid JSON", () => {
    vi.mocked(readFileSync).mockReturnValue("not valid json");

    const result = readEventsFile();

    expect(result.events).toEqual([]);
    expect(result.updatedAt).toBe("2026-03-01T12:00:00.000Z");
  });

  it("reads from the correct file path", () => {
    mockEventsFile("2026-03-01T00:00:00Z", []);

    readEventsFile();

    expect(readFileSync).toHaveBeenCalledWith(EVENTS_JSON_PATH, "utf-8");
  });
});

describe("writeEventsFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes pretty-printed JSON to the correct path", () => {
    const data = { updatedAt: "2026-03-01T00:00:00Z", events: [createEvent()] };

    writeEventsFile(data);

    expect(writeFileSync).toHaveBeenCalledWith(
      EVENTS_JSON_PATH,
      JSON.stringify(data, null, 2),
      "utf-8"
    );
  });

  it("calls writeSitemapFile with the updatedAt timestamp", () => {
    const data = { updatedAt: "2026-03-01T00:00:00Z", events: [] };

    writeEventsFile(data);

    expect(writeSitemapFile).toHaveBeenCalledWith("2026-03-01T00:00:00Z");
  });
});

describe("eventCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the number of events in the file", () => {
    mockEventsFile("2026-03-01T00:00:00Z", [createEvent({ id: "a" }), createEvent({ id: "b" })]);

    expect(eventCount()).toBe(2);
  });

  it("returns zero when file is missing", () => {
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error("ENOENT");
    });

    expect(eventCount()).toBe(0);
  });
});
