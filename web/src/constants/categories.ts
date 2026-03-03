import type { Event } from '../../../types/Event';

export const CATEGORY_LABELS: Record<Event['category'], string> = {
  musikk: 'Musikk',
  'stand-up': 'Stand-up',
  kino: 'Kino',
  annet: 'Annet',
};

export const CATEGORY_COLOR_MAP = {
  musikk: 'accent',
  'stand-up': 'brand1',
  kino: 'brand2',
  annet: 'neutral',
} as const satisfies Record<Event['category'], string>;
