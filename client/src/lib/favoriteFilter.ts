import type { SpecSort, SpecStatus } from "./specFilters";

export type FavoriteSpecQuery = { q: string; from: string; to: string; keywords: string[]; status: SpecStatus; sort: SpecSort };
const statuses = new Set<SpecStatus>(["all", "active", "closing", "closed", "unknown"]);
const sorts = new Set<SpecSort>(["latest", "oldest", "deadline", "amount", "title"]);

export function parseFavoriteSpecQuery(value: string): FavoriteSpecQuery | null {
  try {
    const parsed = JSON.parse(value) as Partial<FavoriteSpecQuery>;
    if (typeof parsed.q !== "string" || typeof parsed.from !== "string" || typeof parsed.to !== "string" || !Array.isArray(parsed.keywords) || !parsed.keywords.every(keyword => typeof keyword === "string") || !statuses.has(parsed.status as SpecStatus) || !sorts.has(parsed.sort as SpecSort)) return null;
    return { q: parsed.q, from: parsed.from, to: parsed.to, keywords: parsed.keywords, status: parsed.status as SpecStatus, sort: parsed.sort as SpecSort };
  } catch { return null; }
}
