import type { Event } from "../../../shared/src/types/Event";
import type { Source } from "../sources.js";
import {
  DecisionModel,
  type Answers,
  type ChoiceCriteria,
  type Questions,
} from "./DecisionModel.js";
import type { Piece } from "../puppeteer/readEventPieces.js";
import { parseNorwegianDate } from "../utils/parseNorwegianDate.js";
import { norwegianTimeToUtc } from "../utils/norwegianTime.js";
import { generateEventId } from "../utils/generateEventId.js";
import { mapLocation } from "../utils/mapLocation.js";
import { logDetail, warnDetail } from "../utils/logger.js";

/** Below this the model is only guessing, and a guess here invents an event that is not on the page. */
const MIN_CONFIDENCE = 0.6;

/** A news list reads much like an event list, so a page has to earn its events. */
const MIN_EVENT_LIST_PROBABILITY = 0.5;

const LISTS_EVENTS = "listsEvents";

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
    "Anything else: a label introducing the piece after it rather than saying anything itself, a column heading, a category, a price, a button, a separator, or text that is not about an event.",
};

interface LabelledPiece extends Piece {
  field: EventField;
}

/** Builds events out of a source page, copying every word from the page itself. */
export async function parseEvents(
  source: Source,
  pieces: Piece[],
): Promise<Event[]> {
  const labelledPieces = await labelPieces(source, pieces);

  return groupByBlock(labelledPieces)
    .flatMap(splitAtTitles)
    .map((eventPieces) => toEvent(source, eventPieces))
    .filter((event): event is Event => event !== null);
}

/** The markup decides where one event ends and the next begins, so a block is never crossed. */
function groupByBlock(pieces: LabelledPiece[]): LabelledPiece[][] {
  const blocks = new Map<number, LabelledPiece[]>();
  pieces.forEach((piece) =>
    blocks.set(piece.block, [...(blocks.get(piece.block) ?? []), piece]),
  );

  return [...blocks.values()];
}

/** One request asks whether the page lists events at all and what every piece of it says. */
async function labelPieces(
  source: Source,
  pieces: Piece[],
): Promise<LabelledPiece[]> {
  try {
    const { answers } = await new DecisionModel().create({
      state: {
        source: source.name,
        ...pieceEntries(pieces, ({ tag, text }) => ({ tag, text })),
      },
      questions: toQuestions(source, pieces),
    });

    const probability = eventListProbability(answers);
    if (probability < MIN_EVENT_LIST_PROBABILITY) {
      logDetail(`${source.name} lists no events (${probability.toFixed(2)}).`);
      return [];
    }

    return toLabelledPieces(pieces, answers);
  } catch (error) {
    warnDetail(`Failed to read the events on ${source.name}:`, error);
    return [];
  }
}

function toQuestions(source: Source, pieces: Piece[]): Questions {
  return {
    [LISTS_EVENTS]: {
      type: "noul",
      instructions: `The ${source.name} page lists events happening at a place and time, rather than news articles, links or menu items.`,
    },
    ...pieceEntries(pieces, (_, index) => ({
      type: "choice" as const,
      instructions: `What does ${pieceKey(index)} say about the event it belongs to?`,
      criteria: FIELD_CRITERIA,
    })),
  };
}

function eventListProbability(answers: Answers): number {
  const answer = answers[LISTS_EVENTS];
  return answer?.type === "noul" ? answer.noul : 0;
}

function toLabelledPieces(pieces: Piece[], answers: Answers): LabelledPiece[] {
  return pieces.flatMap((piece, index) => {
    const answer = answers[pieceKey(index)];
    const field =
      answer?.type === "choice" && (answer.confidence ?? 0) >= MIN_CONFIDENCE
        ? answer.choice
        : undefined;

    return isEventField(field) ? [{ ...piece, field }] : [];
  });
}

function isEventField(field: string | undefined): field is EventField {
  return EVENT_FIELDS.includes(field as EventField);
}

function pieceEntries<Value>(
  pieces: Piece[],
  toValue: (piece: Piece, index: number) => Value,
): Record<string, Value> {
  return Object.fromEntries(
    pieces.map((piece, index) => [pieceKey(index), toValue(piece, index)]),
  );
}

function pieceKey(index: number): string {
  return `piece${index + 1}`;
}

/**
 * One event per title, since a block can hold a whole day. Every other piece of the block joins
 * the title it sits closest to, which keeps a time written above its title with it.
 */
function splitAtTitles(pieces: LabelledPiece[]): LabelledPiece[][] {
  const titleIndexes = pieces.flatMap((piece, index) =>
    isTitle(piece) ? [index] : [],
  );
  if (titleIndexes.length === 0) return [];

  const events: LabelledPiece[][] = titleIndexes.map(() => []);
  pieces.forEach((piece, index) =>
    events[nearestTitle(titleIndexes, index)].push(piece),
  );

  return events.map((event) => withTheBlocksDay(event, events));
}

function isTitle(piece: LabelledPiece): boolean {
  return piece.field === "title";
}

function nearestTitle(titleIndexes: number[], index: number): number {
  const distances = titleIndexes.map((titleIndex) =>
    Math.abs(titleIndex - index),
  );
  return distances.indexOf(Math.min(...distances));
}

/** A calendar writes the day once above the whole block, so an event without one borrows it. */
function withTheBlocksDay(
  event: LabelledPiece[],
  events: LabelledPiece[][],
): LabelledPiece[] {
  if (event.some(isDate)) return event;

  const day = events.find((other) => other.some(isDate))?.filter(isDate);
  return [...(day ?? []), ...event];
}

function isDate(piece: LabelledPiece): boolean {
  return piece.field === "date";
}

function toEvent(source: Source, pieces: LabelledPiece[]): Event | null {
  const texts = toFieldTexts(pieces);
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
    url: toEventUrl(pieces, source.url),
    collectedAt: new Date().toISOString(),
  };
}

function toFieldTexts(pieces: LabelledPiece[]): FieldTexts {
  return Object.fromEntries(
    EVENT_FIELDS.map((field) => [
      field,
      pieces.filter((piece) => piece.field === field).map((piece) => piece.text),
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

/** The link on the title itself, so two events written under one heading keep their own pages. */
function toEventUrl(pieces: LabelledPiece[], sourceUrl: string): string {
  const titleHref = pieces.find(isTitle)?.href;
  return titleHref ?? pieces.find((piece) => piece.href)?.href ?? sourceUrl;
}

function joinTexts(texts: string[]): string {
  return texts.join(" ").trim();
}
