export function appendUniqueById<T extends { id: number }>(current: T[], next: T[]) {
  const seen = new Set(current.map(item => item.id));
  return [...current, ...next.filter(item => !seen.has(item.id))];
}
