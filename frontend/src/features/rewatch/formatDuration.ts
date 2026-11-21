/**
 * Formats a whole number of minutes as "Xh Ym". Keeping the hours and minutes
 * together gives the rewatch screen one consistent duration format.
 */
export function formatDuration(totalMinutes: number): string {
  const safeMinutes = Math.max(
    0,
    Math.floor(Number.isFinite(totalMinutes) ? totalMinutes : 0),
  );
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  return `${hours}h ${minutes}m`;
}
