import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const SITE_URL = "https://broarr.no/";
const currentDir = dirname(fileURLToPath(import.meta.url));
const SITEMAP_PATH = resolve(currentDir, "../../../web/public/sitemap.xml");

export function buildSitemapXml(lastmod: string): string {
  const date = lastmod.split("T")[0];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    "  <url>",
    `    <loc>${SITE_URL}</loc>`,
    `    <lastmod>${date}</lastmod>`,
    "    <changefreq>daily</changefreq>",
    "    <priority>1.0</priority>",
    "  </url>",
    "</urlset>",
    "",
  ].join("\n");
}

export function writeSitemapFile(updatedAt: string): void {
  writeFileSync(SITEMAP_PATH, buildSitemapXml(updatedAt), "utf-8");
}
