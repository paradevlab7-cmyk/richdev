export type BidScenario = { key: string; name: string; source: "원가·마진" | "통계 참고"; price: number; rate?: number; marginRate: number | null; note: string };

export function calculateBidFloor(costAmount: number, targetMarginRate: number) {
  if (!Number.isFinite(costAmount) || costAmount <= 0 || !Number.isFinite(targetMarginRate) || targetMarginRate < 0 || targetMarginRate >= 100) return null;
  return Math.ceil(costAmount / (1 - targetMarginRate / 100));
}

export function calculateMarginRate(price: number, costAmount: number) {
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(costAmount) || costAmount < 0) return null;
  return ((price - costAmount) / price) * 100;
}

export function buildBidScenarios(input: { costAmount: number; targetMarginRate: number; lowRate: number; medianRate: number; highRate: number; baseAmount: number }) {
  const floor = calculateBidFloor(input.costAmount, input.targetMarginRate);
  const rows: Array<Omit<BidScenario, "marginRate">> = [];
  if (floor) rows.push({ key: "floor", name: "원가·마진 하한선", source: "원가·마진", price: floor, note: `목표 마진 ${input.targetMarginRate.toFixed(1)}%` });
  rows.push(
    { key: "low", name: "통계 하한", source: "통계 참고", price: Math.round(input.baseAmount * input.lowRate / 100), rate: input.lowRate, note: "하위 25% 낙찰률" },
    { key: "median", name: "통계 중앙", source: "통계 참고", price: Math.round(input.baseAmount * input.medianRate / 100), rate: input.medianRate, note: "중앙 낙찰률" },
    { key: "high", name: "통계 상한", source: "통계 참고", price: Math.round(input.baseAmount * input.highRate / 100), rate: input.highRate, note: "상위 75% 낙찰률" },
  );
  return rows.map(row => ({ ...row, marginRate: calculateMarginRate(row.price, input.costAmount) }));
}
