import type { Event } from "../../../types/Event";

const DEFAULT_EVENT: Event = {
  id: "example-com-test-event-2026-03-15",
  title: "Test Event",
  description: "A test event description",
  category: "annet",
  startDate: "2026-03-15T19:00:00",
  collectedAt: "2026-02-28T12:00:00",
};

export function createEvent(overrides: Partial<Event> = {}): Event {
  return { ...DEFAULT_EVENT, ...overrides };
}
