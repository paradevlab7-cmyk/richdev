import { describe, expect, it } from "vitest";
import { buildBidRateTrend } from "./bidRateTrend";

describe("bid rate trend", () => {
  it("groups matching award rates by date and returns chronological daily averages", () => {
    const trend = buildBidRateTrend([{ noticeDate: new Date("2026-08-03T00:00:00Z"), awardRate: "92" }, { noticeDate: new Date("2026-08-01T00:00:00Z"), awardRate: "88" }, { noticeDate: new Date("2026-08-03T12:00:00Z"), awardRate: "90" }, { noticeDate: null, awardRate: "95" }]);
    expect(trend).toEqual([{ date: "2026-08-01", averageRate: 88, count: 1 }, { date: "2026-08-03", averageRate: 91, count: 2 }]);
  });

  it("keeps the latest twelve days to preserve a compact chart", () => {
    const records = Array.from({ length: 14 }, (_, index) => ({ noticeDate: new Date(`2026-07-${String(index + 1).padStart(2, "0")}T00:00:00Z`), awardRate: 90 + index }));
    const trend = buildBidRateTrend(records);
    expect(trend).toHaveLength(12);
    expect(trend[0].date).toBe("2026-07-03");
    expect(trend[11].date).toBe("2026-07-14");
  });
});
