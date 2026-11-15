import { describe, it, expect } from "vitest";
import { deleteExpiredEvents } from "./deleteExpiredEvents.js";
import { createEvent } from "../test/createEvent.js";

describe("deleteExpiredEvents", () => {
  const expiredEvent = createEvent({
    id: "1",
    startDate: "2020-01-01T00:00:00Z",
  });
  const upcomingEvent = createEvent({
    id: "2",
    startDate: "2099-01-01T00:00:00Z",
  });

  it("keeps only the upcoming events", () => {
    expect(deleteExpiredEvents([expiredEvent, upcomingEvent])).toEqual([
      upcomingEvent,
    ]);
  });

  it("returns every event when none have expired", () => {
    expect(deleteExpiredEvents([upcomingEvent])).toEqual([upcomingEvent]);
  });
});
