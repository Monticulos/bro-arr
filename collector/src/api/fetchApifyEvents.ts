const APIFY_DATASET_URL =
  "https://api.apify.com/v2/datasets/8DMf8rfXslQ8oVrUa/items";

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

export async function fetchApifyEvents(): Promise<ApifyEvent[]> {
  const apiKey = process.env.APIFY_API_KEY;
  if (!apiKey) {
    throw new Error("APIFY_API_KEY is not set in environment variables.");
  }

  const url = `${APIFY_DATASET_URL}?token=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Apify events: ${response.status} ${response.statusText}`
    );
  }

  return response.json() as Promise<ApifyEvent[]>;
}
