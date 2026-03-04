import { Heading } from '@digdir/designsystemet-react';
import type { Event } from '../../types/event';
import EventCard from '../EventCard/EventCard';
import styles from './EventSection.module.css';

interface Props {
  heading: string;
  events: Event[];
  isFavorited: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
}

export default function EventSection({ heading, events, isFavorited, onToggleFavorite }: Props) {
  return (
    <details open>
      <summary className={styles.summary}>
        <Heading level={2} data-size="sm" className={styles.heading}>
          {heading}
        </Heading>
      </summary>
      <ul className={styles.list}>
        {events.map((event) => (
          <li key={event.id}>
            <EventCard
              event={event}
              isFavorited={isFavorited(event.id)}
              onToggleFavorite={onToggleFavorite}
            />
          </li>
        ))}
      </ul>
    </details>
  );
}
