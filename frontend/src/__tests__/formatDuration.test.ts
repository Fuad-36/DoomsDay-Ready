import { describe, expect, it } from 'vitest';
import { formatDuration } from '../features/rewatch/formatDuration';

describe('formatDuration', () => {
  it.each([
    [0, '0h 0m'],
    [45, '0h 45m'],
    [60, '1h 0m'],
    [340, '5h 40m'],
  ])('formats %i minutes as %s', (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected);
  });
});
