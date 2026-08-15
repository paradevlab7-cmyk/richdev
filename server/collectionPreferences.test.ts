import { describe, expect, it } from "vitest";
import { estimateCollectionWork, normalizeServiceCollectionDefaults } from "../shared/collectionPreferences";

describe("collection preferences", () => {
  it("normalizes service defaults and applies the API's 30-day limits", () => {
    expect(normalizeServiceCollectionDefaults({ bid: 60, spec: 180, award: 90, contract: 15, standard: 180 })).toEqual({ bid: 60, spec: 180, award: 30, contract: 15, standard: 30 });
  });

  it("estimates record counts and completion time from real-style collection run samples", () => {
    const startedAt = new Date("2026-08-01T00:00:00Z");
    const finishedAt = new Date("2026-08-01T00:10:00Z");
    const result = estimateCollectionWork(90, ["bid"], [{ sourceType: "bid", status: "success", fetchedCount: 1000, totalAvailable: 3000, queryStartAt: new Date("2026-07-02T00:00:00Z"), queryEndAt: new Date("2026-08-01T00:00:00Z"), startedAt, finishedAt }]);

    expect(result[0]).toMatchObject({ sourceType: "bid", effectiveDays: 90, estimatedCount: 9000, estimatedSeconds: 5400, historyRuns: 1 });
  });
});
