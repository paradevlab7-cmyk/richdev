import { describe, expect, it } from "vitest";
import { buildBidScenarios, calculateBidFloor } from "./bidScenario";

describe("bid scenario helpers", () => {
  it("calculates the lowest bid that preserves a gross-margin target", () => {
    expect(calculateBidFloor(80000000, 20)).toBe(100000000);
    expect(calculateBidFloor(80000000, 100)).toBeNull();
  });

  it("places cost floor and three statistical scenarios in one comparable model", () => {
    const scenarios = buildBidScenarios({ costAmount: 80000000, targetMarginRate: 20, lowRate: 88, medianRate: 90, highRate: 92, baseAmount: 100000000 });
    expect(scenarios).toHaveLength(4);
    expect(scenarios[0]).toMatchObject({ name: "원가·마진 하한선", price: 100000000, marginRate: 20 });
    expect(scenarios.find(row => row.key === "median")).toMatchObject({ price: 90000000, marginRate: expect.closeTo(11.111, 2) });
  });
});
