import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PrerequisitePicker } from '../features/movies/PrerequisitePicker';
import type { MovieOption } from '../features/movies/PrerequisitePicker';

const MOVIES: MovieOption[] = [
  { id: 'iron-man', title: 'Iron Man' },
  { id: 'avengers', title: 'The Avengers' },
  { id: 'endgame', title: 'Avengers: Endgame' },
];

interface PickerHarnessProps {
  excludeId?: string;
}

function PickerHarness({ excludeId }: PickerHarnessProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  return (
    <PrerequisitePicker
      movies={MOVIES}
      selectedIds={selectedIds}
      onChange={setSelectedIds}
      excludeId={excludeId}
    />
  );
}

describe('PrerequisitePicker', () => {
  it('removes a selected movie from the options and restores it when the chip is removed', async () => {
    const user = userEvent.setup();
    render(<PickerHarness />);

    const select = screen.getByLabelText('Add prerequisite');

    expect(
      screen.getByRole('option', { name: 'Iron Man' }),
    ).toBeInTheDocument();

    await user.selectOptions(select, 'iron-man');

    expect(
      screen.getByRole('button', { name: 'Remove Iron Man' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'Iron Man' }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Remove Iron Man' }),
    );

    expect(
      screen.getByRole('option', { name: 'Iron Man' }),
    ).toBeInTheDocument();
  });

  it('never offers the movie currently being edited', () => {
    render(<PickerHarness excludeId="iron-man" />);

    expect(
      screen.queryByRole('option', { name: 'Iron Man' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'The Avengers' }),
    ).toBeInTheDocument();
  });
});
