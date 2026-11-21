import { describe, expect, it } from 'vitest';
import { getBookingQuote, type BookingQuote } from '../logic/booking.js';

function expectImpossible(quote: BookingQuote): void {
  expect(quote.possible).toBe(false);
  expect(quote.totalBundles).toBeNull();
  expect(quote.bundles).toEqual([]);
}

describe('getBookingQuote', () => {
  it('solves 1,3,4 for group 6 without greedy (3x2)', () => {
    const quote = getBookingQuote([1, 3, 4], 6);

    expect(quote.possible).toBe(true);
    expect(quote.totalBundles).toBe(2);
    expect(quote.bundles).toEqual([{ size: 3, count: 2 }]);
  });

  it('solves 2,5 for group 11 (5x1, 2x3)', () => {
    const quote = getBookingQuote([2, 5], 11);

    expect(quote.possible).toBe(true);
    expect(quote.totalBundles).toBe(4);
    expect(quote.bundles).toEqual([
      { size: 5, count: 1 },
      { size: 2, count: 3 },
    ]);
  });

  it('solves 6,9,20 for group 44 (20x1, 9x2, 6x1)', () => {
    const quote = getBookingQuote([6, 9, 20], 44);

    expect(quote.possible).toBe(true);
    expect(quote.totalBundles).toBe(4);
    expect(quote.bundles).toEqual([
      { size: 20, count: 1 },
      { size: 9, count: 2 },
      { size: 6, count: 1 },
    ]);
  });

  it('returns not possible when 4,6 cannot make 7', () => {
    expectImpossible(getBookingQuote([4, 6], 7));
  });

  it('returns not possible when the group is smaller than every bundle', () => {
    expectImpossible(getBookingQuote([5, 10], 3));
  });

  it('is always possible with a size-1 bundle', () => {
    const quote = getBookingQuote([1, 7], 13);

    expect(quote.possible).toBe(true);
    expect(quote.totalBundles).toBe(7);
    expect(quote.bundles).toEqual([
      { size: 7, count: 1 },
      { size: 1, count: 6 },
    ]);
  });

  it('uses a single bundle when the group exactly matches one', () => {
    const quote = getBookingQuote([6, 9, 20], 20);

    expect(quote.possible).toBe(true);
    expect(quote.totalBundles).toBe(1);
    expect(quote.bundles).toEqual([{ size: 20, count: 1 }]);
  });

  it('treats duplicate input sizes as deduped', () => {
    const quote = getBookingQuote([2, 2, 5, 5], 11);

    expect(quote.possible).toBe(true);
    expect(quote.totalBundles).toBe(4);
    expect(quote.bundles).toEqual([
      { size: 5, count: 1 },
      { size: 2, count: 3 },
    ]);
  });

  it('breaks equal-bundle ties in favour of the larger size', () => {
    // 5+3 and 4+4 are both two bundles for group 8.
    const quote = getBookingQuote([3, 4, 5], 8);

    expect(quote.possible).toBe(true);
    expect(quote.totalBundles).toBe(2);
    expect(quote.bundles).toEqual([
      { size: 5, count: 1 },
      { size: 3, count: 1 },
    ]);
  });

  it('handles group 10000 with ten sizes quickly', () => {
    const startedAt = Date.now();
    const quote = getBookingQuote(
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      10000,
    );
    const elapsedMs = Date.now() - startedAt;

    expect(quote.possible).toBe(true);
    expect(quote.totalBundles).toBe(1000);
    expect(quote.bundles).toEqual([{ size: 10, count: 1000 }]);
    expect(elapsedMs).toBeLessThan(1000);
  });

  it('always returns combinations that sum to the group size', () => {
    const cases = [
      { sizes: [1, 3, 4], groupSize: 6 },
      { sizes: [2, 5], groupSize: 11 },
      { sizes: [6, 9, 20], groupSize: 44 },
      { sizes: [3, 4, 5], groupSize: 8 },
      { sizes: [1, 7], groupSize: 100 },
      { sizes: [2, 3, 5, 7], groupSize: 97 },
    ];

    for (const { sizes, groupSize } of cases) {
      const quote = getBookingQuote(sizes, groupSize);

      expect(quote.possible).toBe(true);
      expect(quote.totalBundles).not.toBeNull();

      const totalBundles = quote.bundles.reduce(
        (sum, bundle) => sum + bundle.count,
        0,
      );
      const totalSize = quote.bundles.reduce(
        (sum, bundle) => sum + bundle.size * bundle.count,
        0,
      );

      expect(totalSize).toBe(groupSize);
      expect(totalBundles).toBe(quote.totalBundles);

      const bundleSizes = quote.bundles.map((bundle) => bundle.size);
      expect(new Set(bundleSizes).size).toBe(bundleSizes.length);
      expect(bundleSizes).toEqual(
        [...bundleSizes].sort((a, b) => b - a),
      );
      for (const bundle of quote.bundles) {
        expect(bundle.count).toBeGreaterThan(0);
      }
    }
  });

  it('does not mutate the input sizes array', () => {
    const sizes = [5, 2, 2];

    getBookingQuote(sizes, 11);

    expect(sizes).toEqual([5, 2, 2]);
  });
});
