import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMovie, listCinemas, listMovies } from '../api/client';
import type { Movie } from '../api/client';
import App from '../App';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    listMovies: vi.fn(),
    listCinemas: vi.fn(),
    createMovie: vi.fn(),
  };
});

const FRESH_MOVIE: Movie = {
  id: 'fresh-movie',
  title: 'Fresh Movie',
  releaseYear: 2026,
  runtimeMinutes: 120,
  watched: false,
  prerequisiteIds: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  vi.mocked(listMovies).mockReset().mockResolvedValue([]);
  vi.mocked(listCinemas).mockReset().mockResolvedValue([]);
  vi.mocked(createMovie).mockReset();
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
      await screen.findByText(
        'Add your first cinema above to build a booking quote.',
      ),
    ).toBeInTheDocument();
  });

  it('refetches movies in another tab after a movie is added', async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText('No movies yet');

    await user.type(screen.getByLabelText('Title'), FRESH_MOVIE.title);
    await user.type(
      screen.getByLabelText('Release year'),
      String(FRESH_MOVIE.releaseYear),
    );
    await user.type(
      screen.getByLabelText('Runtime (minutes)'),
      String(FRESH_MOVIE.runtimeMinutes),
    );

    vi.mocked(createMovie).mockResolvedValue(FRESH_MOVIE);
    vi.mocked(listMovies).mockResolvedValue([FRESH_MOVIE]);

    await user.click(screen.getByRole('button', { name: 'Add movie' }));
    expect(
      await screen.findByRole('heading', { name: FRESH_MOVIE.title }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Rewatch Plan' }));

    const targetSelect = await screen.findByLabelText('Target movie');
    expect(
      within(targetSelect).getByRole('option', { name: FRESH_MOVIE.title }),
    ).toBeInTheDocument();
  });
});
