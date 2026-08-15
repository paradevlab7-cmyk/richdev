import { describe, expect, it } from "vitest";
import { buildBidAnalysisExportData } from "./bidAnalysisExport";

describe("bid analysis export data", () => {
  it("creates summary, scenario, and trend sheets with profit and fee fields", () => {
    const data = buildBidAnalysisExportData({ agency: "조달청", itemName: "전산장비", baseAmount: 100000000, totalCost: 82000000, targetMarginRate: 15, commissionRate: 1, trendDays: 90, scenarios: [{ key: "median", name: "통계 중앙", source: "통계 참고", price: 90000000, rate: 90, commissionFee: 900000, expectedProfit: 7100000, marginRate: 7.89, note: "중앙 낙찰률" }], trend: [{ date: "2026-08-01", averageRate: 90.2, count: 3 }] });
    expect(data.summary).toEqual(expect.arrayContaining([expect.objectContaining({ 항목: "총원가", 값: 82000000 }), expect.objectContaining({ 항목: "추세 조회 기간(일)", 값: 90 })]));
    expect(data.scenarios[0]).toMatchObject({ 시나리오: "통계 중앙", 예상수수료: 900000, 예상이익금: 7100000 });
    expect(data.trend).toEqual([{ 날짜: "2026-08-01", 평균낙찰률: 90.2, 표본수: 3 }]);
  });
});
