import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runEditorAgent } from "./editorAgent.js";
import { EVENTS_JSON_PATH } from "./eventsFile.js";
import { createEvent } from "../test/createEvent.js";
import { readFileSync, writeFileSync } from "fs";

vi.mock("fs", () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

const mockInvoke = vi.fn();

vi.mock("@langchain/mistralai", () => ({
  ChatMistralAI: vi.fn().mockImplementation(() => ({
    withStructuredOutput: vi.fn().mockReturnValue({
      invoke: mockInvoke,
    }),
  })),
}));

describe("runEditorAgent", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("skips LLM call when there are 0 events", async () => {
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({ updatedAt: "2026-03-01T00:00:00Z", events: [] })
    );

    await runEditorAgent();

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it("skips LLM call when there is only 1 event", async () => {
    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({ updatedAt: "2026-03-01T00:00:00Z", events: [createEvent()] })
    );

    await runEditorAgent();

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it("removes duplicate events identified by LLM", async () => {
    const event1 = createEvent({ id: "event-1", title: "Concert" });
    const event2 = createEvent({ id: "event-2", title: "Concert (duplicate)" });
    const event3 = createEvent({ id: "event-3", title: "Workshop" });

    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({ updatedAt: "2026-03-01T00:00:00Z", events: [event1, event2, event3] })
    );

    mockInvoke.mockResolvedValue({ eventIdsToRemove: ["event-2"] });

    await runEditorAgent();

    const writeCall = vi.mocked(writeFileSync).mock.calls[0];
    const writtenData = JSON.parse(writeCall[1] as string);
    expect(writtenData.events).toHaveLength(2);
    expect(writtenData.events.map((e: { id: string }) => e.id)).toEqual(["event-1", "event-3"]);
  });

  it("does not write when LLM returns no duplicates", async () => {
    const event1 = createEvent({ id: "event-1" });
    const event2 = createEvent({ id: "event-2" });

    vi.mocked(readFileSync).mockReturnValue(
      JSON.stringify({ updatedAt: "2026-03-01T00:00:00Z", events: [event1, event2] })
    );

    mockInvoke.mockResolvedValue({ eventIdsToRemove: [] });

    await runEditorAgent();

    expect(writeFileSync).not.toHaveBeenCalled();
  });
});
