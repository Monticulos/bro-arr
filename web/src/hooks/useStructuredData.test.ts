import { describe, it, expect, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useStructuredData } from "./useStructuredData";
import type { Event } from "../types/event";

const createEvent = (overrides: Partial<Event> = {}): Event => ({
  id: "1",
  title: "Quiz Night",
  description: "Weekly pub quiz",
  category: "quiz",
  dateTime: "2025-06-15T19:00:00Z",
  collectedAt: "2025-06-01T12:00:00Z",
  ...overrides,
});

const SCRIPT_SELECTOR = 'script#structured-data-json-ld[type="application/ld+json"]';

describe("useStructuredData", () => {
  afterEach(() => {
    document.head.querySelector(SCRIPT_SELECTOR)?.remove();
  });

  it("injects a JSON-LD script tag into head", () => {
    const events = [createEvent({ location: "Torget Bar" })];

    renderHook(() => useStructuredData(events));

    const script = document.head.querySelector(SCRIPT_SELECTOR);
    expect(script).not.toBeNull();

    const content = JSON.parse(script!.textContent!);
    expect(content["@context"]).toBe("https://schema.org");
    expect(content["@graph"][0].name).toBe("Quiz Night");
  });

  it("does not add a script tag when events is empty", () => {
    renderHook(() => useStructuredData([]));

    expect(document.head.querySelector(SCRIPT_SELECTOR)).toBeNull();
  });
});
