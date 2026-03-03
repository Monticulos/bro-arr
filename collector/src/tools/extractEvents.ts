import puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import type { Source } from "../sources.js";

const MAX_TEXT_LENGTH = 8000;
const TRUNCATION_MARKER = "\n...[truncated]";
const RENDER_WAIT_MS = 2500;
const ELEMENTS_TO_REMOVE = "script, style, noscript, nav, footer, header, aside";

export function cleanHtml(html: string): string {
  const $ = cheerio.load(html);
  $(ELEMENTS_TO_REMOVE).remove();
  return $.text().replace(/\s+/g, " ").trim();
}

export function truncateText(text: string): string {
  if (text.length <= MAX_TEXT_LENGTH) return text;
  return text.slice(0, MAX_TEXT_LENGTH - TRUNCATION_MARKER.length) + TRUNCATION_MARKER;
}

export async function extractEvents(source: Source): Promise<string> {
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(source.url, { waitUntil: "networkidle2" });
    await new Promise((resolve) => setTimeout(resolve, RENDER_WAIT_MS));

    let html: string;
    if (source.selector) {
      const element = await page.$(source.selector);
      html = element ? await page.evaluate((el) => el.innerHTML, element) : "";
    } else {
      html = await page.content();
    }

    await browser.close();

    const cleanedText = cleanHtml(html);
    return truncateText(cleanedText);
  } catch (error) {
    console.warn(`Failed to extract events from ${source.name}:`, error);
    return "";
  }
}
