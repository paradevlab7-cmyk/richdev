import { describe, expect, it } from "vitest";
import { SUPERSEDED_STANDARD_DATE_PARAMETER_MESSAGE, hasActionableCollectionError, normalizeCollectionRunError } from "../shared/collectionRunStatus";

describe("collection run error status", () => {
  it("clears the legacy superseded standard-date note from successful executions", () => {
    expect(normalizeCollectionRunError("success", SUPERSEDED_STANDARD_DATE_PARAMETER_MESSAGE)).toBeNull();
    expect(hasActionableCollectionError("success", SUPERSEDED_STANDARD_DATE_PARAMETER_MESSAGE)).toBe(false);
  });

  it("keeps genuine failed collection errors actionable", () => {
    expect(normalizeCollectionRunError("failed", "fetch failed")).toBe("fetch failed");
    expect(hasActionableCollectionError("failed", "fetch failed")).toBe(true);
  });
});
