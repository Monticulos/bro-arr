import type { Event } from "../../../shared/types/Event";

export type EventCategory = Event["category"];

export const CATEGORY_CRITERIA: Record<EventCategory, string> = {
  "musikk": "Concerts, live music, music festivals such as Rootsfestivalen, band performances, choir and song events.",
  "kino": "Cinema screenings, film showings and movie nights.",
  "quiz": "Pub quizzes, trivia nights, quiz competitions and music bingo.",
  "mat-og-drikke": "Food festivals, tastings, restaurant and café events, brewery tours.",
  "barn-og-ungdom": "Events aimed at children, youth or families, and school events.",
  "næringsliv": "Business networking, trade fairs, professional seminars, entrepreneur events, retail sales and store events.",
  "kunst-og-kultur": "Theatre, exhibitions, art shows, cultural performances, stand-up, dance, opera and literary events.",
  "kommunalt": "Municipal meetings, town hall meetings, public hearings and other local government events.",
  "tro-og-livssyn": "Church services, religious gatherings, faith community events, spiritual events and philosophy groups.",
  "annet": "Anything that does not fit the other categories.",
};

export function isEventCategory(value: string | null): value is EventCategory {
  return value !== null && value in CATEGORY_CRITERIA;
}
