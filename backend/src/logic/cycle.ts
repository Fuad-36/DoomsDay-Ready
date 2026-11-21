/**
 * Decides whether replacing `movieId`'s prerequisites with
 * `proposedPrerequisiteIds` would make it (transitively) depend on itself.
 *
 * Walking "depends on" edges from each proposed prerequisite and looking for
 * `movieId` is enough: reaching it means the new edge closes a loop. The walk is
 * iterative and keeps a visited set, so a pre-existing cycle elsewhere in the
 * data cannot trap it in an infinite loop.
 */
export function wouldCreateCycle(
  prerequisitesByMovie: ReadonlyMap<string, string[]>,
  movieId: string,
  proposedPrerequisiteIds: string[],
): boolean {
  for (const prerequisiteId of proposedPrerequisiteIds) {
    if (prerequisiteId === movieId) {
      return true;
    }

    const visited = new Set<string>();
    const stack: string[] = [prerequisiteId];

    while (stack.length > 0) {
      const currentId = stack.pop() as string;

      if (currentId === movieId) {
        return true;
      }

      if (visited.has(currentId)) {
        continue;
      }
      visited.add(currentId);

      const directPrerequisites = prerequisitesByMovie.get(currentId);
      if (directPrerequisites) {
        for (const id of directPrerequisites) {
          stack.push(id);
        }
      }
    }
  }

  return false;
}
