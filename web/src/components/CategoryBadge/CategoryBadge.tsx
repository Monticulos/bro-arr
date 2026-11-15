import { Tag } from '@digdir/designsystemet-react';
import type { EventCategory } from '../../types/event';
import { CATEGORY_LABELS, CATEGORY_COLOR_MAP } from '../../constants/categories';

interface Props {
  category: EventCategory;
}

export default function CategoryBadge({ category }: Props) {
  return (
    <Tag data-color={CATEGORY_COLOR_MAP[category]} data-size='sm'>
      {CATEGORY_LABELS[category]}
    </Tag>
  );
}
