import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logPhase, logDetail, warnPhase, warnDetail } from "./logger.js";

describe("logger", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs phases without indentation", () => {
    logPhase("Fetching Apify events...");

    expect(console.log).toHaveBeenCalledWith("Fetching Apify events...");
  });

  it("indents details one level", () => {
    logDetail("Formatted 3 events.");

    expect(console.log).toHaveBeenCalledWith("  Formatted 3 events.");
  });

  it("passes the error along after an indented warning", () => {
    const error = new Error("boom");

    warnDetail("Failed to categorize:", error);

    expect(console.warn).toHaveBeenCalledWith("  Failed to categorize:", error);
  });

  it("omits the error argument when no error is given", () => {
    warnPhase("Apify returned no events.");

    expect(console.warn).toHaveBeenCalledWith("Apify returned no events.");
  });
});
