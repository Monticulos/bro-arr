import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildSitemapXml, writeSitemapFile } from "./sitemapFile.js";
import { writeFileSync } from "fs";

vi.mock("fs", () => ({
  writeFileSync: vi.fn(),
}));

describe("buildSitemapXml", () => {
  it.each([
    { input: "2026-03-14T10:30:00Z", expectedDate: "2026-03-14" },
    { input: "2025-12-01T00:00:00Z", expectedDate: "2025-12-01" },
    { input: "2026-01-31T23:59:59Z", expectedDate: "2026-01-31" },
  ])("uses date $expectedDate from timestamp $input as lastmod", ({ input, expectedDate }) => {
    const xml = buildSitemapXml(input);

    expect(xml).toContain(`<lastmod>${expectedDate}</lastmod>`);
  });
});

describe("writeSitemapFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes the generated XML to the sitemap path", () => {
    writeSitemapFile("2026-03-14T10:30:00Z");

    const [filePath, content, encoding] = vi.mocked(writeFileSync).mock.calls[0];
    expect(filePath).toMatch(/sitemap\.xml$/);
    expect(content).toContain("<lastmod>2026-03-14</lastmod>");
    expect(encoding).toBe("utf-8");
  });
});
