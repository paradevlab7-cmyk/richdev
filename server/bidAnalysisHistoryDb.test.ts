import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const limit = vi.fn(); const orderBy = vi.fn(() => ({ limit })); const where = vi.fn(() => ({ orderBy })); const from = vi.fn(() => ({ where })); const select = vi.fn(() => ({ from })); const values = vi.fn(); const insert = vi.fn(() => ({ values }));
  return { db: { select, insert }, select, from, where, orderBy, limit, insert, values, drizzle: vi.fn(), eq: vi.fn(() => "user-condition"), desc: vi.fn(() => "latest-first") };
});

vi.mock("drizzle-orm/mysql2", () => ({ drizzle: mocks.drizzle }));
vi.mock("drizzle-orm", async importOriginal => ({ ...(await importOriginal<typeof import("drizzle-orm")>()), eq: mocks.eq, desc: mocks.desc }));

import { listBidAnalysisHistory, saveBidAnalysisHistory } from "./db";
import { bidAnalysisHistory } from "../drizzle/schema";

describe("bid analysis history database helpers", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "mysql://test";
    mocks.drizzle.mockReturnValue(mocks.db);
    mocks.select.mockClear(); mocks.from.mockClear(); mocks.where.mockClear(); mocks.orderBy.mockClear(); mocks.limit.mockReset(); mocks.insert.mockClear(); mocks.values.mockReset(); mocks.eq.mockClear(); mocks.desc.mockClear();
  });

  it("creates a user-scoped latest-first history query with a 12-record cap", async () => {
    const records = [{ id: 11, userId: 7, agency: "조달청", itemName: "전산장비", baseAmount: "100000000.00", expectedBid: "90000000.00", sampleSize: 12 }];
    mocks.limit.mockResolvedValueOnce(records);

    const result = await listBidAnalysisHistory(7);
    expect(result).toEqual(records);
    expect(mocks.select).toHaveBeenCalledOnce();
    expect(mocks.eq).toHaveBeenCalledWith(bidAnalysisHistory.userId, 7);
    expect(mocks.desc).toHaveBeenCalledWith(bidAnalysisHistory.createdAt);
    expect(mocks.where).toHaveBeenCalledWith("user-condition");
    expect(mocks.orderBy).toHaveBeenCalledWith("latest-first");
    expect(mocks.where).toHaveBeenCalledOnce();
    expect(mocks.orderBy).toHaveBeenCalledOnce();
    expect(mocks.limit).toHaveBeenCalledWith(12);
    expect(result[0]).toMatchObject({ agency: "조달청", itemName: "전산장비", baseAmount: "100000000.00", expectedBid: "90000000.00", sampleSize: 12 });
  });

  it("stores normalized decimal statistics then returns the refreshed history", async () => {
    mocks.values.mockResolvedValueOnce({}); mocks.limit.mockResolvedValueOnce([{ id: 12, userId: 7 }]);
    const result = await saveBidAnalysisHistory(7, { agency: "조달청", itemName: "전산장비", baseAmount: 100000000 }, { sampleSize: 8, medianRate: 90, lowRate: 88, highRate: 92, expectedBid: 90000000, minBid: 88000000, maxBid: 92000000 });

    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({ userId: 7, agency: "조달청", itemName: "전산장비", baseAmount: "100000000.00", medianRate: "90.0000", expectedBid: "90000000.00", maxBid: "92000000.00" }));
    expect(mocks.limit).toHaveBeenCalledWith(12);
    expect(result).toEqual([{ id: 12, userId: 7 }]);
  });
});
