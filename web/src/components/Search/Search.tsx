import { Search as DsSearch } from '@digdir/designsystemet-react';
import styles from './Search.module.css';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function Search({ value, onChange }: Props) {
  return (
    <div className={styles.search}>
      <DsSearch>
        <DsSearch.Input     
          aria-label="Søk etter arrangementer"
          placeholder="Søk etter arrangementer"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <DsSearch.Clear onClick={() => onChange('')} />
      </DsSearch>
    </div>
  );
}
