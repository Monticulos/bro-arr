/**
 * A thin wrapper around OpenAI's Decisions API.
 *
 * Every helper returns null for an answer the model refused.
 * score and choice also return null below minConfidence. The batched methods leave
 * the threshold to the caller: predicates return the probability, and scores and
 * choices return each answer's confidence.
 */
import OpenAI from "openai";
import type { Decision, DecisionCreateParams } from "openai/resources/decisions";

export interface Level {
  label: string;
  description?: string;
}

export interface Choice {
  value: string;
  description?: string;
}

export interface ScoreAnswer {
  score: number;
  confidence: number;
}

export interface ChoiceAnswer {
  choice: string;
  confidence: number;
}

export class DecisionModel {
  readonly client: OpenAI;

  constructor(readonly model: string, client?: OpenAI) {
    this.client = client ?? new OpenAI();
  }

  /** Returns the probability (0 to 1) that the condition is true, or null. */
  async predicate(instructions: string, input: string): Promise<number | null> {
    return (await this.predicates({ answer: instructions }, input)).answer;
  }

  /** Returns { name: probability } for several yes/no questions. */
  async predicates(questions: Record<string, string>,
    input: string): Promise<Record<string, number | null>> {
    const names = Object.keys(questions);
    const { answers } = await this.create({
      input, questions: names.map((name) => (
        { type: "predicate", name, instructions: questions[name] }))
    });
    return Object.fromEntries(answers.map((a) => (
      [a.name!, a.type === "predicate" ? a.probability : null])));
  }

  /** Returns a level index from 0 to levels.length - 1, or null. */
  async score(instructions: string, levels: Level[], input: string,
    minConfidence: number): Promise<number | null> {
    const r = (await this.scores({ answer: instructions }, levels, input)).answer;
    return r && r.confidence >= minConfidence ? r.score : null;
  }

  /** Returns { name: { score, confidence } } for several questions on the same scale. */
  async scores(questions: Record<string, string>, levels: Level[],
    input: string): Promise<Record<string, ScoreAnswer | null>> {
    const names = Object.keys(questions);
    const { answers } = await this.create({
      input, questions: names.map((name) => (
        { type: "score", name, instructions: questions[name], levels }))
    });
    return Object.fromEntries(answers.map((a) => (
      [a.name!, a.type === "score" ? { score: a.score, confidence: a.confidence } : null])));
  }

  /** Returns the chosen value, or null. */
  async choice(instructions: string, choices: Choice[], input: string,
    minConfidence: number): Promise<string | null> {
    const r = (await this.choices({ answer: instructions }, choices, input)).answer;
    return r && r.confidence >= minConfidence ? r.choice : null;
  }

  /** Returns { name: { choice, confidence } } for several questions with the same options. */
  async choices(questions: Record<string, string>, choices: Choice[],
    input: string): Promise<Record<string, ChoiceAnswer | null>> {
    const names = Object.keys(questions);
    const { answers } = await this.create({
      input, questions: names.map((name) => (
        { type: "choice", name, instructions: questions[name], choices }))
    });
    return Object.fromEntries(answers.map((a) => (
      [a.name!, a.type === "choice" ? { choice: String(a.choice), confidence: a.confidence }
        : null])));
  }

  /** Returns the raw API response, for any mix of questions. */
  create(params: Omit<DecisionCreateParams, "model">): Promise<Decision> {
    return this.client.decisions.create({ model: this.model, ...params });
  }
}
