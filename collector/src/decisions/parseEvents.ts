import type { Event } from "../../../shared/src/types/Event";
import type { Source } from "../sources.js";
import {
  DecisionModel,
  type ChoiceCriteria,
  type State,
} from "./DecisionModel.js";
import type { Line } from "../puppeteer/readPageLines.js";
import { parseNorwegianDate } from "../utils/parseNorwegianDate.js";
import { norwegianTimeToUtc } from "../utils/norwegianTime.js";
import { generateEventId } from "../utils/generateEventId.js";
import { mapLocation } from "../utils/mapLocation.js";
import { logDetail } from "../utils/logger.js";

/** Below this the model is only guessing, and a guess here invents an event that is not on the page. */
const MIN_CONFIDENCE = 0.6;
const MIN_PROBABILITY = 0.5;

const EVENT_FIELDS = [
  "title",
  "date",
  "startTime",
  "endTime",
  "location",
  "description",
] as const;
type EventField = (typeof EVENT_FIELDS)[number];
type FieldTexts = Record<EventField, string[]>;

const FIELD_CRITERIA: ChoiceCriteria = {
  title: "The name of the event, as it would be printed in a programme.",
  date: "The day the event happens: a weekday, a date, or a date followed by a time.",
  startTime: "The time of day the event begins, or the only time of day given.",
  endTime:
    "The time of day the event ends, written after a start time or after a dash.",
  location:
    "The name of the venue, room or address where the event happens, rather than the word introducing it.",
  description: "A sentence or phrase saying what the event is about.",
  other:
    "Anything else: a label introducing the line after it rather than saying anything itself, a heading, a category, a price, a button, a menu item, or text that is not about an event.",
};

interface LabelledLine extends Line {
  field?: EventField;
}

/**
 * Reads a page the way a person reads a printout: find where each event starts, read what every
 * line says, then check that what was assembled is really an event. Every word is copied from the
 * page itself, so an event can only be mislabelled, never invented.
 */
export async function parseEvents(
  source: Source,
  lines: Line[],
): Promise<Event[]> {
  if (lines.length === 0) return [];

  const [startsEvent, fields] = await Promise.all([
    askWhereEventsStart(source, lines),
    askWhatEachLineSays(source, lines),
  ]);

  const labelled = lines.map((line, index) => ({
    ...line,
    field: fields[index],
  }));

  const events = withBorrowedDates(splitWhereEventsStart(labelled, startsEvent))
    .map((eventLines) => toEvent(source, eventLines))
    .filter((event): event is Event => event !== null);

  return keepRealEvents(source, events);
}

/** Question one: where does each event begin? */
async function askWhereEventsStart(
  source: Source,
  lines: Line[],
): Promise<boolean[]> {
  const probabilities = await new DecisionModel().nouls(
    toLineQuestions(
      lines,
      (key) =>
        `${key} of the ${source.name} page is the first line of an event. A page often writes the day or the time above the name, and then the event starts on that line rather than on its name. Every line below it belongs to the same event, until the next event's first line.`,
    ),
    toLineState(source, lines),
  );

  return lines.map(
    (_, index) => (probabilities[lineKey(index)] ?? 0) >= MIN_PROBABILITY,
  );
}

/** Question two: what does each line say about the event it belongs to? */
async function askWhatEachLineSays(
  source: Source,
  lines: Line[],
): Promise<(EventField | undefined)[]> {
  const answers = await new DecisionModel().choices(
    toLineQuestions(
      lines,
      (key) =>
        `What does ${key} of the ${source.name} page say about the event it belongs to?`,
    ),
    FIELD_CRITERIA,
    toLineState(source, lines),
    MIN_CONFIDENCE,
  );

  return lines.map((_, index) => toEventField(answers[lineKey(index)]?.choice));
}

/** Question three: is what we assembled something a person could actually turn up to? */
async function keepRealEvents(
  source: Source,
  events: Event[],
): Promise<Event[]> {
  if (events.length === 0) return [];

  const probabilities = await new DecisionModel().nouls(
    Object.fromEntries(
      events.map((_, index) => [
        eventKey(index),
        `${eventKey(index)} is a real event that people can turn up to at a place and time, rather than a news article, a notice, a menu item or a heading.`,
      ]),
    ),
    {
      source: source.name,
      ...Object.fromEntries(
        events.map((event, index) => [
          eventKey(index),
          { title: event.title, starts: event.startDate, where: event.location },
        ]),
      ),
    },
  );

  const real = events.filter(
    (_, index) => (probabilities[eventKey(index)] ?? 0) >= MIN_PROBABILITY,
  );
  logDetail(`Kept ${real.length} of ${events.length} assembled events.`);
  return real;
}

/** The page's own words, shared by both line questions so the second is prompt-cached. */
function toLineState(source: Source, lines: Line[]): State {
  return {
    source: source.name,
    ...toLineQuestions(lines, (_, index) => lines[index].text),
  };
}

function toLineQuestions<Value>(
  lines: Line[],
  toValue: (key: string, index: number) => Value,
): Record<string, Value> {
  return Object.fromEntries(
    lines.map((_, index) => [lineKey(index), toValue(lineKey(index), index)]),
  );
}

function lineKey(index: number): string {
  return `line${index + 1}`;
}

function eventKey(index: number): string {
  return `event${index + 1}`;
}

function toEventField(choice: string | undefined): EventField | undefined {
  return EVENT_FIELDS.includes(choice as EventField)
    ? (choice as EventField)
    : undefined;
}

/** Every line joins the event that started above it, and anything before the first one is page furniture. */
function splitWhereEventsStart(
  lines: LabelledLine[],
  startsEvent: boolean[],
): LabelledLine[][] {
  const events: LabelledLine[][] = [];

  lines.forEach((line, index) => {
    if (startsEvent[index]) events.push([]);
    events[events.length - 1]?.push(line);
  });

  return events;
}

/** A calendar writes the day once above several events, so an event without one borrows the day above it. */
function withBorrowedDates(events: LabelledLine[][]): LabelledLine[][] {
  return events.map((event, index) => {
    if (event.some(isDate)) return event;

    const dayAbove = events
      .slice(0, index)
      .reverse()
      .find((earlier) => earlier.some(isDate));

    return [...(dayAbove?.filter(isDate) ?? []), ...event];
  });
}

function isDate(line: LabelledLine): boolean {
  return line.field === "date";
}

function isTitle(line: LabelledLine): boolean {
  return line.field === "title";
}

function toEvent(source: Source, lines: LabelledLine[]): Event | null {
  const texts = toFieldTexts(lines);
  const title = joinTexts(texts.title);
  const startDate = toStartDate(texts);
  /** The last one, since a page writes "Plassering" before the venue and the street after the house. */
  const location = texts.location.at(-1);
  if (!title || !startDate) return null;

  return {
    id: generateEventId(source.name, startDate),
    title,
    description: joinTexts(texts.description) || title,
    startDate,
    endDate: toEndDate(texts, startDate),
    location: location ? mapLocation(location) : source.name,
    url: toEventUrl(lines, source.url),
    collectedAt: new Date().toISOString(),
  };
}

function toFieldTexts(lines: LabelledLine[]): FieldTexts {
  return Object.fromEntries(
    EVENT_FIELDS.map((field) => [
      field,
      lines.filter((line) => line.field === field).map((line) => line.text),
    ]),
  ) as FieldTexts;
}

function toStartDate({ date, startTime }: FieldTexts): string | null {
  return toUtcDate([...date, ...startTime]);
}

/** Dropped unless it is after the start, so an end we cannot trust is left out entirely. */
function toEndDate(
  { date, endTime }: FieldTexts,
  startDate: string,
): string | undefined {
  const endDate = toUtcDate([...date, ...endTime]);
  return endTime.length > 0 && endDate && endDate > startDate
    ? endDate
    : undefined;
}

function toUtcDate(texts: string[]): string | null {
  const localDatetime = parseNorwegianDate(joinTexts(texts), new Date());
  return localDatetime && norwegianTimeToUtc(localDatetime);
}

/** The link on the title's own line, so two events under one heading keep their own pages. */
function toEventUrl(lines: LabelledLine[], sourceUrl: string): string {
  const titleHref = lines.find(isTitle)?.href;
  return titleHref ?? lines.find((line) => line.href)?.href ?? sourceUrl;
}

function joinTexts(texts: string[]): string {
  return texts.join(" ").trim();
}
