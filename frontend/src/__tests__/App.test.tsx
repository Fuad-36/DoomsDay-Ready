import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    listMovies: vi.fn().mockResolvedValue([]),
  };
});

describe('App shell', () => {
  it('renders the three tabs and the default Movies empty state', async () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { name: 'Doomsday Ready' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Movies' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(
      screen.getByRole('tab', { name: 'Rewatch Plan' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Booking' })).toBeInTheDocument();
    expect(await screen.findByText('No movies yet')).toBeInTheDocument();
  });

  it('switches tabs and renders each view', async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText('No movies yet');

    await user.click(screen.getByRole('tab', { name: 'Rewatch Plan' }));
    expect(
      screen.getByRole('tab', { name: 'Rewatch Plan' }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(
      await screen.findByText(
        'Add a movie in the Movies tab to build a rewatch plan.',
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Booking' }));
    expect(
      screen.getByText(
        'Find a cinema and build an opening-night bundle quote for your group.',
      ),
    ).toBeInTheDocument();
  });
});
