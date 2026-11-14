import { describe, it, expect, vi, afterEach } from "vitest";
import { OpenRouterError } from "@openrouter/sdk/models/errors";
import { retryTransientFailures } from "./retryTransientFailures.js";

function createHttpError(statusCode: number): OpenRouterError {
  return new OpenRouterError(`HTTP ${statusCode}`, {
    response: new Response("", { status: statusCode }),
    request: new Request("https://openrouter.ai/api/alpha/decisions"),
    body: "",
  });
}

/** The retries sleep, so the test clock has to run while the result is pending. */
async function retryWhileAdvancingTimers<Result>(
  call: () => Promise<Result>,
): Promise<Result> {
  vi.useFakeTimers();
  const result = retryTransientFailures(call);
  result.catch(() => {});
  await vi.runAllTimersAsync();
  return result;
}

describe("retryTransientFailures", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls once and returns the result when nothing fails", async () => {
    const call = vi.fn().mockResolvedValue("answered");

    expect(await retryWhileAdvancingTimers(call)).toBe("answered");
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("retries a rate limited call and returns the eventual result", async () => {
    const call = vi
      .fn()
      .mockRejectedValueOnce(createHttpError(429))
      .mockResolvedValue("answered");

    expect(await retryWhileAdvancingTimers(call)).toBe("answered");
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("gives up after two retries and rethrows the last error", async () => {
    const call = vi.fn().mockRejectedValue(createHttpError(503));

    await expect(retryWhileAdvancingTimers(call)).rejects.toMatchObject({
      statusCode: 503,
    });
    expect(call).toHaveBeenCalledTimes(3);
  });

  it("does not retry a request the API rejected", async () => {
    const call = vi.fn().mockRejectedValue(createHttpError(401));

    await expect(retryWhileAdvancingTimers(call)).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("retries a connection failure that carries no status code", async () => {
    const call = vi.fn().mockRejectedValue(new Error("fetch failed"));

    await expect(retryWhileAdvancingTimers(call)).rejects.toThrow(
      "fetch failed",
    );
    expect(call).toHaveBeenCalledTimes(3);
  });

  it("backs off for longer before each retry", async () => {
    vi.useFakeTimers();
    const call = vi.fn().mockRejectedValue(createHttpError(503));
    const result = retryTransientFailures(call);
    result.catch(() => {});

    await vi.advanceTimersByTimeAsync(499);
    expect(call).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(call).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(999);
    expect(call).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1);
    expect(call).toHaveBeenCalledTimes(3);
  });
});
