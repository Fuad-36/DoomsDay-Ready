import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BookingResult } from '../features/booking/BookingResult';

describe('BookingResult', () => {
  it('renders a possible booking breakdown and total bundle count', () => {
    render(
      <BookingResult
        quote={{
          cinemaId: 'cinema-1',
          groupSize: 29,
          possible: true,
          totalBundles: 29,
          bundles: [
            { size: 1, count: 20 },
            { size: 2, count: 9 },
          ],
        }}
      />,
    );

    expect(screen.getByText('20 x 1, 9 x 2')).toBeInTheDocument();
    expect(screen.getByText('29 bundles total')).toBeInTheDocument();
  });

  it('renders the not-possible message', () => {
    render(
      <BookingResult
        quote={{
          cinemaId: 'cinema-1',
          groupSize: 29,
          possible: false,
          totalBundles: null,
          bundles: [],
        }}
      />,
    );

    expect(
      screen.getByText("Not possible with this cinema's bundles"),
    ).toBeInTheDocument();
  });
});
