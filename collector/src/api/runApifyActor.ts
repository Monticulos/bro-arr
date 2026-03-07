import { APIFY_BASE_URL, getApifyApiKey } from "./apifyConfig.js";

const FACEBOOK_EVENTS_ACTOR_ID = "UZBnerCFBo5FgGouO";
const BRONNOEYSUND_LOCATION_ID = "103758419663407";
const DISCOVERY_DATE_RANGE_MONTHS = 6;
const MAX_EVENTS = 40;
const POLL_INTERVAL_MS = 10_000;
const ACTOR_TIMEOUT_SECONDS = 240;
const COLLECTOR_POLL_TIMEOUT_SECONDS = ACTOR_TIMEOUT_SECONDS + 10;
export const MAX_WAIT_MS = COLLECTOR_POLL_TIMEOUT_SECONDS * 1000;

export enum ActorRunStatus {
  RUNNING = "RUNNING",
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
  ABORTED = "ABORTED",
  TIMED_OUT = "TIMED-OUT",
}

interface ActorRunResponse {
  data: {
    id: string;
    defaultDatasetId: string;
    status: ActorRunStatus;
  };
}

function buildSearchFilters(startDate: Date, endDate: Date): string {
  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  const filters = {
    "rp_events_location:0": JSON.stringify({
      name: "filter_events_location",
      args: BRONNOEYSUND_LOCATION_ID,
    }),
    "filter_events_date_range:0": JSON.stringify({
      name: "filter_events_date",
      args: `${formatDate(startDate)}~${formatDate(endDate)}`,
    }),
  };

  return btoa(JSON.stringify(filters));
}

export function buildFacebookSearchUrl(
  startDate: Date = new Date()
): string {
  const endDate = new Date(startDate);
  endDate.setUTCMonth(endDate.getUTCMonth() + DISCOVERY_DATE_RANGE_MONTHS);

  const filters = buildSearchFilters(startDate, endDate);

  return `https://www.facebook.com/events/search?q=Brønnøysund&filters=${filters}`;
}

export async function startApifyActorRun(): Promise<string> {
  const apiKey = getApifyApiKey();
  const discoveryUrl = buildFacebookSearchUrl();
  const url = `${APIFY_BASE_URL}/acts/${FACEBOOK_EVENTS_ACTOR_ID}/runs?token=${apiKey}&timeout=${ACTOR_TIMEOUT_SECONDS}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      startUrls: [discoveryUrl],
      maxEvents: MAX_EVENTS,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to start Apify actor: ${response.status} ${response.statusText}`
    );
  }

  const result = (await response.json()) as ActorRunResponse;
  console.log(`Apify actor run started (ID: ${result.data.id})`);
  return result.data.id;
}

export async function waitForActorRun(runId: string): Promise<string> {
  const apiKey = getApifyApiKey();
  const url = `${APIFY_BASE_URL}/actor-runs/${runId}?token=${apiKey}`;
  const startTime = Date.now();
  let datasetId = "";

  while (Date.now() - startTime < MAX_WAIT_MS) {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to check actor run status: ${response.status} ${response.statusText}`
      );
    }

    const result = (await response.json()) as ActorRunResponse;
    const { status, defaultDatasetId } = result.data;
    datasetId = defaultDatasetId;

    if (status === ActorRunStatus.SUCCEEDED || status === ActorRunStatus.TIMED_OUT) {
      console.log(`Apify actor run completed (dataset: ${datasetId}).`);
      return datasetId;
    }

    if (status === ActorRunStatus.FAILED || status === ActorRunStatus.ABORTED) {
      throw new Error(`Apify actor run failed with status: ${status}`);
    }

    console.log("Waiting for Apify actor run to complete...");
    await sleep(POLL_INTERVAL_MS);
  }

  console.warn(`Did not receive expected actor response after ${COLLECTOR_POLL_TIMEOUT_SECONDS}s.`);
  return datasetId;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
