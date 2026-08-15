export type BidScenario = { key: string; name: string; source: "원가·마진" | "통계 참고"; price: number; rate?: number; commissionFee: number; expectedProfit: number | null; marginRate: number | null; note: string };

export function calculateBidFloor(costAmount: number, targetMarginRate: number, commissionRate = 0) {
  if (!Number.isFinite(costAmount) || costAmount <= 0 || !Number.isFinite(targetMarginRate) || !Number.isFinite(commissionRate) || targetMarginRate < 0 || commissionRate < 0 || targetMarginRate + commissionRate >= 100) return null;
  return Math.ceil(costAmount / (1 - targetMarginRate / 100 - commissionRate / 100));
}

export function calculateExpectedProfit(price: number, costAmount: number, commissionRate = 0) {
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(costAmount) || costAmount < 0 || !Number.isFinite(commissionRate) || commissionRate < 0) return null;
  return price * (1 - commissionRate / 100) - costAmount;
}

export function calculateMarginRate(price: number, costAmount: number, commissionRate = 0) {
  const profit = calculateExpectedProfit(price, costAmount, commissionRate);
  return profit === null ? null : profit / price * 100;
}

export function buildBidScenarios(input: { costAmount: number; targetMarginRate: number; commissionRate: number; lowRate: number; medianRate: number; highRate: number; baseAmount: number }) {
  const floor = calculateBidFloor(input.costAmount, input.targetMarginRate, input.commissionRate);
  const rows: Array<Omit<BidScenario, "marginRate">> = [];
  if (floor) rows.push({ key: "floor", name: "원가·마진 하한선", source: "원가·마진", price: floor, commissionFee: floor * input.commissionRate / 100, expectedProfit: calculateExpectedProfit(floor, input.costAmount, input.commissionRate), note: `목표 마진 ${input.targetMarginRate.toFixed(1)}%` });
  rows.push(
    { key: "low", name: "통계 하한", source: "통계 참고", price: Math.round(input.baseAmount * input.lowRate / 100), rate: input.lowRate, commissionFee: Math.round(input.baseAmount * input.lowRate / 100 * input.commissionRate / 100), expectedProfit: calculateExpectedProfit(Math.round(input.baseAmount * input.lowRate / 100), input.costAmount, input.commissionRate), note: "하위 25% 낙찰률" },
    { key: "median", name: "통계 중앙", source: "통계 참고", price: Math.round(input.baseAmount * input.medianRate / 100), rate: input.medianRate, commissionFee: Math.round(input.baseAmount * input.medianRate / 100 * input.commissionRate / 100), expectedProfit: calculateExpectedProfit(Math.round(input.baseAmount * input.medianRate / 100), input.costAmount, input.commissionRate), note: "중앙 낙찰률" },
    { key: "high", name: "통계 상한", source: "통계 참고", price: Math.round(input.baseAmount * input.highRate / 100), rate: input.highRate, commissionFee: Math.round(input.baseAmount * input.highRate / 100 * input.commissionRate / 100), expectedProfit: calculateExpectedProfit(Math.round(input.baseAmount * input.highRate / 100), input.costAmount, input.commissionRate), note: "상위 75% 낙찰률" },
  );
  return rows.map(row => ({ ...row, marginRate: calculateMarginRate(row.price, input.costAmount, input.commissionRate) }));
}
