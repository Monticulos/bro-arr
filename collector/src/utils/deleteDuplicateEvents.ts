import type { Event } from "../../../types/Event";

const MIN_WORD_LENGTH = 4;
const SIMILARITY_THRESHOLD = 0.5;
const DUPLICATE_BOUNDARY_MS = 60 * 60 * 1000;

function isApifyEvent(event: Event): boolean {
  // Apify IDs only contain digits
  return /^\d+$/.test(event.id);
}

function extractSignificantWords(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // Replace punctuation with space
    .split(/\s+/) // Split on whitespace
    .filter((word) => word.length >= MIN_WORD_LENGTH);
}

export function hasSimilarTitle(titleA: string, titleB: string): boolean {
  const wordsA = extractSignificantWords(titleA);
  const wordsB = extractSignificantWords(titleB);

  if (wordsA.length === 0 || wordsB.length === 0) {
    return false;
  }

  const shorterWords = wordsA.length <= wordsB.length ? wordsA : wordsB;
  const longerWords = new Set(wordsA.length > wordsB.length ? wordsA : wordsB);

  const matchCount = shorterWords.filter((word) => longerWords.has(word)).length;
  return matchCount / shorterWords.length >= SIMILARITY_THRESHOLD;
}

function hasCloseTime(startDateA: string, startDateB: string): boolean {
  const timeDifference = Math.abs(
    new Date(startDateA).getTime() - new Date(startDateB).getTime()
  );
  return timeDifference < DUPLICATE_BOUNDARY_MS;
}

export function isDuplicate(apifyEvent: Event, puppeteerEvent: Event): boolean {
  return (
    hasCloseTime(apifyEvent.startDate, puppeteerEvent.startDate) &&
    hasSimilarTitle(apifyEvent.title, puppeteerEvent.title)
  );
}

export function findDuplicateIds(events: Event[]): Set<string> {
  const apifyEvents = events.filter(isApifyEvent);
  const puppeteerEvents = events.filter((e) => !isApifyEvent(e));
  const duplicateIds = new Set<string>();

  for (const puppeteerEvent of puppeteerEvents) {
    const hasDuplicate = apifyEvents.some((apifyEvent) =>
      isDuplicate(apifyEvent, puppeteerEvent)
    );

    if (hasDuplicate) {
      duplicateIds.add(puppeteerEvent.id);
    }
  }

  return duplicateIds;
}

export function deleteDuplicateEvents(events: Event[]): Event[] {
  const duplicateIds = findDuplicateIds(events);

  if (duplicateIds.size === 0) {
    console.log("No duplicate events found.");
    return events;
  }

  console.log(`Removed ${duplicateIds.size} duplicate events.`);
  return events.filter((event) => !duplicateIds.has(event.id));
}
