import { useState, useMemo } from "react";
import type { CategorizedEvent, EventCategory } from "../types/event";
import { CATEGORY_LABELS } from "../constants/categories";

const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS) as EventCategory[];

function filterByCategories(
  events: CategorizedEvent[],
  selectedCategories: Set<EventCategory>,
): CategorizedEvent[] {
  if (selectedCategories.size === 0) return events;
  return events.filter((event) => selectedCategories.has(event.category));
}

function filterBySearch(events: CategorizedEvent[], query: string): CategorizedEvent[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (normalizedQuery === "") return events;

  return events.filter((event) => {
    const searchableFields = [event.title, event.description, event.location];
    return searchableFields.some((field) =>
      field?.toLowerCase().includes(normalizedQuery),
    );
  });
}

function getAvailableCategories(events: CategorizedEvent[]): EventCategory[] {
  return CATEGORY_ORDER.filter((category) =>
    events.some((event) => event.category === category),
  );
}

export function useEventFiltering(events: CategorizedEvent[]) {
  const [selectedCategories, setSelectedCategories] = useState<
    Set<EventCategory>
  >(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const availableCategories = useMemo(
    () => getAvailableCategories(events),
    [events],
  );

  const filteredEvents = useMemo(() => {
    const categoryFiltered = filterByCategories(events, selectedCategories);
    return filterBySearch(categoryFiltered, searchQuery);
  }, [events, selectedCategories, searchQuery]);

  const handleToggleCategory = (category: EventCategory) => {
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
