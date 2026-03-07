import { APIFY_BASE_URL, getApifyApiKey } from "./apifyConfig.js";

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

export async function getValidApifyEvents(
  datasetId: string
): Promise<ApifyEvent[]> {
  const events = await fetchApifyEvents(datasetId);
  return events.filter((e) => !e.isPast);
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

  return response.json() as Promise<ApifyEvent[]>;
}
