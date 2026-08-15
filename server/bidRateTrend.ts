export type AwardRateRecord = { noticeDate: Date | null; awardRate: unknown };

export function buildBidRateTrend(records: AwardRateRecord[]) {
  const grouped = new Map<string, number[]>();
  for (const record of records) {
    const rate = Number(record.awardRate);
    if (!record.noticeDate || !Number.isFinite(rate)) continue;
    const key = record.noticeDate.toISOString().slice(0, 10); const values = grouped.get(key) ?? [];
    values.push(rate); grouped.set(key, values);
  }
  return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([date, rates]) => ({ date, averageRate: Number((rates.reduce((sum, rate) => sum + rate, 0) / rates.length).toFixed(2)), count: rates.length }));
}
