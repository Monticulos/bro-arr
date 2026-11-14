import { DecisionModel } from "./DecisionModel.js";
import {
  CATEGORY_CRITERIA,
  isEventCategory,
  type EventCategory,
} from "./categoryCriteria.js";

/** Below this the model is only guessing between categories, so the event is left uncategorized. */
const MIN_CONFIDENCE = 0.3;

export interface EventToCategorize {
  title: string;
  description: string;
  location?: string;
}

export async function categorizeEvent(
  event: EventToCategorize,
): Promise<EventCategory> {
  const decisions = new DecisionModel("google/gemini-decision-1");
  const category = await decisions.choice(
    "Which category best describes this local event in Brønnøysund, Norway?",
    CATEGORY_CRITERIA,
    { ...event },
    MIN_CONFIDENCE,
  );
  return isEventCategory(category) ? category : "annet";
}
