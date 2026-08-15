export type CollectionErrorKind = "network" | "authentication" | "rate-limit" | "timeout" | "api" | "other";
export const COLLECTION_ERROR_KIND_LABELS: Record<CollectionErrorKind, string> = { network: "네트워크", authentication: "인증", "rate-limit": "호출 제한", timeout: "시간 초과", api: "API 응답", other: "기타" };

export function classifyCollectionError(message: string | null | undefined): CollectionErrorKind | null {
  if (!message) return null; const value = message.toLowerCase();
  if (/servicekey|인증키|unauthorized|forbidden|401|403/.test(value)) return "authentication";
  if (/429|rate limit|too many|호출.?제한/.test(value)) return "rate-limit";
  if (/timeout|timed out|시간.?초과/.test(value)) return "timeout";
  if (/fetch failed|network|econn|enotfound|socket/.test(value)) return "network";
  if (/api|http|response|json|data.go.kr/.test(value)) return "api";
  return "other";
}

export type ActiveCollectionRunForEta = { status: string; sourceType: string; fetchedCount: number; totalAvailable: number; startedAt: Date | string | number; };
export function estimateCollectionCompletion(run: ActiveCollectionRunForEta, now = new Date()) {
  if (run.status !== "running" || run.sourceType !== "standard" || run.totalAvailable <= run.fetchedCount || run.fetchedCount <= 0) return null;
  const startedAt = new Date(run.startedAt); const elapsedSeconds = Math.max(1, (now.getTime() - startedAt.getTime()) / 1000); const itemsPerSecond = run.fetchedCount / elapsedSeconds;
  if (!Number.isFinite(itemsPerSecond) || itemsPerSecond <= 0) return null;
  const remainingCount = Math.max(0, run.totalAvailable - run.fetchedCount); const remainingSeconds = Math.ceil(remainingCount / itemsPerSecond); const estimatedCompletionAt = new Date(now.getTime() + remainingSeconds * 1000);
  return { remainingCount, remainingSeconds, estimatedCompletionAt, itemsPerSecond };
}
