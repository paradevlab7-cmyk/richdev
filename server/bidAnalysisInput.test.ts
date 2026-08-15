import { describe, expect, it } from "vitest";
import { bidAnalysisInput } from "./routers";

describe("bid analysis input", () => {
  it("trims optional analysis conditions and accepts a valid base amount", () => {
    expect(bidAnalysisInput.parse({ agency: " 조달청 ", itemName: " 전산장비 ", baseAmount: 100000000 })).toEqual({ agency: "조달청", itemName: "전산장비", baseAmount: 100000000 });
  });

  it("rejects non-positive and unrealistically large base amounts", () => {
    expect(bidAnalysisInput.safeParse({ baseAmount: 0 }).success).toBe(false);
    expect(bidAnalysisInput.safeParse({ baseAmount: 1_000_000_000_000_000 }).success).toBe(false);
  });
});
