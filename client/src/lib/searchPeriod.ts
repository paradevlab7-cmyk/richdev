import { DEFAULT_COLLECTION_DAYS } from "@shared/collectionPreferences";

export { DEFAULT_COLLECTION_DAYS };

export function toDateInput(daysAgo = 0, now = new Date()) {
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

export function createCollectionRequest(days = DEFAULT_COLLECTION_DAYS) {
  return { days };
}
