import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";

/** What a cheerio query returns, named here because cheerio does not export it. */
type Selection = ReturnType<CheerioAPI>;

const ELEMENTS_TO_REMOVE = "script, style, noscript";
const CONSECUTIVE_WHITESPACE = /\s+/g;
const MIN_GROUP_SIZE = 2;
const MAX_CANDIDATE_GROUPS = 10;

/** Sibling elements that share a tag and classes, so they are likely one event each. */
export interface CandidateGroup {
  signature: string;
  containers: string[];
}

/** One element holding text and nothing but text, such as a title or a date. */
export interface Piece {
  tag: string;
  text: string;
  href?: string;
}

export function findCandidateGroups(html: string): CandidateGroup[] {
  const $ = loadHtml(html);

  return largestPerSignature(
    $("*")
      .toArray()
      .flatMap((parent) => repeatedChildGroups($, $(parent).children())),
  )
    .sort((first, second) => second.containers.length - first.containers.length)
    .slice(0, MAX_CANDIDATE_GROUPS);
}

export function readPieces(html: string): Piece[] {
  const $ = loadHtml(html);

  return $("*")
    .toArray()
    .filter((element) => $(element).children().length === 0)
    .map((element) => ({
      tag: elementSignature($(element)),
      text: normalizeWhitespace($(element).text()),
      href: $(element).closest("a").attr("href"),
    }))
    .filter((piece) => piece.text !== "");
}

/** An absolute url for a link that stays on the source's own site, so off-site tickets never win. */
export function toOwnUrl(href: string, sourceUrl: string): string | null {
  const url = toAbsoluteUrl(href, sourceUrl);
  return url?.host === new URL(sourceUrl).host ? url.href : null;
}

/** The first link in the container that stays on the source's own site. */
export function findEventUrl(containerHtml: string, sourceUrl: string): string {
  const $ = loadHtml(containerHtml);

  const ownUrls = $("a[href]")
    .toArray()
    .flatMap((anchor) => toOwnUrl($(anchor).attr("href") ?? "", sourceUrl) ?? []);

  return ownUrls[0] ?? sourceUrl;
}

function loadHtml(html: string): CheerioAPI {
  const $ = cheerio.load(html);
  $(ELEMENTS_TO_REMOVE).remove();
  return $;
}

function repeatedChildGroups(
  $: CheerioAPI,
  children: Selection,
): CandidateGroup[] {
  const bySignature = new Map<string, string[]>();

  children.each((_, child) => {
    const signature = elementSignature($(child));
    bySignature.set(signature, [
      ...(bySignature.get(signature) ?? []),
      $.html(child),
    ]);
  });

  return [...bySignature]
    .filter(([, containers]) => containers.length >= MIN_GROUP_SIZE)
    .map(([signature, containers]) => ({ signature, containers }))
    .filter(({ containers }) => containers.some(holdsText));
}

function largestPerSignature(groups: CandidateGroup[]): CandidateGroup[] {
  const largest = new Map<string, CandidateGroup>();

  groups.forEach((group) => {
    const current = largest.get(group.signature);
    const isLarger = !current || current.containers.length < group.containers.length;
    if (isLarger) largest.set(group.signature, group);
  });

  return [...largest.values()];
}

function elementSignature($element: Selection): string {
  const tagName = String($element.prop("tagName") ?? "").toLowerCase();
  const classNames = ($element.attr("class") ?? "")
    .split(CONSECUTIVE_WHITESPACE)
    .filter(Boolean)
    .sort();

  return [tagName, ...classNames].join(".");
}

function holdsText(html: string): boolean {
  return readPieces(html).length > 0;
}

function normalizeWhitespace(text: string): string {
  return text.replace(CONSECUTIVE_WHITESPACE, " ").trim();
}

function toAbsoluteUrl(href: string, sourceUrl: string): URL | null {
  try {
    return new URL(href, sourceUrl);
  } catch {
    return null;
  }
}
