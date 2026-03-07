export const APIFY_BASE_URL = "https://api.apify.com/v2";

export function shouldRunApify(today: Date = new Date()): boolean {
  return today.getUTCDate() % 2 === 0;
}

export function getApifyApiKey(): string {
  const apiKey = process.env.APIFY_API_KEY;
  if (!apiKey) {
    throw new Error("APIFY_API_KEY is not set in environment variables.");
  }
  return apiKey;
}
