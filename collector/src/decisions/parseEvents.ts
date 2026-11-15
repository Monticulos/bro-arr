import type { DecisionsChoiceAnswer } from "@openrouter/sdk/models";
import type { Event } from "../../../shared/src/types/Event";
import type { Source } from "../sources.js";
import { DecisionModel, type ChoiceCriteria } from "./DecisionModel.js";
import {
  findCandidateGroups,
  findEventUrl,
  readPieces,
  toOwnUrl,
  type CandidateGroup,
  type Piece,
} from "../html/eventPieces.js";
import { parseNorwegianDate } from "../utils/parseNorwegianDate.js";
import { norwegianTimeToUtc } from "../utils/norwegianTime.js";
import { generateEventId } from "../utils/generateEventId.js";
import { mapLocation } from "../utils/mapLocation.js";
import { logDetail, warnDetail } from "../utils/logger.js";

/** Below this the model is only guessing, and a guess here invents an event that is not on the page. */
const MIN_CONFIDENCE = 0.6;

const WHOLE_SECTION = "whole";
const NO_EVENTS = "none";

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
  location: "The venue, room or address where the event happens.",
  description: "A sentence or phrase saying what the event is about.",
  other:
    "Anything else: a category label, a price, a button, a separator, or text that is not about this event.",
};

const PREVIEW_CONTAINERS = 2;
const CONTAINER_PREVIEW_LENGTH = 200;
const PAGE_PREVIEW_LENGTH = 2000;
const PIECE_SEPARATOR = " · ";

interface LabelledPiece {
  field: EventField;
  text: string;
  href?: string;
}

interface LabelledEvent {
  container: string;
  pieces: LabelledPiece[];
}

/** Builds events out of a source page, copying every word from the page itself. */
export async function parseEvents(
  source: Source,
  html: string,
): Promise<Event[]> {
  const containers = await findEventContainers(source, html);
  if (containers.length === 0) return [];

  const labelledEvents = await labelEventPieces(source, containers);

  return labelledEvents
    .map((labelledEvent) => toEvent(source, labelledEvent))
    .filter((event): event is Event => event !== null);
}

async function findEventContainers(
  source: Source,
  html: string,
): Promise<string[]> {
  const groups = findCandidateGroups(html);
  const state = toGroupState(source, html, groups);
  const decisions = new DecisionModel();

  try {
    const choice = await decisions.choice(
      `Which element on the ${source.name} page is the top element of a single event, holding everything about that one event and nothing about any other?`,
      toGroupCriteria(groups),
      state,
      MIN_CONFIDENCE,
    );

    return toContainers(choice, html, groups);
  } catch (error) {
    warnDetail(`Failed to find the events on ${source.name}:`, error);
    return [];
  }
}

function toContainers(
  choice: string | null,
  html: string,
  groups: CandidateGroup[],
): string[] {
  if (choice === WHOLE_SECTION) return [html];

  const group = new Map(
    groups.map((candidate, index) => [groupKey(index), candidate]),
  ).get(choice ?? NO_EVENTS);
  if (!group) return [];

  logDetail(
    `Chose ${group.containers.length} <${group.signature}> elements as the events.`,
  );
  return group.containers;
}

function toGroupState(
  source: Source,
  html: string,
  groups: CandidateGroup[],
): Record<string, unknown> {
  return {
    source: source.name,
    page: toPreview(html, PAGE_PREVIEW_LENGTH),
    ...Object.fromEntries(
      groups.map((group, index) => [
        groupKey(index),
        group.containers
          .slice(0, PREVIEW_CONTAINERS)
          .map((container) => toPreview(container, CONTAINER_PREVIEW_LENGTH)),
      ]),
    ),
  };
}

function toGroupCriteria(groups: CandidateGroup[]): ChoiceCriteria {
  return {
    ...Object.fromEntries(
      groups.map((group, index) => [
        groupKey(index),
        `${group.containers.length} repeated <${group.signature}> elements, one per event.`,
      ]),
    ),
    [WHOLE_SECTION]:
      "The page holds a single event, so the whole section is that one event.",
    [NO_EVENTS]:
      "The page holds no events at all: it lists news articles, links or menu items, or it says there are no events.",
  };
}

function toPreview(html: string, maxLength: number): string {
  return readPieces(html)
    .map((piece) => piece.text)
    .join(PIECE_SEPARATOR)
    .slice(0, maxLength);
}

async function labelEventPieces(
  source: Source,
  containers: string[],
): Promise<LabelledEvent[]> {
  const pieces = containers.map(readPieces);
  const answers = await chooseFields(source, pieces);

  return containers.flatMap((container, containerIndex) =>
    splitAtTitles(
      toLabelledPieces(pieces[containerIndex], containerIndex, answers),
    ).map((eventPieces) => ({ container, pieces: eventPieces })),
  );
}

async function chooseFields(
  source: Source,
  pieces: Piece[][],
): Promise<Record<string, DecisionsChoiceAnswer | null>> {
  const decisions = new DecisionModel();

  try {
    return await decisions.choices(
      toPieceEntries(
        pieces,
        (_, containerIndex, pieceIndex) =>
          `What does ${pieceKey(containerIndex, pieceIndex)} say about the event in ${eventKey(containerIndex)}?`,
      ),
      FIELD_CRITERIA,
      {
        source: source.name,
        ...toPieceEntries(pieces, ({ tag, text }) => ({ tag, text })),
      },
      MIN_CONFIDENCE,
    );
  } catch (error) {
    warnDetail(`Failed to label the events on ${source.name}:`, error);
    return {};
  }
}

function toPieceEntries<Value>(
  pieces: Piece[][],
  toValue: (piece: Piece, containerIndex: number, pieceIndex: number) => Value,
): Record<string, Value> {
  return Object.fromEntries(
    pieces.flatMap((containerPieces, containerIndex) =>
      containerPieces.map((piece, pieceIndex) => [
        pieceKey(containerIndex, pieceIndex),
        toValue(piece, containerIndex, pieceIndex),
      ]),
    ),
  );
}

function toLabelledPieces(
  pieces: Piece[],
  containerIndex: number,
  answers: Record<string, DecisionsChoiceAnswer | null>,
): LabelledPiece[] {
  return pieces.flatMap((piece, pieceIndex) => {
    const field = answers[pieceKey(containerIndex, pieceIndex)]?.choice;
    return isEventField(field) ? [{ ...piece, field }] : [];
  });
}

function isEventField(field: string | undefined): field is EventField {
  return EVENT_FIELDS.includes(field as EventField);
}

/**
 * One event per title, since a container can hold a whole day of events. Every other piece
 * joins the title it sits closest to, which keeps a time written above its title with it.
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

  return events.map((event) => withSharedDate(event, events));
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

/** A calendar writes the day once above the whole day, so an event without one borrows it. */
function withSharedDate(
  event: LabelledPiece[],
  events: LabelledPiece[][],
): LabelledPiece[] {
  if (event.some(isDate)) return event;

  const sharedDate = events.find((other) => other.some(isDate))?.filter(isDate);
  return [...(sharedDate ?? []), ...event];
}

function isDate(piece: LabelledPiece): boolean {
  return piece.field === "date";
}

function toEvent(
  source: Source,
  { container, pieces }: LabelledEvent,
): Event | null {
  const texts = toFieldTexts(pieces);
  const title = joinTexts(texts.title);
  const startDate = toStartDate(texts);
  const location = texts.location[0];
  if (!title || !startDate) return null;

  return {
    id: generateEventId(source.name, startDate),
    title,
    description: joinTexts(texts.description) || title,
    startDate,
    endDate: toEndDate(texts, startDate),
    location: location ? mapLocation(location) : source.name,
    url: toEventUrl(pieces, container, source.url),
    collectedAt: new Date().toISOString(),
  };
}

function toFieldTexts(pieces: LabelledPiece[]): FieldTexts {
  const texts: FieldTexts = {
    title: [],
    date: [],
    startTime: [],
    endTime: [],
    location: [],
    description: [],
  };

  pieces.forEach((piece) => texts[piece.field].push(piece.text));
  return texts;
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

/** The link on the title itself, so two events in one container keep their own pages. */
function toEventUrl(
  pieces: LabelledPiece[],
  container: string,
  sourceUrl: string,
): string {
  const titleHref = pieces.find(isTitle)?.href;

  return (
    (titleHref && toOwnUrl(titleHref, sourceUrl)) ||
    findEventUrl(container, sourceUrl)
  );
}

function joinTexts(texts: string[]): string {
  return texts.join(" ").trim();
}

function groupKey(index: number): string {
  return `group${index + 1}`;
}

function eventKey(index: number): string {
  return `event${index + 1}`;
}

function pieceKey(containerIndex: number, pieceIndex: number): string {
  return `${eventKey(containerIndex)}piece${pieceIndex + 1}`;
}
