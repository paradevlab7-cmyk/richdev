import { describe, expect, it } from "vitest";
import { classifyCollectionError, estimateCollectionCompletion } from "../shared/collectionRunInsights";

describe("collection run insights", () => {
  it("classifies common collection failures for filtering", () => {
    expect(classifyCollectionError("fetch failed")).toBe("network");
    expect(classifyCollectionError("HTTP 429 rate limit")).toBe("rate-limit");
    expect(classifyCollectionError("공공데이터 인증키가 설정되지 않았습니다.")).toBe("authentication");
  });

  it("estimates a standard backfill completion time from observed progress", () => {
    const now = new Date("2026-08-15T15:00:00Z"); const eta = estimateCollectionCompletion({ status: "running", sourceType: "standard", fetchedCount: 6000, totalAvailable: 12000, startedAt: new Date("2026-08-15T10:00:00Z") }, now);
    expect(eta).toMatchObject({ remainingCount: 6000, remainingSeconds: 18000 });
    expect(eta?.estimatedCompletionAt.toISOString()).toBe("2026-08-15T20:00:00.000Z");
  });
});
