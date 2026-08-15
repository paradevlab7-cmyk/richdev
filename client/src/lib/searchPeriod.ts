export function toDateInput(daysAgo = 0, now = new Date()) {
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

export function createCollectionRequest(days: number) {
  return { days };
}
