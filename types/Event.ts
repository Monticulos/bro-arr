import { CATEGORY_SLUGS } from './categories';

export interface Event {
  id: string;
  title: string;
  description: string;
  category: typeof CATEGORY_SLUGS[number];
  dateTime: string;   // ISO 8601
  location?: string;
  url?: string;
  collectedAt: string;   // ISO 8601
}

export interface EventsData {
  updatedAt: string;
  events: Event[];
}
