import puppeteer, { type Page } from "puppeteer";
import type { Source } from "../sources.js";
import { TIMEZONE } from "../utils/norwegianTime.js";
import { warnDetail } from "../utils/logger.js";

/** A page can fill itself in after the network goes quiet, so read until it stops growing. */
const SETTLE_ATTEMPTS = 6;
const SETTLE_DELAY = 1_000;

/** One line of the page, the way it would come out of a printer. */
export interface Line {
  text: string;
  /** How far down the page it is painted, which is how a gap between parts is spotted. */
  top: number;
  /** A link on this line that stays on the source's own site, so off-site tickets never win. */
  href?: string;
}

/** The whole page as lines, in the order a reader's eye moves down it. */
export async function readPageLines(source: Source): Promise<Line[]> {
  const browser = await puppeteer.launch({
    headless: true,
    args: process.env.CI ? ["--no-sandbox"] : [],
  });

  try {
    const page = await browser.newPage();
    await page.emulateTimezone(TIMEZONE);
    await page.goto(source.url, { waitUntil: "networkidle2" });
    return await readSettledLines(page);
  } catch (error) {
    warnDetail(`Failed to read ${source.name}:`, error);
    return [];
  } finally {
    await browser.close();
  }
}

/** A list that stopped growing is a page that stopped rendering. */
async function readSettledLines(page: Page): Promise<Line[]> {
  let previous: Line[] = [];

  for (let attempt = 0; attempt < SETTLE_ATTEMPTS; attempt++) {
    const lines = await page.$eval("body", toLines);
    if (lines.length > 0 && lines.length === previous.length) return lines;

    previous = lines;
    await new Promise((resolve) => setTimeout(resolve, SETTLE_DELAY));
  }

  return previous;
}

/**
 * Runs inside the browser, reading every visible piece of text rather than every element: a title
 * written beside a <span> belongs to no element of its own, and a walk over elements loses it.
 *
 * Each text is measured where it is painted, so the lines come back in reading order even when the
 * stylesheet lays them out in another order than the markup.
 *
 * Texts are never joined together. Two of them printed side by side are still two answers: a page
 * writing "11:00 – 14:00" is giving a start and an end, and a line can only be labelled once.
 *
 * Nothing in here may name a function, not even an arrow in a const: the build renames functions
 * with a helper that does not exist in the browser this is sent to.
 */
function toLines(root: Element): Line[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  const lines: (Line & { left: number })[] = [];

  let node = walker.nextNode();
  while (node) {
    const text = node.textContent?.replace(/\s+/g, " ").trim() ?? "";
    const parent = node.parentElement;
    const isReadable =
      text !== "" &&
      parent !== null &&
      !parent.closest("script, style, noscript, template") &&
      parent.checkVisibility();

    if (isReadable) {
      range.selectNodeContents(node);
      const rect = range.getBoundingClientRect();
      const link = parent.closest("a");

      if (rect.width > 0 && rect.height > 0)
        lines.push({
          text,
          top: Math.round(rect.top),
          left: rect.left,
          href: link?.origin === location.origin ? link.href : undefined,
        });
    }

    node = walker.nextNode();
  }

  lines.sort((first, second) => first.top - second.top || first.left - second.left);

  return lines.map(({ text, top, href }) => ({ text, top, href }));
}
