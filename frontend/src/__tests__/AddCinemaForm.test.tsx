import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createCinema } from '../api/client';
import { AddCinemaForm } from '../features/booking/AddCinemaForm';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    createCinema: vi.fn(),
  };
});

beforeEach(() => {
  vi.mocked(createCinema).mockReset();
});

describe('AddCinemaForm', () => {
  it('shows the server error and re-enables submit after a failed create', async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();

    vi.mocked(createCinema).mockRejectedValue(
      new ApiError(
        409,
        'DUPLICATE_NAME',
        'A cinema with this name already exists',
      ),
    );

    render(<AddCinemaForm onCreated={onCreated} />);

    await user.type(screen.getByLabelText('Cinema name'), 'Downtown Cinema');
    await user.type(screen.getByLabelText('Bundle size'), '2');
    await user.click(screen.getByRole('button', { name: 'Add size' }));

    const submitButton = screen.getByRole('button', { name: 'Add cinema' });
    await user.click(submitButton);

    expect(
      await screen.findByText('A cinema with this name already exists'),
    ).toBeInTheDocument();
    expect(submitButton).toBeEnabled();
    expect(onCreated).not.toHaveBeenCalled();
    expect(createCinema).toHaveBeenCalledWith({
      name: 'Downtown Cinema',
      bundleSizes: [2],
    });
  });
});
