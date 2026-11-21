import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '../App';

describe('App shell', () => {
  it('renders the three tabs and the default Movies placeholder', () => {
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
    expect(
      screen.getByText(
        'Add and manage the MCU movies you plan to rewatch.',
      ),
    ).toBeInTheDocument();
  });

  it('switches placeholders when tabs are clicked', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('tab', { name: 'Rewatch Plan' }));
    expect(
      screen.getByRole('tab', { name: 'Rewatch Plan' }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByText(
        'Pick a target movie and see the order to watch everything before it.',
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
