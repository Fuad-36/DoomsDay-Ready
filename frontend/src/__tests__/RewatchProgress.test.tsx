import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RewatchProgress } from '../features/rewatch/RewatchProgress';

describe('RewatchProgress', () => {
  it('shows 0 of 0 watched without dividing by zero', () => {
    render(<RewatchProgress watchedCount={0} totalCount={0} />);

    expect(screen.getByText('0 of 0 watched')).toBeInTheDocument();

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    expect(progressBar.firstElementChild).toHaveStyle({ width: '0%' });
  });

  it('shows 4 of 7 watched and the rounded progress percentage', () => {
    render(<RewatchProgress watchedCount={4} totalCount={7} />);

    expect(screen.getByText('4 of 7 watched')).toBeInTheDocument();

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '57');
    expect(progressBar.firstElementChild).toHaveStyle({ width: '57%' });
  });
});
