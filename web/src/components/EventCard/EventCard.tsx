import { Card, Heading, Paragraph, Link, Button } from '@digdir/designsystemet-react';
import { StarIcon, StarFillIcon } from '@navikt/aksel-icons';
import type { Event } from '../../types/event';
import CategoryBadge from '../CategoryBadge/CategoryBadge';
import { formatEventDate } from '../../utils/formatDate';
import styles from './EventCard.module.css';

const LOCATION_ICON = '📍';
const STAR_LABEL_FAVORITED = 'Fjern fra favoritter';
const STAR_LABEL_UNFAVORITED = 'Legg til i favoritter';

interface Props {
  event: Event;
  isFavorited: boolean;
  onToggleFavorite: (id: string) => void;
}

export default function EventCard({ event, isFavorited, onToggleFavorite }: Props) {
  return (
    <Card>
      <Card.Block className={styles.headingBlock}>
        <div className={styles.meta}>
          <div className={styles.metaLeft}>
            <CategoryBadge category={event.category} />
            <time className={styles.date} dateTime={event.startDate}>
              {formatEventDate(event.startDate)}
            </time>
          </div>
          <Button
            className={styles.starButton}
            icon={true}
            variant="tertiary"
            onClick={() => onToggleFavorite(event.id)}
            aria-label={isFavorited ? STAR_LABEL_FAVORITED : STAR_LABEL_UNFAVORITED}
            aria-pressed={isFavorited}
          >
            {isFavorited
              ? <StarFillIcon aria-hidden fontSize="1.25rem" />
              : <StarIcon aria-hidden fontSize="1.25rem" />}
          </Button>
        </div>

        <Heading level={2} data-size="sm" className={styles.heading}>
          {event.title}
        </Heading>

        {event.location && (
          <Paragraph data-size="sm">
            {LOCATION_ICON} {event.location}
          </Paragraph>
        )}
      </Card.Block>

      <Card.Block>
        <Paragraph data-size="sm" className={styles.description}>
          {event.description}
        </Paragraph>
      </Card.Block>

      <Card.Block className={styles.footer}>
        {event.url && (
          <Link data-size='sm' href={event.url} target="_blank" rel="noopener noreferrer">
            Les mer →
          </Link>
        )}
      </Card.Block>
    </Card>
  );
}
