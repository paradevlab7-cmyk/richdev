import { describe, expect, it } from "vitest";
import { collectionDailyStatsInput } from "./routers";

describe("collectionDailyStatsInput", () => {
  it("7·30·90일 차트 조회 기간을 허용한다", () => {
    expect(collectionDailyStatsInput.safeParse({ days: 7 }).success).toBe(true);
    expect(collectionDailyStatsInput.safeParse({ days: 30 }).success).toBe(true);
    expect(collectionDailyStatsInput.safeParse({ days: 90 }).success).toBe(true);
  });
  it("지원 범위를 초과하는 일수는 거부한다", () => {
    expect(collectionDailyStatsInput.safeParse({ days: 91 }).success).toBe(false);
  });
});
