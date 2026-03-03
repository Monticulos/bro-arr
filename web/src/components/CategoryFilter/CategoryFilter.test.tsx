import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CategoryFilter from './CategoryFilter';
import type { Event } from '../../types/event';

describe('CategoryFilter', () => {
  const availableCategories: Event['category'][] = ['musikk', 'kino', 'annet'];

  it('renders a chip for each available category', () => {
    render(
      <CategoryFilter
        availableCategories={availableCategories}
        selectedCategories={new Set()}
        onToggleCategory={() => {}}
      />
    );

    expect(screen.getByText('Musikk')).toBeInTheDocument();
    expect(screen.getByText('Kino')).toBeInTheDocument();
    expect(screen.getByText('Annet')).toBeInTheDocument();
  });

  it('reflects checked state for selected categories', () => {
    render(
      <CategoryFilter
        availableCategories={availableCategories}
        selectedCategories={new Set<Event['category']>(['kino'])}
        onToggleCategory={() => {}}
      />
    );

    expect(screen.getByRole('checkbox', { name: 'Kino' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Musikk' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Annet' })).not.toBeChecked();
  });

  it('calls onToggleCategory when a chip is clicked', async () => {
    const user = userEvent.setup();
    const handleToggle = vi.fn();

    render(
      <CategoryFilter
        availableCategories={availableCategories}
        selectedCategories={new Set()}
        onToggleCategory={handleToggle}
      />
    );

    await user.click(screen.getByRole('checkbox', { name: 'Musikk' }));
    expect(handleToggle).toHaveBeenCalledWith('musikk');
  });

  it('has a visible Filter legend', () => {
    render(
      <CategoryFilter
        availableCategories={availableCategories}
        selectedCategories={new Set()}
        onToggleCategory={() => {}}
      />
    );

    expect(screen.getByRole('group', { name: 'Filter' })).toBeInTheDocument();
    expect(screen.getByText('Filter')).toBeInTheDocument();
  });
});
