export interface BookingBundle {
  size: number;
  count: number;
}

export interface BookingQuote {
  possible: boolean;
  totalBundles: number | null;
  bundles: BookingBundle[];
}

/**
 * Finds the fewest bundles that sum to exactly `groupSize`.
 *
 * This is a minimum-coin problem, so a greedy pick is wrong (e.g. sizes 1,3,4
 * for 6 would take 4+1+1 instead of 3+3). Instead we fill a bottom-up table:
 * `best[n]` is the fewest bundles summing to exactly n, computed from every
 * reachable `best[n - size]`. `choice[n]` records the size that produced the
 * best value so the combination can be rebuilt afterwards.
 *
 * Sizes are deduped and sorted ascending here so the function does not depend
 * on caller ordering. On a tie (equal bundle counts) `<=` lets the later, larger
 * size overwrite, so the tie-break is deterministic: prefer the larger size.
 *
 * Complexity: O(groupSize * distinctSizes) time, O(groupSize) memory.
 */
export function getBookingQuote(
  bundleSizes: number[],
  groupSize: number,
): BookingQuote {
  const sizes = [...new Set(bundleSizes)].sort((a, b) => a - b);

  const best = new Array<number>(groupSize + 1).fill(
    Number.POSITIVE_INFINITY,
  );
  const choice = new Array<number>(groupSize + 1).fill(0);
  best[0] = 0;

  for (let amount = 1; amount <= groupSize; amount += 1) {
    for (const size of sizes) {
      // Sorted ascending, so no larger size can fit either.
      if (size > amount) {
        break;
      }

      const previous = best[amount - size];
      if (previous === Number.POSITIVE_INFINITY) {
        continue;
      }

      const candidate = previous + 1;
      if (candidate <= best[amount]) {
        best[amount] = candidate;
        choice[amount] = size;
      }
    }
  }

  const totalBundles = best[groupSize];
  if (totalBundles === Number.POSITIVE_INFINITY) {
    return { possible: false, totalBundles: null, bundles: [] };
  }

  // Walk backwards through the choices to count how many of each size are used.
  const counts = new Map<number, number>();
  for (let amount = groupSize; amount > 0; amount -= choice[amount]) {
    const size = choice[amount];
    counts.set(size, (counts.get(size) ?? 0) + 1);
  }

  const bundles = [...counts.entries()]
    .map(([size, count]) => ({ size, count }))
    .sort((a, b) => b.size - a.size);

  return { possible: true, totalBundles, bundles };
}
