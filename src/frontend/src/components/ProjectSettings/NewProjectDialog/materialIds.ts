export function nextAvailableMaterialId(ids: number[]): number {
  if (ids.length === 0) return 1;
  return Math.max(...ids) + 1;
}
