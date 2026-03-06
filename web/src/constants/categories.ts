import type { Event } from '../../../types/Event';

export const CATEGORY_LABELS: Record<Event['category'], string> = {
  musikk: 'Musikk',
  kino: 'Kino',
  quiz: 'Quiz',
  'mat-og-drikke': 'Mat og drikke',
  'barn-og-ungdom': 'Barn og ungdom',
  næringsliv: 'Næringsliv',
  'kunst-og-kultur': 'Kunst og kultur',
  kommunalt: 'Kommunalt',
  'tro-og-livssyn': 'Tro og livssyn',
  annet: 'Annet',
};

export const CATEGORY_COLOR_MAP = {
  musikk: 'accent',
  kino: 'brand2',
  quiz: 'brand1',
  'mat-og-drikke': 'accent',
  'barn-og-ungdom': 'brand1',
  næringsliv: 'neutral',
  'kunst-og-kultur': 'brand2',
  kommunalt: 'neutral',
  'tro-og-livssyn': 'brand1',
  annet: 'neutral',
} as const satisfies Record<Event['category'], string>;
