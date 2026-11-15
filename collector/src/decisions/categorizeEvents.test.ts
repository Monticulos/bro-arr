import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { categorizeEvents } from "./categorizeEvents.js";
import { CATEGORY_CRITERIA } from "./categoryCriteria.js";
import { createEvent } from "../test/createEvent.js";

const { choices } = vi.hoisted(() => ({ choices: vi.fn() }));

vi.mock("./DecisionModel.js", () => ({
  DECISION_MODEL: "test-model",
  DecisionModel: class {
    choices = choices;
  },
}));

const CONCERT = createEvent({
  id: "bronnoy-kirke-julekonsert",
  title: "Julekonsert",
  description: "Lokale kor fremfører julesanger.",
});

const QUIZ = createEvent({
  id: "cash-bar-humorquiz",
  title: "Humorquiz",
  description: "Quiz med premier.",
});

function choiceAnswer(choice: string) {
  return { type: "choice", choice, confidence: 0.9 };
}

describe("categorizeEvents", () => {
  beforeEach(() => {
    choices.mockReset();
    choices.mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("gives every event the category the decision model chose for it", async () => {
    choices.mockResolvedValue({
      event1: choiceAnswer("musikk"),
      event2: choiceAnswer("quiz"),
    });

    const events = await categorizeEvents([CONCERT, QUIZ], []);

    expect(events).toEqual([
      { ...CONCERT, category: "musikk" },
      { ...QUIZ, category: "quiz" },
    ]);
  });

  it("asks about every event in a single call, with every category as an option", async () => {
    await categorizeEvents([CONCERT, QUIZ], []);

    expect(choices).toHaveBeenCalledTimes(1);
    expect(choices).toHaveBeenCalledWith(
      {
        event1: expect.stringContaining("event1"),
        event2: expect.stringContaining("event2"),
      },
      CATEGORY_CRITERIA,
      {
        event1: { title: CONCERT.title, description: CONCERT.description },
        event2: { title: QUIZ.title, description: QUIZ.description },
      },
      expect.any(Number),
    );
  });

  it("keeps the category of events that were categorized in an earlier run", async () => {
    choices.mockResolvedValue({ event1: choiceAnswer("quiz") });
    const savedConcert = createEvent({ ...CONCERT, category: "musikk" });

    const events = await categorizeEvents([CONCERT, QUIZ], [savedConcert]);

    expect(events).toEqual([savedConcert, { ...QUIZ, category: "quiz" }]);
    expect(choices).toHaveBeenCalledWith(
      { event1: expect.any(String) },
      CATEGORY_CRITERIA,
      { event1: { title: QUIZ.title, description: QUIZ.description } },
      expect.any(Number),
    );
  });

  it.each([
    ["there is nothing to categorize", [], []],
    [
      "every event is categorized already",
      [CONCERT],
      [createEvent({ ...CONCERT, category: "musikk" })],
    ],
  ])("asks nothing when %s", async (_, events, savedEvents) => {
    await categorizeEvents(events, savedEvents);

    expect(choices).not.toHaveBeenCalled();
  });

  it.each([
    ["gives no answer", null],
    ["chooses a category that does not exist", choiceAnswer("sport")],
  ])("leaves the event uncategorized when the model %s", async (_, answer) => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    choices.mockResolvedValue({ event1: answer });

    const events = await categorizeEvents([CONCERT], []);

    expect(events[0].category).toBeUndefined();
  });

  it("leaves every event uncategorized when the decisions api fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    choices.mockRejectedValue(new Error("Service unavailable"));

    const events = await categorizeEvents([CONCERT, QUIZ], []);

    expect(events.map((event) => event.category)).toEqual([
      undefined,
      undefined,
    ]);
  });

  it("asks again about an event that an earlier run left uncategorized", async () => {
    choices.mockResolvedValue({ event1: choiceAnswer("musikk") });

    const events = await categorizeEvents([CONCERT], [CONCERT]);

    expect(events[0].category).toBe("musikk");
    expect(choices).toHaveBeenCalledTimes(1);
  });
});
