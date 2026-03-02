import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { extractText, truncate, TRUNCATION_MARKER } from "./fetchPage.js";

vi.mock("puppeteer", () => {
  const mockPage = {
    goto: vi.fn().mockResolvedValue(undefined),
    content: vi.fn().mockResolvedValue("<body>puppeteer content</body>"),
    newPage: vi.fn(),
  };
  const mockBrowser = {
    newPage: vi.fn().mockResolvedValue(mockPage),
    close: vi.fn().mockResolvedValue(undefined),
  };
  return {
    default: {
      launch: vi.fn().mockResolvedValue(mockBrowser),
    },
  };
});

describe("extractText", () => {
  it("extracts text from body", () => {
    const html = "<html><body><p>Hello world</p></body></html>";
    expect(extractText(html)).toBe("Hello world");
  });

  it("strips script and style tags", () => {
    const html = `<body>
      <script>var x = 1;</script>
      <style>.foo { color: red; }</style>
      <p>Visible text</p>
    </body>`;
    expect(extractText(html)).toBe("Visible text");
  });

  it("strips nav, footer, header, and aside tags", () => {
    const html = `<body>
      <nav>Navigation</nav>
      <header>Header</header>
      <main>Main content</main>
      <aside>Sidebar</aside>
      <footer>Footer</footer>
    </body>`;
    expect(extractText(html)).toBe("Main content");
  });

  it("collapses whitespace", () => {
    const html = "<body><p>  lots   of    spaces  </p></body>";
    expect(extractText(html)).toBe("lots of spaces");
  });

  it("narrows to CSS selector when provided", () => {
    const html = `<body>
      <div class="content">Target text</div>
      <div class="other">Other text</div>
    </body>`;
    expect(extractText(html, ".content")).toBe("Target text");
  });

  it("returns empty string when selector matches nothing", () => {
    const html = "<body><p>Some text</p></body>";
    expect(extractText(html, ".nonexistent")).toBe("");
  });
});

describe("truncate", () => {
  it("returns text unchanged when under 8000 chars", () => {
    const shortText = "a".repeat(7999);
    expect(truncate(shortText)).toBe(shortText);
  });

  it("returns text unchanged when exactly 8000 chars", () => {
    const exactText = "a".repeat(8000);
    expect(truncate(exactText)).toBe(exactText);
  });

  it("truncates at 8000 chars with marker when over limit", () => {
    const longText = "a".repeat(9000);
    const result = truncate(longText);
    expect(result).toHaveLength(8000 + TRUNCATION_MARKER.length);
    expect(result).toContain("[TEXT TRUNCATED AT 8000 CHARACTERS]");
    expect(result.slice(0, 8000)).toBe("a".repeat(8000));
  });
});

describe("fetchPage tool", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  async function invokeFetchPage(args: { url: string; selector?: string }): Promise<string> {
    const { fetchPage } = await import("./fetchPage.js");
    return fetchPage.invoke(args);
  }

  it("returns extracted text on successful fetch", async () => {
    const htmlResponse = "<body><p>Event information here with enough text to pass the threshold. ".repeat(20) + "</p></body>";
    const mockFetch = vi.fn().mockResolvedValue({
      text: () => Promise.resolve(htmlResponse),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await invokeFetchPage({ url: "https://example.com" });
    expect(result).toContain("Event information");
    expect(mockFetch).toHaveBeenCalledWith("https://example.com");
  });

  it("falls back to puppeteer when text is too short", async () => {
    const shortHtml = "<body><p>Hi</p></body>";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      text: () => Promise.resolve(shortHtml),
    }));

    const resultPromise = invokeFetchPage({ url: "https://example.com" });

    // Advance past the 2500ms setTimeout in fetchWithPuppeteer
    await vi.advanceTimersByTimeAsync(3000);

    const result = await resultPromise;
    expect(result).toContain("puppeteer content");
  });

  it("returns FETCH_ERROR when all attempts fail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    const puppeteer = await import("puppeteer");
    vi.mocked(puppeteer.default.launch).mockRejectedValue(new Error("Browser failed"));

    const resultPromise = invokeFetchPage({ url: "https://example.com" });

    // Advance timers past all retry delays (500ms, 1000ms, 2000ms)
    await vi.advanceTimersByTimeAsync(10000);

    const result = await resultPromise;
    expect(result).toContain("FETCH_ERROR");
  });
});
