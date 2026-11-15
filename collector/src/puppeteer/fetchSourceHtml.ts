import puppeteer from "puppeteer";
import type { Source } from "../sources.js";
import { warnDetail } from "../utils/logger.js";

const TIMEZONE = "Europe/Oslo";

async function launchBrowser() {
  const browser = await puppeteer.launch({
    headless: true,
    args: process.env.CI ? ["--no-sandbox"] : [],
  });
  const page = await browser.newPage();
  await page.emulateTimezone(TIMEZONE);
  return { browser, page };
}

/** The selected section as outer HTML - inner HTML alone loses the rows of a table. */
export async function fetchSourceHtml(source: Source): Promise<string> {
  const { browser, page } = await launchBrowser();

  try {
    await page.goto(source.url, { waitUntil: "networkidle2" });
    return await page.$eval(source.selector ?? "body", (el) => el.outerHTML);
  } catch (error) {
    warnDetail(`Failed to fetch HTML from ${source.name}:`, error);
    return "";
  } finally {
    await browser.close();
  }
}
