import { APIFY_BASE_URL, getApifyApiKey } from "./apifyConfig.js";
import { warnDetail } from "../utils/logger.js";

export interface ApifyEvent {
  id: string;
  name: string;
  url: string;
  description: string;
  utcStartDate: string;
  startTime: string;
  isCanceled: boolean;
  isPast: boolean;
  address: string;
  location: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  };
  ticketsInfo: {
    buyUrl: string | null;
    price: string | null;
  } | null;
  imageUrl: string;
  usersGoing: number;
  usersInterested: number;
}

interface ApifyDatasetError {
  error: string;
  errorDescription: string;
}

export async function getValidApifyEvents(
  datasetId: string
): Promise<ApifyEvent[]> {
  const events = await fetchApifyEvents(datasetId);
  return events.filter((event) => !event.isPast && !event.isCanceled);
}

export async function fetchApifyEvents(
  datasetId: string
): Promise<ApifyEvent[]> {
  const apiKey = getApifyApiKey();

  const url = `${APIFY_BASE_URL}/datasets/${datasetId}/items?token=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Apify events: ${response.status} ${response.statusText}`
    );
  }

  const items = (await response.json()) as (ApifyEvent | ApifyDatasetError)[];
  const datasetError = items.find((item) => "error" in item);

  if (datasetError) {
    warnDetail(
      `Apify returned no events (${datasetError.error}): ${datasetError.errorDescription}`
    );
    return [];
  }

  return items as ApifyEvent[];
}
