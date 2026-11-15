import { useMemo } from 'react';
import { Paragraph } from '@digdir/designsystemet-react';
import type { CategorizedEvent } from '../../types/event';
import { useEventFiltering } from '../../hooks/useEventFiltering';
import { useFavorites } from '../../hooks/useFavorites';
import CategoryFilter from '../CategoryFilter/CategoryFilter';
import Search from '../Search/Search';
import EventSection from '../EventSection/EventSection';
import { formatMonthHeading } from '../../utils/formatDate';
import { groupSortedEventsByMonth } from '../../utils/eventGrouping';
import { getUpcomingEvents } from '../../../../shared/src/utils/getUpcomingEvents';
import styles from './EventList.module.css';

interface Props {
  events: CategorizedEvent[];
}

const alwaysFavorited = () => true;

export default function EventList({ events }: Props) {
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

  const monthGroups = useMemo(() => groupSortedEventsByMonth(filteredEvents), [filteredEvents]);

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
