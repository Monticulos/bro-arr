import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchApifyEvents, getValidApifyEvents } from "./fetchApifyEvents.js";
import { createApifyEvent } from "../test/createApifyEvent.js";

const TEST_DATASET_ID = "test-dataset-123";

function mockFetchResponse(body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(body) })
  );
}

describe("getValidApifyEvents", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    process.env.APIFY_API_KEY = "test-key";
  });

  it("returns upcoming events", async () => {
    const upcomingEvent = createApifyEvent({ id: "1", isPast: false });
    mockFetchResponse([upcomingEvent]);

    const result = await getValidApifyEvents(TEST_DATASET_ID);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("filters out past events", async () => {
    const pastEvent = createApifyEvent({ id: "past", isPast: true });
    const upcomingEvent = createApifyEvent({ id: "upcoming", isPast: false });
    mockFetchResponse([pastEvent, upcomingEvent]);

    const result = await getValidApifyEvents(TEST_DATASET_ID);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("upcoming");
  });

  it("filters out canceled events", async () => {
    const canceledEvent = createApifyEvent({ id: "canceled", isCanceled: true });
    const upcomingEvent = createApifyEvent({ id: "upcoming" });
    mockFetchResponse([canceledEvent, upcomingEvent]);

    const result = await getValidApifyEvents(TEST_DATASET_ID);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("upcoming");
  });

  it("returns empty array when all events are past", async () => {
    mockFetchResponse([createApifyEvent({ isPast: true })]);

    const result = await getValidApifyEvents(TEST_DATASET_ID);

    expect(result).toHaveLength(0);
  });
});

describe("fetchApifyEvents", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    process.env.APIFY_API_KEY = "test-key";
  });

  it("throws when APIFY_API_KEY is missing", async () => {
    delete process.env.APIFY_API_KEY;

    await expect(fetchApifyEvents(TEST_DATASET_ID)).rejects.toThrow(
      "APIFY_API_KEY is not set in environment variables."
    );
  });

  it("throws when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, statusText: "Unauthorized" })
    );

    await expect(fetchApifyEvents(TEST_DATASET_ID)).rejects.toThrow(
      "Failed to fetch Apify events: 401 Unauthorized"
    );
  });

  it("builds the URL with the provided dataset ID", async () => {
    mockFetchResponse([]);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });
    vi.stubGlobal("fetch", mockFetch);

    await fetchApifyEvents("my-dataset-id");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.apify.com/v2/datasets/my-dataset-id/items?token=test-key"
    );
  });
});

describe("fetchApifyEvents when the actor returns a dataset error", () => {
  const emptyOrPrivateInput = {
    error: "no_items",
    errorDescription: "Empty or private data for provided input",
  };

  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    process.env.APIFY_API_KEY = "test-key";
  });

  it("returns no events when the input was empty or private", async () => {
    mockFetchResponse([emptyOrPrivateInput]);

    await expect(fetchApifyEvents(TEST_DATASET_ID)).resolves.toEqual([]);
  });

  it("returns no events when the search found nothing", async () => {
    mockFetchResponse([
      {
        error: "no_results",
        errorDescription: "No events found for the given search",
        input: "https://www.facebook.com/events/search?q=Brønnøysund",
      },
    ]);

    await expect(fetchApifyEvents(TEST_DATASET_ID)).resolves.toEqual([]);
  });

  it("warns with the error code and reason reported by the actor", async () => {
    mockFetchResponse([emptyOrPrivateInput]);

    await fetchApifyEvents(TEST_DATASET_ID);

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        "(no_items): Empty or private data for provided input"
      )
    );
  });
});
