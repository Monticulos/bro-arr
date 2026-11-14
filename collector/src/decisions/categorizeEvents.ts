import type { DecisionsChoiceAnswer } from "@openrouter/sdk/models";
import type { Event, UncategorizedEvent } from "../../../shared/types/Event";
import { DecisionModel } from "./DecisionModel.js";
import {
  CATEGORY_CRITERIA,
  isEventCategory,
  type EventCategory,
} from "./categoryCriteria.js";
import { logDetail, warnDetail } from "../utils/logger.js";

/** Below this the model is only guessing between categories, so the event is left uncategorized. */
const MIN_CONFIDENCE = 0.3;

export async function categorizeEvents(
  events: UncategorizedEvent[],
  savedEvents: Event[],
): Promise<Event[]> {
  const categories = new Map(
    savedEvents.map(({ id, category }) => [id, category]),
  );
  const newEvents = events.filter(({ id }) => !categories.has(id));
  const answers = await chooseCategories(newEvents);
  newEvents.forEach((event, index) => {
    const category = toCategory(answers[eventKey(index)] ?? null);
    logDetail(`${event.title} was labeled as ${category}.`);
    categories.set(event.id, category);
  });

  return events.map((event) => ({
    ...event,
    category: categories.get(event.id) ?? "annet",
  }));
}

async function chooseCategories(
  events: UncategorizedEvent[],
): Promise<Record<string, DecisionsChoiceAnswer | null>> {
  if (events.length === 0) return {};

  const decisions = new DecisionModel("google/gemini-decision-1");
  try {
    return await decisions.choices(
      toQuestions(events),
      CATEGORY_CRITERIA,
      toState(events),
      MIN_CONFIDENCE,
    );
  } catch (error) {
    warnDetail(`Failed to categorize ${events.length} events:`, error);
    return {};
  }
}

function toQuestions(events: UncategorizedEvent[]): Record<string, string> {
  return Object.fromEntries(
    events.map((_, index) => [
      eventKey(index),
      `Which category best describes ${eventKey(index)}, a local event in Brønnøysund, Norway?`,
    ]),
  );
}

function toState(
  events: UncategorizedEvent[],
): Record<string, UncategorizedEvent> {
  return Object.fromEntries(
    events.map((event, index) => [eventKey(index), event]),
  );
}

function eventKey(index: number): string {
  return `event${index + 1}`;
}

function toCategory(answer: DecisionsChoiceAnswer | null): EventCategory {
  const choice = answer?.choice ?? null;
  return isEventCategory(choice) ? choice : "annet";
}
