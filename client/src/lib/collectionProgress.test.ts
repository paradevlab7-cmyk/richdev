import { describe, expect, it } from "vitest";
import { collectionCompletionTotal, completedRunIds, hasFinishedAllActiveRuns, summarizeCollectionProgress } from "./collectionProgress";

describe("collection progress", () => {
  it("summarizes all active collection runs", () => {
    expect(summarizeCollectionProgress([{ id: 1, sourceType: "standard", status: "running", fetchedCount: 200, totalAvailable: 1000 }, { id: 2, sourceType: "bid", status: "success", fetchedCount: 100, totalAvailable: 100 }])).toMatchObject({ total: 1000, fetched: 200, percentage: 20 });
  });

  it("detects a run that changed from running to success", () => {
    expect(completedRunIds({ 1: "running", 2: "success" }, [{ id: 1, sourceType: "standard", status: "success" }, { id: 2, sourceType: "bid", status: "success" }])).toEqual([1]);
  });

  it("notifies only after all active runs have finished and totals the full session", () => {
    const previous = { 1: "running", 2: "running" };
    const partial = [{ id: 1, sourceType: "standard", status: "success" as const, storedCount: 200 }, { id: 2, sourceType: "bid", status: "running" as const, storedCount: 100 }];
    const complete = [{ id: 1, sourceType: "standard", status: "success" as const, storedCount: 200 }, { id: 2, sourceType: "bid", status: "success" as const, storedCount: 100 }];
    expect(hasFinishedAllActiveRuns(previous, partial)).toBe(false);
    expect(hasFinishedAllActiveRuns(previous, complete)).toBe(true);
    expect(collectionCompletionTotal(complete)).toBe(300);
  });
});
