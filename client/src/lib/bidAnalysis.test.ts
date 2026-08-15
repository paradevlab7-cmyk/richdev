import { describe, expect, it } from "vitest";
import { formatKrwInput, getRangeMarker, parseKrwAmount } from "./bidAnalysis";

describe("bid analysis helpers", () => {
  it("normalizes a Korean won amount while typing", () => {
    expect(formatKrwInput("100000000")).toBe("100,000,000");
    expect(parseKrwAmount("1억 2,000,000원")).toBe(12000000);
  });

  it("places the median rate within the selected reference range", () => {
    expect(getRangeMarker(86, 94, 90)).toBe(50);
    expect(getRangeMarker(86, 94, 100)).toBe(100);
  });
});
