import { DecisionModel } from "./DecisionModel.js";
import {
  CATEGORY_CRITERIA,
  isEventCategory,
  type EventCategory,
} from "./categoryCriteria.js";

/** Below this the model is only guessing between categories, so the event is left uncategorized. */
const MIN_CONFIDENCE = 0.3;

export type EventToCategorize = {
  title: string;
  description: string;
  location?: string;
};

export async function categorizeEvent(
  event: EventToCategorize,
): Promise<EventCategory> {
  const category = await chooseCategory(event);
  return isEventCategory(category) ? category : "annet";
}

async function chooseCategory(
  event: EventToCategorize,
): Promise<string | null> {
  const decisions = new DecisionModel("google/gemini-decision-1");
  try {
    return await decisions.choice(
      "Which category best describes this local event in Brønnøysund, Norway?",
      CATEGORY_CRITERIA,
      event,
      MIN_CONFIDENCE,
    );
  } catch (error) {
    console.warn(`  Failed to categorize "${event.title}":`, error);
    return null;
  }
}
