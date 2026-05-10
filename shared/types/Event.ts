import { CATEGORY_SLUGS } from "../constants";

export interface EventsDataSchema {
  updatedAt: string;
  events: Event[];
}

export interface Event {
  id: string;
  title: string;
  description: string;
  category: (typeof CATEGORY_SLUGS)[number];
  startDate: string; // ISO 8601
  endDate?: string; // ISO 8601
  location?: string;
  url?: string;
  collectedAt: string; // ISO 8601
}
