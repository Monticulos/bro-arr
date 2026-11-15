import type { CategorizedEvent } from '../types/event';

const YEAR_MONTH_KEY_LENGTH = 7;

export function groupSortedEventsByMonth(events: CategorizedEvent[]): { monthKey: string; events: CategorizedEvent[] }[] {
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
