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
 * stylesheet lays them out in another order than the markup. Texts are joined only when they share
 * the same block of the page: a title and the <span> beside it are one line, while two cells of a
 * table row stay apart, since a row holds a title and a date that must be told from each other.
 *
 * Nothing in here may name a function, not even an arrow in a const: the build renames functions
 * with a helper that does not exist in the browser this is sent to.
 */
function toLines(root: Element): Line[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  const blocks: Element[] = [];
  const texts: {
    text: string;
    block: number;
    top: number;
    left: number;
    href?: string;
  }[] = [];

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

      let block: Element = parent;
      while (
        block !== root &&
        block.parentElement &&
        getComputedStyle(block).display.startsWith("inline")
      )
        block = block.parentElement;

      if (!blocks.includes(block)) blocks.push(block);
      const link = parent.closest("a");

      if (rect.width > 0 && rect.height > 0)
        texts.push({
          text,
          block: blocks.indexOf(block),
          top: Math.round(rect.top),
          left: rect.left,
          href: link?.origin === location.origin ? link.href : undefined,
        });
    }

    node = walker.nextNode();
  }

  texts.sort((first, second) => first.top - second.top || first.left - second.left);

  const lines: Line[] = [];
  let lineBlock: number | null = null;
  for (const text of texts) {
    const sameLine = text.block === lineBlock && lines.length > 0;
    if (sameLine) {
      const line = lines[lines.length - 1];
      line.text = `${line.text} ${text.text}`;
      line.href = line.href ?? text.href;
    } else {
      lines.push({ text: text.text, href: text.href });
      lineBlock = text.block;
    }
  }

  return lines;
}
