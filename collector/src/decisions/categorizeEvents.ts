import type { DecisionsChoiceAnswer } from "@openrouter/sdk/models";
import type { Event, EventCategory } from "../../../shared/src/types/Event";
import { DecisionModel } from "./DecisionModel.js";
import { CATEGORY_CRITERIA, isEventCategory } from "./categoryCriteria.js";
import { logDetail, logPhase, warnDetail } from "../utils/logger.js";

/** Below this the model is only guessing between categories, so the event is left uncategorized. */
const MIN_CONFIDENCE = 0.3;

type EventToCategorize = Pick<Event, "title" | "description" | "location">;

export async function categorizeEvents(
  events: Event[],
  savedEvents: Event[],
): Promise<Event[]> {
  const savedCategories = toSavedCategories(savedEvents);
  const newEvents = events.filter(({ id }) => !savedCategories.has(id));
  logPhase(
    `Categorizing ${newEvents.length} of ${events.length} collected events...`,
  );
  const newCategories = await categorizeNewEvents(newEvents);

  return events.map((event) => ({
    ...event,
    category: savedCategories.get(event.id) ?? newCategories.get(event.id),
  }));
}

function toSavedCategories(savedEvents: Event[]): Map<string, EventCategory> {
  return new Map(
    savedEvents.flatMap(({ id, category }) =>
      category ? [[id, category] as const] : [],
    ),
  );
}

async function categorizeNewEvents(
  events: Event[],
): Promise<Map<string, EventCategory>> {
  const answers = await chooseCategories(events);
  const categories = new Map<string, EventCategory>();

  events.forEach((event, index) => {
    const category = toCategory(answers[eventKey(index)] ?? null);
    logOutcome(event, category);
    if (category) categories.set(event.id, category);
  });

  return categories;
}

async function chooseCategories(
  events: Event[],
): Promise<Record<string, DecisionsChoiceAnswer | null>> {
  if (events.length === 0) return {};

  const decisions = new DecisionModel();
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

function toQuestions(events: Event[]): Record<string, string> {
  return Object.fromEntries(
    events.map((_, index) => [
      eventKey(index),
      `Which category best describes ${eventKey(index)}, a local event in Brønnøysund, Norway?`,
    ]),
  );
}

function toState(
  events: Event[],
): Record<string, EventToCategorize> {
  return Object.fromEntries(
    events.map(({ title, description, location }, index) => [
      eventKey(index),
      { title, description, location },
    ]),
  );
}

function eventKey(index: number): string {
  return `event${index + 1}`;
}

function toCategory(
  answer: DecisionsChoiceAnswer | null,
): EventCategory | undefined {
  const choice = answer?.choice ?? null;
  return isEventCategory(choice) ? choice : undefined;
}

function logOutcome(event: Event, category?: EventCategory): void {
  if (category) {
    logDetail(`${event.title} was labeled as ${category}.`);
    return;
  }

  warnDetail(`${event.title} was not categorized. Asking again next run.`);
}
