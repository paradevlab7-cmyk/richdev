export const COLLECTION_SOURCE_TYPES = ["bid", "spec", "award", "contract", "standard"] as const;
export type CollectionSourceType = (typeof COLLECTION_SOURCE_TYPES)[number];

export const COLLECTION_SERVICE_LABELS: Record<CollectionSourceType, string> = {
  bid: "입찰공고",
  spec: "사전규격",
  award: "낙찰정보",
  contract: "계약정보",
  standard: "개방표준",
};

export const COLLECTION_PERIOD_OPTIONS = [15, 30, 60, 90, 180] as const;
export const DEFAULT_COLLECTION_DAYS = 90;
export const DEFAULT_SERVICE_COLLECTION_DAYS: Record<CollectionSourceType, number> = {
  bid: 90,
  spec: 90,
  award: 30,
  contract: 90,
  standard: 30,
};

export function getCollectionWindowDays(sourceType: CollectionSourceType, days: number) {
  const normalized = Math.max(1, Math.min(Math.round(days), 180));
  return sourceType === "award" || sourceType === "standard" ? Math.min(normalized, 30) : normalized;
}

export function normalizeCollectionDays(value: unknown, fallback = DEFAULT_COLLECTION_DAYS) {
  const days = Number(value);
  return COLLECTION_PERIOD_OPTIONS.includes(days as (typeof COLLECTION_PERIOD_OPTIONS)[number]) ? days : fallback;
}

export function normalizeServiceCollectionDefaults(value: unknown): Record<CollectionSourceType, number> {
  const candidate = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(COLLECTION_SOURCE_TYPES.map(sourceType => [sourceType, getCollectionWindowDays(sourceType, normalizeCollectionDays(candidate[sourceType], DEFAULT_SERVICE_COLLECTION_DAYS[sourceType]))])) as Record<CollectionSourceType, number>;
}

export type CollectionTimingSample = {
  sourceType: string;
  status: string;
  fetchedCount: number;
  totalAvailable: number;
  queryStartAt: Date | null;
  queryEndAt: Date | null;
  startedAt: Date;
  finishedAt: Date | null;
};

export function estimateCollectionWork(days: number, sourceTypes: CollectionSourceType[], samples: CollectionTimingSample[]) {
  return sourceTypes.map(sourceType => {
    const effectiveDays = getCollectionWindowDays(sourceType, days);
    const matching = samples.filter(sample => sample.sourceType === sourceType);
    const reference = matching.find(sample => sample.totalAvailable > 0 && sample.queryStartAt && sample.queryEndAt);
    const referenceWindowDays = reference?.queryStartAt && reference.queryEndAt ? Math.max(1, Math.ceil((reference.queryEndAt.getTime() - reference.queryStartAt.getTime()) / 86400000)) : null;
    const estimatedCount = reference && referenceWindowDays ? Math.max(1, Math.ceil(reference.totalAvailable * effectiveDays / referenceWindowDays)) : null;
    const timingSamples = matching.filter(sample => sample.status === "success" && sample.fetchedCount > 0 && sample.finishedAt && sample.finishedAt.getTime() > sample.startedAt.getTime());
    const totalItems = timingSamples.reduce((sum, sample) => sum + sample.fetchedCount, 0);
    const totalSeconds = timingSamples.reduce((sum, sample) => sum + ((sample.finishedAt!.getTime() - sample.startedAt.getTime()) / 1000), 0);
    const estimatedSeconds = estimatedCount && totalItems > 0 && totalSeconds > 0 ? Math.max(1, Math.ceil(estimatedCount / (totalItems / totalSeconds))) : null;
    return { sourceType, effectiveDays, estimatedCount, estimatedSeconds, historyRuns: timingSamples.length, referenceWindowDays };
  });
}
