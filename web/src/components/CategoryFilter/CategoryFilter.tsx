import { Chip, Label } from '@digdir/designsystemet-react';
import type { EventCategory } from '../../types/event';
import { CATEGORY_LABELS, CATEGORY_COLOR_MAP } from '../../constants/categories';
import styles from './CategoryFilter.module.css';

interface Props {
  availableCategories: EventCategory[];
  selectedCategories: Set<EventCategory>;
  onToggleCategory: (category: EventCategory) => void;
}

export default function CategoryFilter({
  availableCategories,
  selectedCategories,
  onToggleCategory,
}: Props) {
  return (
    <fieldset className={styles.fieldset}>
      <Label asChild>
        <legend>Filter</legend>
      </Label>
      <div className={styles.chipGroup}>
        {availableCategories.map((category) => (
          <Chip.Checkbox
            key={category}
            name="category-filter"
            checked={selectedCategories.has(category)}
            onChange={() => onToggleCategory(category)}
            data-color={CATEGORY_COLOR_MAP[category]}
          >
            {CATEGORY_LABELS[category]}
          </Chip.Checkbox>
        ))}
      </div>
    </fieldset>
  );
}
