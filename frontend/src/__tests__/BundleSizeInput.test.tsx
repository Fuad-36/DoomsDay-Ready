import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BundleSizeInput } from '../features/booking/BundleSizeInput';

function renderInput(sizes: number[]) {
  const onAdd = vi.fn();
  const onRemove = vi.fn();

  render(
    <BundleSizeInput sizes={sizes} onAdd={onAdd} onRemove={onRemove} />,
  );

  return { onAdd };
}

describe('BundleSizeInput', () => {
  it('rejects a duplicate size', async () => {
    const user = userEvent.setup();
    const { onAdd } = renderInput([2, 3]);

    await user.type(screen.getByLabelText('Bundle size'), '2');

    expect(
      screen.getByText('That bundle size has already been added.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add size' })).toBeDisabled();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('rejects 0', async () => {
    const user = userEvent.setup();
    const { onAdd } = renderInput([]);

    await user.type(screen.getByLabelText('Bundle size'), '0');

    expect(
      screen.getByText(
        'Bundle size must be a whole number between 1 and 500.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add size' })).toBeDisabled();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('rejects 501', async () => {
    const user = userEvent.setup();
    const { onAdd } = renderInput([]);

    await user.type(screen.getByLabelText('Bundle size'), '501');

    expect(
      screen.getByText(
        'Bundle size must be a whole number between 1 and 500.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add size' })).toBeDisabled();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('blocks an 11th size', async () => {
    const user = userEvent.setup();
    const sizes = Array.from({ length: 10 }, (_, index) => index + 1);
    const { onAdd } = renderInput(sizes);
    const input = screen.getByLabelText('Bundle size');

    await user.type(input, '11');

    const limitMessage = screen.getByText(
      'You can add up to 10 bundle sizes.',
    );
    expect(limitMessage).toBeInTheDocument();
    expect(limitMessage).toHaveAttribute('role', 'status');
    expect(input).not.toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: 'Add size' })).toBeDisabled();
    expect(onAdd).not.toHaveBeenCalled();
  });
});
