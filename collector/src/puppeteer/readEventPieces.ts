import puppeteer, { type Page } from "puppeteer";
import type { Source } from "../sources.js";
import { TIMEZONE } from "../utils/norwegianTime.js";
import { warnDetail } from "../utils/logger.js";

const RENDER_TIMEOUT = 10_000;

/** One element holding text and nothing but text, such as a title or a date. */
export interface Piece {
  tag: string;
  text: string;
  /** The card, row or item the piece sits in, so pieces of one event stay together. */
  block: number;
  /** A link to this event on the source's own site, so off-site ticket shops never win. */
  href?: string;
}

/** Every visible leaf element of the source's section, read in one pass over the live page. */
export async function readEventPieces(source: Source): Promise<Piece[]> {
  const selector = source.selector ?? "body";
  const browser = await puppeteer.launch({
    headless: true,
    args: process.env.CI ? ["--no-sandbox"] : [],
  });

  try {
    const page = await browser.newPage();
    await page.emulateTimezone(TIMEZONE);
    await page.goto(source.url, { waitUntil: "networkidle2" });
    await waitForRenderedContent(page, source);
    return await page.$eval(selector, toPieces);
  } catch (error) {
    warnDetail(`Failed to read ${source.name}:`, error);
    return [];
  } finally {
    await browser.close();
  }
}

/** A source that fills itself in after loading says so, since a loaded page is not a filled one. */
async function waitForRenderedContent(page: Page, source: Source): Promise<void> {
  if (!source.waitFor) return;

  await page
    .waitForSelector(`${source.selector} ${source.waitFor}`, {
      timeout: RENDER_TIMEOUT,
    })
    .catch(() =>
      warnDetail(`No ${source.waitFor} rendered on ${source.name}. Reading it as it is.`),
    );
}

/**
 * Runs inside the browser, where innerText collapses the whitespace, checkVisibility hides what
 * the reader cannot see, and an anchor resolves its own href and origin. Only HTML elements
 * qualify: an SVG leaf such as a <path> is an Element with no innerText at all.
 *
 * A page states how many events it has by repeating the markup of one: the outermost ancestor
 * standing among look-alike siblings is the card, row or item holding a single event.
 *
 * Nothing in here may name a function, not even an arrow in a const: the build renames functions
 * with a helper that does not exist in the browser this is sent to.
 */
function toPieces(root: Element): Piece[] {
  const blocks: Element[] = [];

  return [...root.querySelectorAll("*")]
    .filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement &&
        element.children.length === 0 &&
        element.checkVisibility(),
    )
    .map((element) => {
      let block: Element | null = null;
      for (
        let node: Element | null = element;
        node && node !== root;
        node = node.parentElement
      ) {
        const siblings = [...(node.parentElement?.children ?? [])];
        const shapes = siblings.map(
          (sibling) => sibling.tagName + [...sibling.classList].sort().join("."),
        );
        const shape = shapes[siblings.indexOf(node)];
        if (shapes.filter((other) => other === shape).length > 1) block = node;
      }

      if (block && !blocks.includes(block)) blocks.push(block);
      const link = element.closest("a");

      return {
        tag: element.tagName.toLowerCase(),
        text: element.innerText.replace(/\s+/g, " ").trim(),
        block: block ? blocks.indexOf(block) : -1,
        href: link?.origin === location.origin ? link.href : undefined,
      };
    })
    .filter((piece) => piece.text !== "");
}
