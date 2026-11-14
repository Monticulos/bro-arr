import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { categorizeEvent } from "./categorizeEvent.js";
import { CATEGORY_CRITERIA } from "./categoryCriteria.js";

const { choice } = vi.hoisted(() => ({ choice: vi.fn() }));

vi.mock("./DecisionModel.js", () => ({
  DecisionModel: class {
    choice = choice;
  },
}));

const CONCERT = {
  title: "Julekonsert",
  description: "Lokale kor fremfører julesanger.",
  location: "Brønnøy kirke",
};

describe("categorizeEvent", () => {
  beforeEach(() => {
    choice.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the category the decision model chose", async () => {
    choice.mockResolvedValue("musikk");

    const category = await categorizeEvent(CONCERT);

    expect(category).toBe("musikk");
  });

  it("asks about the event with every category as an option", async () => {
    choice.mockResolvedValue("musikk");

    await categorizeEvent(CONCERT);

    expect(choice).toHaveBeenCalledWith(
      expect.any(String),
      CATEGORY_CRITERIA,
      CONCERT,
      expect.any(Number),
    );
  });

  it("falls back to annet when the model returns no category", async () => {
    choice.mockResolvedValue(null);

    const category = await categorizeEvent(CONCERT);

    expect(category).toBe("annet");
  });

  it("falls back to annet when the decisions api fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    choice.mockRejectedValue(new Error("Service unavailable"));

    const category = await categorizeEvent(CONCERT);

    expect(category).toBe("annet");
  });

  it("falls back to annet when the model returns an unknown category", async () => {
    choice.mockResolvedValue("sport");

    const category = await categorizeEvent(CONCERT);

    expect(category).toBe("annet");
  });
});
