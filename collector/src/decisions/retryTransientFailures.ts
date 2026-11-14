import { OpenRouterError } from "@openrouter/sdk/models/errors";

const MAX_RETRIES = 2;
const INITIAL_RETRY_DELAY_MS = 500;

/** Retries rate limits, server errors and connection failures, backing off between attempts. */
export async function retryTransientFailures<Result>(
  call: () => Promise<Result>,
): Promise<Result> {
  for (let retry = 0; retry < MAX_RETRIES; retry++) {
    try {
      return await call();
    } catch (error) {
      if (!isTransient(error)) throw error;
      await delay(INITIAL_RETRY_DELAY_MS * 2 ** retry);
    }
  }
  return call();
}

function isTransient(error: unknown): boolean {
  const TOO_MANY_REQUESTS = 429;
  const SERVER_ERROR = 500;
  
  if (!(error instanceof OpenRouterError)) return true;
  return (
    error.statusCode === TOO_MANY_REQUESTS || error.statusCode >= SERVER_ERROR
  );
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
