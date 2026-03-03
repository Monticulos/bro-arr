import { useState, useMemo } from 'react';
import type { Event } from '../../../types/Event';
import { CATEGORY_LABELS } from '../constants/categories';

const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS) as Event['category'][];

function filterByCategories(events: Event[], selectedCategories: Set<Event['category']>): Event[] {
  if (selectedCategories.size === 0) return events;
  return events.filter((event) => selectedCategories.has(event.category));
}

function filterBySearch(events: Event[], query: string): Event[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (normalizedQuery === '') return events;

  return events.filter((event) => {
    const searchableFields = [event.title, event.description, event.location];
    return searchableFields.some((field) => field?.toLowerCase().includes(normalizedQuery));
  });
}

function getAvailableCategories(events: Event[]): Event['category'][] {
  return CATEGORY_ORDER.filter((category) =>
    events.some((event) => event.category === category)
  );
}

export function useEventFiltering(events: Event[]) {
  const [selectedCategories, setSelectedCategories] = useState<Set<Event['category']>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const availableCategories = useMemo(() => getAvailableCategories(events), [events]);

  const filteredEvents = useMemo(() => {
    const categoryFiltered = filterByCategories(events, selectedCategories);
    return filterBySearch(categoryFiltered, searchQuery);
  }, [events, selectedCategories, searchQuery]);

  const handleToggleCategory = (category: Event['category']) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  return {
    filteredEvents,
    selectedCategories,
    searchQuery,
    setSearchQuery,
    handleToggleCategory,
    availableCategories,
  };
}
