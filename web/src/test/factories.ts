import type { Event } from "../types/event";

export const createEvent = (overrides: Partial<Event> = {}): Event => ({
  id: "1",
  title: "Quiz Night",
  description: "Weekly pub quiz",
  category: "quiz",
  startDate: "2025-06-15T19:00:00Z",
  collectedAt: "2025-06-01T12:00:00Z",
  ...overrides,
});
