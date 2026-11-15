import type { CategorizedEvent } from '../types/event';

const YEAR_MONTH_KEY_LENGTH = 7;

export function getUpcomingEvents(events: CategorizedEvent[]): CategorizedEvent[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return events
    .filter((event) => new Date(event.startDate) >= now)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function groupByMonth(events: CategorizedEvent[]): { monthKey: string; events: CategorizedEvent[] }[] {
  const groups: { monthKey: string; events: CategorizedEvent[] }[] = [];
  for (const event of events) {
    const monthKey = event.startDate.slice(0, YEAR_MONTH_KEY_LENGTH);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.monthKey === monthKey) {
      lastGroup.events.push(event);
    } else {
      groups.push({ monthKey, events: [event] });
    }
  }
  return groups;
}
