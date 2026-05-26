/** Sort events with the ones closest to today first, then newest date as tiebreaker. */
export function sortEventsMostCurrentFirst<T extends { startDatetime: Date | string }>(
  events: T[]
): T[] {
  const now = Date.now();
  return [...events].sort((a, b) => {
    const aTime = new Date(a.startDatetime).getTime();
    const bTime = new Date(b.startDatetime).getTime();
    const aDist = Math.abs(aTime - now);
    const bDist = Math.abs(bTime - now);
    if (aDist !== bDist) return aDist - bDist;
    return bTime - aTime;
  });
}
