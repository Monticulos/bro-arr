import { tool } from "@langchain/core/tools";
import { z } from "zod";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";

const JS_RENDER_THRESHOLD = 500;
const MAX_CHARS = 8000;
export const TRUNCATION_MARKER = "[TEXT TRUNCATED AT 8000 CHARACTERS]";

export function extractText(html: string, selector?: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, nav, footer, header, aside").remove();
  const root = selector ? $(selector) : $("body");
  return root.text().replace(/\s+/g, " ").trim();
}

export function truncate(text: string): string {
  if (text.length <= MAX_CHARS) return text;
  return text.slice(0, MAX_CHARS) + TRUNCATION_MARKER;
}

async function fetchWithPuppeteer(url: string, selector?: string): Promise<string> {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });
    // Give client-side routers extra time to render after network settles
    await new Promise((resolve) => setTimeout(resolve, 2500));
    const html = await page.content();
    return truncate(extractText(html, selector));
  } finally {
    await browser.close();
  }
}

async function fetchWithRetry(url: string, selector?: string, retries = 3): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url);
      const html = await response.text();
      const text = extractText(html, selector);

      if (text.length < JS_RENDER_THRESHOLD) {
        return await fetchWithPuppeteer(url, selector);
      }

      return truncate(text);
    } catch (error) {
      if (attempt === retries) throw error;
      const delayMs = Math.pow(2, attempt) * 500;
      console.warn(`[fetchPage] Retry ${attempt}/${retries - 1} for ${url} after ${delayMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error("Unreachable");
}

export const fetchPage = tool(
  async ({ url, selector }) => {
    try {
      return await fetchWithRetry(url, selector);
    } catch {
      try {
        return await fetchWithPuppeteer(url, selector);
      } catch (error) {
        return `FETCH_ERROR: ${error instanceof Error ? error.message : String(error)}. Skip this source and move on to the next one.`;
      }
    }
  },
  {
    name: "fetchPage",
    description:
      "Fetch a webpage and return clean plain text suitable for event extraction. Automatically uses a headless browser for JavaScript-rendered pages.",
    schema: z.object({
      url: z.string().url(),
      selector: z
        .string()
        .optional()
        .describe(
          "Optional CSS selector to focus on a specific page section (e.g. 'article', '.news-list'). Reduces noise in the extraction input."
        ),
    }),
  }
);
