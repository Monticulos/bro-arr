import type { Event } from "../../../types/Event";

export function mergeEventLists(existing: Event[], incoming: Event[]): Event[] {
  const eventById = new Map(existing.map((e) => [e.id, e]));

  for (const event of incoming) {
    eventById.set(event.id, event);
  }

  return Array.from(eventById.values());
}
