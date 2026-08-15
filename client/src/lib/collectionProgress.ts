export type CollectionRunForProgress = {
  id: number;
  sourceType: string;
  status: "running" | "success" | "failed";
  fetchedCount?: number | null;
  totalAvailable?: number | null;
  storedCount?: number | null;
};

export function summarizeCollectionProgress(runs: CollectionRunForProgress[]) {
  const activeRuns = runs.filter(run => run.status === "running" && Number(run.totalAvailable) > 0);
  const total = activeRuns.reduce((sum, run) => sum + Number(run.totalAvailable ?? 0), 0);
  const fetched = activeRuns.reduce((sum, run) => sum + Number(run.fetchedCount ?? 0), 0);
  return { activeRuns, total, fetched, percentage: total ? Math.min(100, Math.round(fetched / total * 100)) : 0 };
}

export function completedRunIds(previous: Record<number, string>, runs: CollectionRunForProgress[]) {
  return runs.filter(run => previous[run.id] === "running" && run.status === "success").map(run => run.id);
}

export function hasFinishedAllActiveRuns(previous: Record<number, string>, runs: CollectionRunForProgress[]) {
  return Object.values(previous).includes("running") && !runs.some(run => run.status === "running");
}

export function collectionCompletionTotal(runs: CollectionRunForProgress[]) {
  return runs.reduce((sum, run) => sum + Number(run.storedCount ?? run.fetchedCount ?? 0), 0);
}
