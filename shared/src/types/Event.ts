import { CATEGORY_SLUGS } from "../constants";

export type EventCategory = (typeof CATEGORY_SLUGS)[number];

export interface EventsData {
  updatedAt: string;
  events: Event[];
}

export interface Event {
  id: string;
  title: string;
  description: string;
  category?: EventCategory;
  startDate: string; // ISO 8601
  endDate?: string; // ISO 8601
  location?: string;
  url?: string;
  collectedAt: string; // ISO 8601
}

export type CategorizedEvent = Event & { category: EventCategory };
