import { describe, it, expect, vi } from "vitest";
import type { OpenRouter } from "@openrouter/sdk";
import { DecisionModel, type Answer } from "./DecisionModel.js";

const MODEL = "test/decision-1";
const STATE = { ticket: "The checkout page is blank." };
const TEAMS = {
  billing: "Payments, invoices and refunds.",
  technical: "Bugs and broken features.",
};
const URGENCY = ["Can wait", "Today", "Right now"];

function createDecisionModel(answers: Record<string, Answer>) {
  const create = vi.fn().mockResolvedValue({
    answers,
    model: MODEL,
    usage: { inputTokens: 10, outputTokens: 0 },
  });
  const client = { alpha: { decisions: { create } } } as unknown as OpenRouter;

  return { decisions: new DecisionModel(MODEL, client), create };
}

describe("DecisionModel", () => {
  describe("predicate", () => {
    it("returns the probability that the condition is true", async () => {
      const { decisions, create } = createDecisionModel({
        answer: { type: "noul", noul: 0.97 },
      });

      const probability = await decisions.predicate("Is this spam?", STATE);

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
      const { decisions } = createDecisionModel({ answer: { type: "refusal" } });

      expect(await decisions.predicate("Is this spam?", STATE)).toBeNull();
    });
  });

  describe("predicates", () => {
    it("returns one probability per question", async () => {
      const { decisions, create } = createDecisionModel({
        hasOrderNumber: { type: "noul", noul: 0.99 },
        hasExpectation: { type: "noul", noul: 0.12 },
      });

      const probabilities = await decisions.predicates(
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
    it("returns the level index when the model is confident enough", async () => {
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

    it("returns the lowest level instead of null", async () => {
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
    it("returns the score and confidence per question", async () => {
      const { decisions } = createDecisionModel({
        formality: { type: "score", score: 0.2, confidence: 0.9 },
        clarity: { type: "score", score: 1.8, confidence: 0.85 },
      });

      const scores = await decisions.scores(
        { formality: "How formal is this?", clarity: "How clear is this?" },
        URGENCY,
        STATE,
      );

      expect(scores).toEqual({
        formality: { score: 0.2, confidence: 0.9 },
        clarity: { score: 1.8, confidence: 0.85 },
      });
    });

    it("treats a missing confidence as no confidence", async () => {
      const { decisions } = createDecisionModel({
        formality: { type: "score", score: 0.2 },
      });

      const scores = await decisions.scores(
        { formality: "How formal is this?" },
        URGENCY,
        STATE,
      );

      expect(scores.formality).toEqual({ score: 0.2, confidence: 0 });
    });
  });

  describe("choice", () => {
    it("returns the chosen option when the model is confident enough", async () => {
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

    it("returns null when the model is torn between options", async () => {
      const { decisions } = createDecisionModel({
        answer: { type: "choice", choice: "technical", confidence: 0.42 },
      });

      expect(
        await decisions.choice("Which team?", TEAMS, STATE, 0.8),
      ).toBeNull();
    });

    it("returns null when the model refuses to answer", async () => {
      const { decisions } = createDecisionModel({ answer: { type: "refusal" } });

      expect(
        await decisions.choice("Which team?", TEAMS, STATE, 0.8),
      ).toBeNull();
    });
  });

  describe("choices", () => {
    it("returns the choice and confidence per question", async () => {
      const { decisions } = createDecisionModel({
        pricing: { type: "choice", choice: "billing", confidence: 0.95 },
        crash: { type: "choice", choice: "technical", confidence: 0.8 },
      });

      const choices = await decisions.choices(
        { pricing: "Which team owns pricing?", crash: "Which team owns bugs?" },
        TEAMS,
        STATE,
      );

      expect(choices).toEqual({
        pricing: { choice: "billing", confidence: 0.95 },
        crash: { choice: "technical", confidence: 0.8 },
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
        pricing: { choice: "billing", confidence: 0.95 },
        crash: null,
      });
    });
  });
});
