import { describe, it, expect } from "vitest";
import { cleanHtml, truncateText } from "./extractEvents.js";

describe("cleanHtml", () => {
  it("removes script, style, and nav elements", () => {
    const html = `
      <div>
        <script>alert('hi')</script>
        <style>.foo { color: red }</style>
        <nav>Navigation</nav>
        <p>Content here</p>
      </div>
    `;
    const result = cleanHtml(html);
    expect(result).not.toContain("alert");
    expect(result).not.toContain("color: red");
    expect(result).not.toContain("Navigation");
    expect(result).toContain("Content here");
  });

  it("removes footer, header, aside, and noscript elements", () => {
    const html = `
      <div>
        <header>Header</header>
        <footer>Footer</footer>
        <aside>Sidebar</aside>
        <noscript>Enable JS</noscript>
        <main>Main content</main>
      </div>
    `;
    const result = cleanHtml(html);
    expect(result).not.toContain("Header");
    expect(result).not.toContain("Footer");
    expect(result).not.toContain("Sidebar");
    expect(result).not.toContain("Enable JS");
    expect(result).toContain("Main content");
  });

  it("collapses whitespace", () => {
    const html = "<p>  Hello   \n\n  World  </p>";
    expect(cleanHtml(html)).toBe("Hello World");
  });

  it("returns empty string for empty input", () => {
    expect(cleanHtml("")).toBe("");
  });
});

describe("truncateText", () => {
  it("returns text unchanged when under limit", () => {
    const shortText = "Hello world";
    expect(truncateText(shortText)).toBe(shortText);
  });

  it("truncates text exceeding 8000 chars with marker", () => {
    const longText = "a".repeat(9000);
    const result = truncateText(longText);
    expect(result.length).toBeLessThanOrEqual(8000);
    expect(result).toContain("...[truncated]");
  });

  it("returns text unchanged when exactly at limit", () => {
    const exactText = "a".repeat(8000);
    expect(truncateText(exactText)).toBe(exactText);
  });
});
