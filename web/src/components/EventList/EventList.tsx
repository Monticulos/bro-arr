import { useMemo } from 'react';
import { Spinner, Alert, Heading, Paragraph } from '@digdir/designsystemet-react';
import type { Event } from '../../types/event';
import { useEventFiltering } from '../../hooks/useEventFiltering';
import { useFavorites } from '../../hooks/useFavorites';
import EventCard from '../EventCard/EventCard';
import CategoryFilter from '../CategoryFilter/CategoryFilter';
import Search from '../Search/Search';
import { formatMonthHeading } from '../../utils/formatDate';
import styles from './EventList.module.css';

interface Props {
  events: Event[];
  loading: boolean;
  error: string | null;
}

const YEAR_MONTH_KEY_LENGTH = 7;

function getUpcomingEvents(events: Event[]): Event[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return events
    .filter((event) => new Date(event.dateTime) >= now)
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
}

function groupByMonth(eventList: Event[]) {
  const groups: { monthKey: string; events: Event[] }[] = [];
  for (const event of eventList) {
    const monthKey = event.dateTime.slice(0, YEAR_MONTH_KEY_LENGTH);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.monthKey === monthKey) {
      lastGroup.events.push(event);
    } else {
      groups.push({ monthKey, events: [event] });
    }
  }
  return groups;
}

export default function EventList({ events, loading, error }: Props) {
  const upcomingEvents = useMemo(() => getUpcomingEvents(events), [events]);
  const { favoriteIds, isFavorite, toggleFavorite } = useFavorites();

  const {
    filteredEvents,
    selectedCategories,
    searchQuery,
    setSearchQuery,
    handleToggleCategory,
    availableCategories,
  } = useEventFiltering(upcomingEvents);

  const favoritedFilteredEvents = useMemo(
    () => filteredEvents.filter((e) => favoriteIds.has(e.id)),
    [filteredEvents, favoriteIds]
  );

  if (loading) return (
    <div className={styles.statusContainer}>
      <Spinner aria-label="Laster arrangementer" />
    </div>
  );
  if (error) return <Alert data-color="danger">Kunne ikke laste data: {error}</Alert>;

  if (upcomingEvents.length === 0) {
    return <Paragraph className={styles.statusContainer}>Ingen kommende arrangementer.</Paragraph>;
  }

  return (
    <>
      <CategoryFilter
        availableCategories={availableCategories}
        selectedCategories={selectedCategories}
        onToggleCategory={handleToggleCategory}
      />
      <Search value={searchQuery} onChange={setSearchQuery} />
      {favoritedFilteredEvents.length > 0 && (
        <>
          <Heading level={2} data-size="sm" className={styles.monthHeading}>
            Favoritter
          </Heading>
          <ul className={styles.list}>
            {favoritedFilteredEvents.map((event) => (
              <li key={event.id}>
                <EventCard event={event} isFavorited={true} onToggleFavorite={toggleFavorite} />
              </li>
            ))}
          </ul>
        </>
      )}
      {filteredEvents.length === 0 ? (
        <Paragraph className={styles.statusContainer}>
          Ingen arrangementer funnet.
        </Paragraph>
      ) : (
        <ul className={styles.list}>
          {groupByMonth(filteredEvents).map(({ monthKey, events: groupEvents }) => (
            <li key={monthKey}>
              <Heading level={2} data-size="sm" className={styles.monthHeading}>
                {formatMonthHeading(groupEvents[0].dateTime)}
              </Heading>
              <ul className={styles.list}>
                {groupEvents.map((event) => (
                  <li key={event.id}>
                    <EventCard
                      event={event}
                      isFavorited={isFavorite(event.id)}
                      onToggleFavorite={toggleFavorite}
                    />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
