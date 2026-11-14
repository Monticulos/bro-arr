/**
 * A thin wrapper around OpenRouter's Decisions API.
 *
 * Each method is named after the question type it asks, and answers keep the API's
 * own types. Every helper returns null for an answer the model refused. The singular
 * methods unwrap the answer and also return null below minConfidence; the batched
 * methods leave the threshold to the caller.
 */
import { OpenRouter } from "@openrouter/sdk";
import type {
  DecisionsChoiceAnswer,
  DecisionsChoiceQuestion,
  DecisionsChoiceQuestionInstructions,
  DecisionsRequest,
  DecisionsResponse,
  DecisionsScoreAnswer,
  DecisionsScoreQuestion,
} from "@openrouter/sdk/models";
import { retryTransientFailures } from "./retryTransientFailures.js";

export type State = DecisionsRequest["state"];
export type Answers = DecisionsResponse["answers"];
export type Instructions = DecisionsChoiceQuestionInstructions;
export type ChoiceCriteria = DecisionsChoiceQuestion["criteria"];
export type ScoreCriteria = DecisionsScoreQuestion["criteria"];

/** The SDK's own retry runs for up to an hour */
const client = new OpenRouter({ retryConfig: { strategy: "none" } });

export class DecisionModel {
  constructor(readonly model: string) {}

  /** Returns the probability (0 to 1) that the statement is true, or null. */
  async noul(instructions: Instructions, state: State): Promise<number | null> {
    return singleAnswer(await this.nouls(singleQuestion(instructions), state));
  }

  /** Returns { name: probability } for several yes/no questions. */
  async nouls(
    questions: Record<string, Instructions>,
    state: State,
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

  /** Returns a score from 0 to criteria.length - 1, or null. */
  async score(
    instructions: Instructions,
    criteria: ScoreCriteria,
    state: State,
    minConfidence: number,
  ): Promise<number | null> {
    const answers = await this.scores(
      singleQuestion(instructions),
      criteria,
      state,
    );
    const answer = aboveConfidence(singleAnswer(answers), minConfidence);
    return answer && answer.score;
  }

  /** Returns { name: answer } for several questions on the same scale. */
  async scores(
    questions: Record<string, Instructions>,
    criteria: ScoreCriteria,
    state: State,
  ): Promise<Record<string, DecisionsScoreAnswer | null>> {
    const { answers } = await this.create({
      state,
      questions: mapValues(questions, (instructions) => ({
        type: "score",
        instructions,
        criteria,
      })),
    });
    return mapValues(answers, (answer) =>
      answer.type === "score" ? answer : null,
    );
  }

  /** Returns the name of the chosen criterion, or null. */
  async choice(
    instructions: Instructions,
    criteria: ChoiceCriteria,
    state: State,
    minConfidence: number,
  ): Promise<string | null> {
    const answers = await this.choices(
      singleQuestion(instructions),
      criteria,
      state,
    );
    const answer = aboveConfidence(singleAnswer(answers), minConfidence);
    return answer && answer.choice;
  }

  /** Returns { name: answer } for several questions with the same criteria. */
  async choices(
    questions: Record<string, Instructions>,
    criteria: ChoiceCriteria,
    state: State,
  ): Promise<Record<string, DecisionsChoiceAnswer | null>> {
    const { answers } = await this.create({
      state,
      questions: mapValues(questions, (instructions) => ({
        type: "choice",
        instructions,
        criteria,
      })),
    });
    return mapValues(answers, (answer) =>
      answer.type === "choice" ? answer : null,
    );
  }

  /** Returns the raw API response, for any mix of questions. */
  create(request: Omit<DecisionsRequest, "model">): Promise<DecisionsResponse> {
    return retryTransientFailures(() =>
      client.alpha.decisions.create({
        decisionsRequest: { model: this.model, ...request },
      }),
    );
  }
}

function singleQuestion(
  instructions: Instructions,
): Record<string, Instructions> {
  return { answer: instructions };
}

function singleAnswer<Answer>(answers: Record<string, Answer>): Answer {
  return Object.values(answers)[0];
}

function aboveConfidence<Answer extends { confidence?: number }>(
  answer: Answer | null,
  minConfidence: number,
): Answer | null {
  return answer && (answer.confidence ?? 0) >= minConfidence ? answer : null;
}

function mapValues<Value, Mapped>(
  record: Record<string, Value>,
  mapValue: (value: Value) => Mapped,
): Record<string, Mapped> {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, mapValue(value)]),
  );
}
