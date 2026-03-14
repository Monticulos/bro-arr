import { useMemo } from 'react';
import { Spinner, Alert, Paragraph } from '@digdir/designsystemet-react';
import type { Event } from '../../types/event';
import { useEventFiltering } from '../../hooks/useEventFiltering';
import { useFavorites } from '../../hooks/useFavorites';
import CategoryFilter from '../CategoryFilter/CategoryFilter';
import Search from '../Search/Search';
import EventSection from '../EventSection/EventSection';
import { formatMonthHeading } from '../../utils/formatDate';
import { getUpcomingEvents, groupByMonth } from '../../utils/eventGrouping';
import styles from './EventList.module.css';

interface Props {
  events: Event[];
  loading: boolean;
  error: string | null;
}

const alwaysFavorited = () => true;

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

  const monthGroups = useMemo(() => groupByMonth(filteredEvents), [filteredEvents]);

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
      {filteredEvents.length === 0 ? (
        <Paragraph className={styles.statusContainer}>
          Ingen arrangementer funnet.
        </Paragraph>
      ) : (
        <ul className={styles.list}>
          {favoritedFilteredEvents.length > 0 && (
            <li>
              <EventSection
                heading="Favoritter"
                events={favoritedFilteredEvents}
                isFavorited={alwaysFavorited}
                onToggleFavorite={toggleFavorite}
              />
            </li>
          )}
          {monthGroups.map(({ monthKey, events: groupEvents }) => (
            <li key={monthKey}>
              <EventSection
                heading={formatMonthHeading(groupEvents[0].startDate)}
                events={groupEvents}
                isFavorited={isFavorite}
                onToggleFavorite={toggleFavorite}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
