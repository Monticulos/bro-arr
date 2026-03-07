import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  buildFacebookSearchUrl,
  startApifyActorRun,
  waitForActorRun,
  ActorRunStatus,
  MAX_WAIT_MS,
} from "./runApifyActor.js";

function createRunResponse(
  overrides: Partial<{ id: string; status: ActorRunStatus; defaultDatasetId: string }> = {}
) {
  return {
    data: {
      id: "run-123",
      status: ActorRunStatus.RUNNING,
      defaultDatasetId: "dataset-456",
      ...overrides,
    },
  };
}

function mockFetchJson(response: object, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    statusText: ok ? "OK" : "Internal Server Error",
    json: () => Promise.resolve(response),
  });
}

function extractFilters(url: string): Record<string, string> {
  const filtersParam = new URL(url).searchParams.get("filters")!;
  return JSON.parse(atob(filtersParam));
}

describe("buildFacebookSearchUrl", () => {
  it("uses the Facebook events search endpoint", () => {
    const url = buildFacebookSearchUrl(new Date("2026-03-07"));

    expect(url).toContain("https://www.facebook.com/events/search");
  });

  it("searches for Brønnøysund", () => {
    const url = buildFacebookSearchUrl(new Date("2026-03-07"));

    expect(url).toContain("q=Brønnøysund");
  });

  it("includes a location filter for Brønnøysund", () => {
    const url = buildFacebookSearchUrl(new Date("2026-03-07"));
    const filters = extractFilters(url);
    const locationFilter = JSON.parse(filters["rp_events_location:0"]);

    expect(locationFilter.name).toBe("filter_events_location");
    expect(locationFilter.args).toBe("103758419663407");
  });

  it("includes a date filter from start date to 6 months ahead", () => {
    const url = buildFacebookSearchUrl(new Date("2026-03-07"));
    const filters = extractFilters(url);
    const dateFilter = JSON.parse(filters["filter_events_date_range:0"]);

    expect(dateFilter.name).toBe("filter_events_date");
    expect(dateFilter.args).toBe("2026-03-07~2026-09-07");
  });
});

describe("startApifyActorRun", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    process.env.APIFY_API_KEY = "test-key";
  });

  it("returns the run ID on success", async () => {
    const mockFetch = mockFetchJson(createRunResponse({ id: "run-abc" }));
    vi.stubGlobal("fetch", mockFetch);

    const runId = await startApifyActorRun();

    expect(runId).toBe("run-abc");
  });

  it("sends a Facebook discovery URL as startUrls input", async () => {
    const mockFetch = mockFetchJson(createRunResponse());
    vi.stubGlobal("fetch", mockFetch);

    await startApifyActorRun();

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.startUrls).toHaveLength(1);
    expect(body.startUrls[0]).toContain("facebook.com/events");
  });

  it("sends the timeout parameter to Apify", async () => {
    const mockFetch = mockFetchJson(createRunResponse());
    vi.stubGlobal("fetch", mockFetch);

    await startApifyActorRun();

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("timeout=240");
  });

  it("throws when APIFY_API_KEY is missing", async () => {
    delete process.env.APIFY_API_KEY;

    await expect(startApifyActorRun()).rejects.toThrow(
      "APIFY_API_KEY is not set in environment variables."
    );
  });

  it("throws when the API responds with an error", async () => {
    const mockFetch = mockFetchJson({}, false);
    vi.stubGlobal("fetch", mockFetch);

    await expect(startApifyActorRun()).rejects.toThrow(
      "Failed to start Apify actor: 500 Internal Server Error"
    );
  });
});

describe("waitForActorRun", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.useFakeTimers();
    process.env.APIFY_API_KEY = "test-key";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns dataset ID when run succeeds immediately", async () => {
    const mockFetch = mockFetchJson(
      createRunResponse({ status: ActorRunStatus.SUCCEEDED, defaultDatasetId: "ds-789" })
    );
    vi.stubGlobal("fetch", mockFetch);

    const datasetId = await waitForActorRun("run-123");

    expect(datasetId).toBe("ds-789");
  });

  it("polls until the run succeeds", async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      const status = callCount >= 3 ? ActorRunStatus.SUCCEEDED : ActorRunStatus.RUNNING;
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve(
            createRunResponse({ status, defaultDatasetId: "ds-polled" })
          ),
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    const promise = waitForActorRun("run-123");
    await vi.advanceTimersByTimeAsync(10_000);
    await vi.advanceTimersByTimeAsync(10_000);
    const datasetId = await promise;

    expect(datasetId).toBe("ds-polled");
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("throws when the run fails", async () => {
    const mockFetch = mockFetchJson(createRunResponse({ status: ActorRunStatus.FAILED }));
    vi.stubGlobal("fetch", mockFetch);

    await expect(waitForActorRun("run-123")).rejects.toThrow(
      "Apify actor run failed with status: FAILED"
    );
  });

  it("returns dataset ID when run times out on Apify side", async () => {
    const mockFetch = mockFetchJson(
      createRunResponse({ status: ActorRunStatus.TIMED_OUT, defaultDatasetId: "ds-partial" })
    );
    vi.stubGlobal("fetch", mockFetch);

    const datasetId = await waitForActorRun("run-123");

    expect(datasetId).toBe("ds-partial");
  });

  it("throws when the run is aborted", async () => {
    const mockFetch = mockFetchJson(createRunResponse({ status: ActorRunStatus.ABORTED }));
    vi.stubGlobal("fetch", mockFetch);

    await expect(waitForActorRun("run-123")).rejects.toThrow(
      "Apify actor run failed with status: ABORTED"
    );
  });

  it("throws when the API responds with an error", async () => {
    const mockFetch = mockFetchJson({}, false);
    vi.stubGlobal("fetch", mockFetch);

    await expect(waitForActorRun("run-123")).rejects.toThrow(
      "Failed to check actor run status: 500 Internal Server Error"
    );
  });

  it("returns partial dataset when collector polling times out", async () => {
    const mockFetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(createRunResponse({ status: ActorRunStatus.RUNNING, defaultDatasetId: "ds-partial" })),
      })
    );
    vi.stubGlobal("fetch", mockFetch);

    const promise = waitForActorRun("run-123");
    await vi.advanceTimersByTimeAsync(MAX_WAIT_MS);
    const datasetId = await promise;
    expect(datasetId).toBe("ds-partial");
  });
});
