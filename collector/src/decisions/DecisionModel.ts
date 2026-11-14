/**
 * A thin wrapper around OpenRouter's Decisions API.
 *
 * Every helper returns null for an answer the model refused.
 * score and choice also return null below minConfidence. The batched methods leave
 * the threshold to the caller: predicates return the probability, and scores and
 * choices return each answer's confidence.
 */
import { OpenRouter } from "@openrouter/sdk";
import type {
  DecisionsRequest,
  DecisionsResponse,
} from "@openrouter/sdk/models";

export type DecisionState = DecisionsRequest["state"];
export type Answer = DecisionsResponse["answers"][string];

/** Option name to a description of when that option applies. */
export type Criteria = Record<string, string>;

/** Ordered descriptions, from the lowest level to the highest. */
export type Levels = string[];

export interface ScoreAnswer {
  score: number;
  confidence: number;
}

export interface ChoiceAnswer {
  choice: string;
  confidence: number;
}

export class DecisionModel {
  readonly client: OpenRouter;

  constructor(
    readonly model: string,
    client?: OpenRouter,
  ) {
    this.client = client ?? new OpenRouter({ serverURL: "https://openrouter.ai" });
  }

  /** Returns the probability (0 to 1) that the condition is true, or null. */
  async predicate(
    instructions: string,
    state: DecisionState,
  ): Promise<number | null> {
    const answers = await this.predicates(singleQuestion(instructions), state);
    return answers["answer"];
  }

  /** Returns { name: probability } for several yes/no questions. */
  async predicates(
    questions: Record<string, string>,
    state: DecisionState,
  ): Promise<Record<string, number | null>> {
    const { answers } = await this.create({
      state,
      questions: mapValues(questions, (instructions) => ({
        type: "noul",
        instructions,
      })),
    });
    return mapValues(answers, (answer) =>
      answer.type === "noul" ? answer.noul : null,
    );
  }

  /** Returns a level index from 0 to levels.length - 1, or null. */
  async score(
    instructions: string,
    levels: Levels,
    state: DecisionState,
    minConfidence: number,
  ): Promise<number | null> {
    const answers = await this.scores(
      singleQuestion(instructions),
      levels,
      state,
    );
    const answer = aboveConfidence(answers["answer"], minConfidence);
    return answer && answer.score;
  }

  /** Returns { name: { score, confidence } } for several questions on the same scale. */
  async scores(
    questions: Record<string, string>,
    levels: Levels,
    state: DecisionState,
  ): Promise<Record<string, ScoreAnswer | null>> {
    const { answers } = await this.create({
      state,
      questions: mapValues(questions, (instructions) => ({
        type: "score",
        instructions,
        criteria: levels,
      })),
    });
    return mapValues(answers, (answer) =>
      answer.type === "score"
        ? { score: answer.score, confidence: answer.confidence ?? 0 }
        : null,
    );
  }

  /** Returns the chosen option name, or null. */
  async choice(
    instructions: string,
    criteria: Criteria,
    state: DecisionState,
    minConfidence: number,
  ): Promise<string | null> {
    const answers = await this.choices(
      singleQuestion(instructions),
      criteria,
      state,
    );
    const answer = aboveConfidence(answers["answer"], minConfidence);
    return answer && answer.choice;
  }

  /** Returns { name: { choice, confidence } } for several questions with the same options. */
  async choices(
    questions: Record<string, string>,
    criteria: Criteria,
    state: DecisionState,
  ): Promise<Record<string, ChoiceAnswer | null>> {
    const { answers } = await this.create({
      state,
      questions: mapValues(questions, (instructions) => ({
        type: "choice",
        instructions,
        criteria,
      })),
    });
    return mapValues(answers, (answer) =>
      answer.type === "choice"
        ? { choice: answer.choice, confidence: answer.confidence ?? 0 }
        : null,
    );
  }

  /** Returns the raw API response, for any mix of questions. */
  create(request: Omit<DecisionsRequest, "model">): Promise<DecisionsResponse> {
    return this.client.alpha.decisions.create({
      decisionsRequest: { model: this.model, ...request },
    });
  }
}

function singleQuestion(instructions: string): Record<string, string> {
  return { ["answer"]: instructions };
}

function aboveConfidence<T extends { confidence: number }>(
  answer: T | null,
  minConfidence: number,
): T | null {
  return answer && answer.confidence >= minConfidence ? answer : null;
}

function mapValues<Value, Mapped>(
  record: Record<string, Value>,
  mapValue: (value: Value) => Mapped,
): Record<string, Mapped> {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, mapValue(value)]),
  );
}
