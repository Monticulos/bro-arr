import type { Event } from "../../../shared/src/types/Event";
import { DecisionModel } from "./DecisionModel.js";
import { norwegianDate } from "../utils/norwegianTime.js";
import { logDetail, logPhase, warnDetail } from "../utils/logger.js";

/** Deleting an event that is not a duplicate hides it from readers, so only delete when the model is sure. */
const MIN_DUPLICATE_PROBABILITY = 0.7;

type EventToCompare = Pick<
  Event,
  "title" | "description" | "startDate" | "location"
>;

/** Apify records are richer, and their ids stay stable when a source revises the start time. */
type CandidatePair = { apifyEvent: Event; puppeteerEvent: Event };

export async function deleteDuplicateEvents(events: Event[]): Promise<Event[]> {
  const candidatePairs = findCandidatePairs(events);
  const sameEventProbabilities =
    await askWhetherPairsAreTheSameEvent(candidatePairs);

  const duplicates = candidatePairs.filter(
    (_, index) =>
      (sameEventProbabilities[pairKey(index)] ?? 0) >= MIN_DUPLICATE_PROBABILITY,
  );
  duplicates.forEach(({ apifyEvent, puppeteerEvent }) =>
    logDetail(`${puppeteerEvent.title} duplicates ${apifyEvent.title}.`),
  );

  const duplicateIds = new Set(
    duplicates.map(({ puppeteerEvent }) => puppeteerEvent.id),
  );
  logPhase(
    duplicateIds.size > 0
      ? `Removed ${duplicateIds.size} duplicate events.`
      : "No duplicate events found.",
  );
  return events.filter((event) => !duplicateIds.has(event.id));
}

function isApifyEvent(event: Event): boolean {
  // Apify IDs only contain digits
  return /^\d+$/.test(event.id);
}

function startsOnTheSameDay(eventA: Event, eventB: Event): boolean {
  return norwegianDate(eventA.startDate) === norwegianDate(eventB.startDate);
}

function findCandidatePairs(events: Event[]): CandidatePair[] {
  const puppeteerEvents = events.filter((event) => !isApifyEvent(event));

  return events
    .filter(isApifyEvent)
    .flatMap((apifyEvent) =>
      puppeteerEvents
        .filter((puppeteerEvent) => startsOnTheSameDay(apifyEvent, puppeteerEvent))
        .map((puppeteerEvent) => ({ apifyEvent, puppeteerEvent })),
    );
}

async function askWhetherPairsAreTheSameEvent(
  pairs: CandidatePair[],
): Promise<Record<string, number | null>> {
  if (pairs.length === 0) return {};

  const decisions = new DecisionModel();
  try {
    return await decisions.nouls(toQuestions(pairs), toState(pairs));
  } catch (error) {
    warnDetail(`Failed to compare ${pairs.length} pairs of events:`, error);
    return {};
  }
}

function toQuestions(pairs: CandidatePair[]): Record<string, string> {
  return Object.fromEntries(
    pairs.map((_, index) => [
      pairKey(index),
      `Are the two events in ${pairKey(index)} one local event listed twice by different sources, rather than two separate occurrences held at different times?`,
    ]),
  );
}

function toState(
  pairs: CandidatePair[],
): Record<string, Record<string, EventToCompare>> {
  return Object.fromEntries(
    pairs.map(({ apifyEvent, puppeteerEvent }, index) => [
      pairKey(index),
      {
        first: toEventToCompare(apifyEvent),
        second: toEventToCompare(puppeteerEvent),
      },
    ]),
  );
}

function toEventToCompare({
  title,
  description,
  startDate,
  location,
}: Event): EventToCompare {
  return { title, description, startDate, location };
}

function pairKey(index: number): string {
  return `pair${index + 1}`;
}
