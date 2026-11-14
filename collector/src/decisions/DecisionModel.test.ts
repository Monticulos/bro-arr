import { describe, it, expect, vi } from "vitest";
import { DecisionModel, type Answers } from "./DecisionModel.js";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock("@openrouter/sdk", () => ({
  OpenRouter: class {
    alpha = { decisions: { create } };
  },
}));

const MODEL = "test/decision-1";
const STATE = { ticket: "The checkout page is blank." };
const TEAMS = {
  billing: "Payments, invoices and refunds.",
  technical: "Bugs and broken features.",
};
const URGENCY = ["Can wait", "Today", "Right now"];

function createDecisionModel(answers: Answers) {
  create.mockReset();
  create.mockResolvedValue({
    answers,
    model: MODEL,
    usage: { inputTokens: 10, outputTokens: 0 },
  });

  return { decisions: new DecisionModel(MODEL), create };
}

describe("DecisionModel", () => {
  describe("noul", () => {
    it("returns the probability that the statement is true", async () => {
      const { decisions, create } = createDecisionModel({
        answer: { type: "noul", noul: 0.97 },
      });

      const probability = await decisions.noul("Is this spam?", STATE);

      expect(probability).toBe(0.97);
      expect(create).toHaveBeenCalledWith({
        decisionsRequest: {
          model: MODEL,
          state: STATE,
          questions: {
            answer: { type: "noul", instructions: "Is this spam?" },
          },
        },
      });
    });

    it("returns null when the model refuses to answer", async () => {
      const { decisions } = createDecisionModel({
        answer: { type: "refusal" },
      });

      expect(await decisions.noul("Is this spam?", STATE)).toBeNull();
    });
  });

  describe("nouls", () => {
    it("returns one probability per question", async () => {
      const { decisions, create } = createDecisionModel({
        hasOrderNumber: { type: "noul", noul: 0.99 },
        hasExpectation: { type: "noul", noul: 0.12 },
      });

      const probabilities = await decisions.nouls(
        {
          hasOrderNumber: "Does the message include an order number?",
          hasExpectation: "Does the message say what the customer expected?",
        },
        STATE,
      );

      expect(probabilities).toEqual({
        hasOrderNumber: 0.99,
        hasExpectation: 0.12,
      });
      expect(create).toHaveBeenCalledWith({
        decisionsRequest: {
          model: MODEL,
          state: STATE,
          questions: {
            hasOrderNumber: {
              type: "noul",
              instructions: "Does the message include an order number?",
            },
            hasExpectation: {
              type: "noul",
              instructions: "Does the message say what the customer expected?",
            },
          },
        },
      });
    });
  });

  describe("score", () => {
    it("returns the score when the model is confident enough", async () => {
      const { decisions, create } = createDecisionModel({
        answer: { type: "score", score: 1.9, confidence: 0.8 },
      });

      const score = await decisions.score(
        "How urgent is this?",
        URGENCY,
        STATE,
        0.6,
      );

      expect(score).toBe(1.9);
      expect(create).toHaveBeenCalledWith({
        decisionsRequest: {
          model: MODEL,
          state: STATE,
          questions: {
            answer: {
              type: "score",
              instructions: "How urgent is this?",
              criteria: URGENCY,
            },
          },
        },
      });
    });

    it("returns null below the minimum confidence", async () => {
      const { decisions } = createDecisionModel({
        answer: { type: "score", score: 1.9, confidence: 0.5 },
      });

      const score = await decisions.score(
        "How urgent is this?",
        URGENCY,
        STATE,
        0.6,
      );

      expect(score).toBeNull();
    });

    it("returns null when the answer has no confidence", async () => {
      const { decisions } = createDecisionModel({
        answer: { type: "score", score: 1.9 },
      });

      const score = await decisions.score(
        "How urgent is this?",
        URGENCY,
        STATE,
        0.6,
      );

      expect(score).toBeNull();
    });

    it("returns the lowest score instead of null", async () => {
      const { decisions } = createDecisionModel({
        answer: { type: "score", score: 0, confidence: 0.9 },
      });

      const score = await decisions.score(
        "How urgent is this?",
        URGENCY,
        STATE,
        0.6,
      );

      expect(score).toBe(0);
    });
  });

  describe("scores", () => {
    it("returns the answer per question", async () => {
      const { decisions } = createDecisionModel({
        formality: { type: "score", score: 0.2, confidence: 0.9 },
        clarity: {
          type: "score",
          score: 1.8,
          confidence: 0.85,
          legend: { "0": "low", "1": "medium", "2": "high" },
        },
      });

      const scores = await decisions.scores(
        { formality: "How formal is this?", clarity: "How clear is this?" },
        URGENCY,
        STATE,
      );

      expect(scores).toEqual({
        formality: { type: "score", score: 0.2, confidence: 0.9 },
        clarity: {
          type: "score",
          score: 1.8,
          confidence: 0.85,
          legend: { "0": "low", "1": "medium", "2": "high" },
        },
      });
    });
  });

  describe("choice", () => {
    it("returns the chosen criterion when the model is confident enough", async () => {
      const { decisions, create } = createDecisionModel({
        answer: { type: "choice", choice: "technical", confidence: 0.84 },
      });

      const choice = await decisions.choice("Which team?", TEAMS, STATE, 0.8);

      expect(choice).toBe("technical");
      expect(create).toHaveBeenCalledWith({
        decisionsRequest: {
          model: MODEL,
          state: STATE,
          questions: {
            answer: {
              type: "choice",
              instructions: "Which team?",
              criteria: TEAMS,
            },
          },
        },
      });
    });

    it("returns null when the model is torn between criteria", async () => {
      const { decisions } = createDecisionModel({
        answer: { type: "choice", choice: "technical", confidence: 0.42 },
      });

      expect(
        await decisions.choice("Which team?", TEAMS, STATE, 0.8),
      ).toBeNull();
    });

    it("returns null when the model refuses to answer", async () => {
      const { decisions } = createDecisionModel({
        answer: { type: "refusal" },
      });

      expect(
        await decisions.choice("Which team?", TEAMS, STATE, 0.8),
      ).toBeNull();
    });
  });

  describe("choices", () => {
    it("returns the answer per question", async () => {
      const { decisions } = createDecisionModel({
        pricing: {
          type: "choice",
          choice: "billing",
          confidence: 0.95,
          probabilities: { billing: 0.95, technical: 0.05 },
        },
        crash: { type: "choice", choice: "technical", confidence: 0.8 },
      });

      const choices = await decisions.choices(
        { pricing: "Which team owns pricing?", crash: "Which team owns bugs?" },
        TEAMS,
        STATE,
      );

      expect(choices).toEqual({
        pricing: {
          type: "choice",
          choice: "billing",
          confidence: 0.95,
          probabilities: { billing: 0.95, technical: 0.05 },
        },
        crash: { type: "choice", choice: "technical", confidence: 0.8 },
      });
    });

    it("returns null for a refused question while keeping the answered ones", async () => {
      const { decisions } = createDecisionModel({
        pricing: { type: "choice", choice: "billing", confidence: 0.95 },
        crash: { type: "refusal" },
      });

      const choices = await decisions.choices(
        { pricing: "Which team owns pricing?", crash: "Which team owns bugs?" },
        TEAMS,
        STATE,
      );

      expect(choices).toEqual({
        pricing: { type: "choice", choice: "billing", confidence: 0.95 },
        crash: null,
      });
    });
  });

  describe("create", () => {
    it("passes through question types without a wrapper method", async () => {
      const { decisions, create } = createDecisionModel({
        logo: {
          type: "box",
          box: { top: 0.1, bottom: 0.2, left: 0.3, right: 0.4 },
        },
      });

      const response = await decisions.create({
        state: STATE,
        questions: { logo: { type: "box", instructions: "the logo" } },
      });

      expect(response.answers.logo).toEqual({
        type: "box",
        box: { top: 0.1, bottom: 0.2, left: 0.3, right: 0.4 },
      });
      expect(create).toHaveBeenCalledWith({
        decisionsRequest: {
          model: MODEL,
          state: STATE,
          questions: { logo: { type: "box", instructions: "the logo" } },
        },
      });
    });
  });
});
