import puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import type { Source } from "../sources.js";

const MAX_TEXT_LENGTH = 8000;
const TRUNCATION_MARKER = "\n...[truncated]";
const ELEMENTS_TO_REMOVE = "script, style, noscript, nav, footer, header, aside, link, meta";
const NON_ANCHOR_TAG = /<(?!\/?a[\s>])[^>]*>/gi;
const CONSECUTIVE_WHITESPACE = /\s+/g;

async function launchBrowserAndNavigate(url: string) {
  const browser = await puppeteer.launch({
    headless: true,
    args: process.env.CI ? ["--no-sandbox"] : [],
  });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2" });
  return { browser, page };
}

export function cleanHtml(html: string): string {
  const $ = cheerio.load(html);
  $(ELEMENTS_TO_REMOVE).remove();
  const htmlContent = $.html() ?? "";
  return htmlContent.replace(NON_ANCHOR_TAG, " ").replace(CONSECUTIVE_WHITESPACE, " ").trim();
}

export function truncateText(text: string): string {
  if (text.length <= MAX_TEXT_LENGTH) return text;
  return text.slice(0, MAX_TEXT_LENGTH - TRUNCATION_MARKER.length) + TRUNCATION_MARKER;
}

export async function extractEvents(source: Source): Promise<string> {
  const { browser, page } = await launchBrowserAndNavigate(source.url);

  try {
    const selector = source.selector ?? "body";
    const html = await page.$eval(selector, (el) => el.innerHTML);
    
    const cleanedText = cleanHtml(html);
    return truncateText(cleanedText);
  } catch (error) {
    console.warn(`Failed to extract events from ${source.name}:`, error);
    return "";
  } finally {
    await browser.close();
  }
}
