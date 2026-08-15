import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ estimateBid: vi.fn(), getBidRateTrend: vi.fn(), saveBidAnalysisHistory: vi.fn(), listBidAnalysisHistory: vi.fn() }));

vi.mock("./db", () => ({
  estimateBid: mocks.estimateBid, getBidRateTrend: mocks.getBidRateTrend,
  saveBidAnalysisHistory: mocks.saveBidAnalysisHistory,
  listBidAnalysisHistory: mocks.listBidAnalysisHistory,
  getCollectionDailyStats: vi.fn(), getCollectionPreferences: vi.fn(), getCollectionRuns: vi.fn(), getCollectionWorkEstimate: vi.fn(), getCompanyHistory: vi.fn(), getDb: vi.fn(), getNotice: vi.fn(), getNoticeStats: vi.fn(), getSettings: vi.fn(), listFavoriteFilters: vi.fn(), listKeywords: vi.fn(), listNotices: vi.fn(), listSaved: vi.fn(), saveCollectionPreferences: vi.fn(),
}));
vi.mock("./g2b", () => ({ collectForUser: vi.fn() }));
vi.mock("./secure", () => ({ decryptSecret: vi.fn(), encryptSecret: vi.fn() }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const context = { user: { id: 17, openId: "analysis-user", email: null, name: null, loginMethod: null, role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext;

describe("analysis router", () => {
  it("returns only the current user's saved analysis history", async () => {
    mocks.listBidAnalysisHistory.mockResolvedValueOnce([{ id: 4, userId: 17, sampleSize: 12 }]);
    const result = await appRouter.createCaller(context).analysis.history();
    expect(mocks.listBidAnalysisHistory).toHaveBeenCalledWith(17);
    expect(result).toEqual([{ id: 4, userId: 17, sampleSize: 12 }]);
  });

  it("recalculates a valid analysis and saves its statistical fields for the current user", async () => {
    const input = { agency: "조달청", itemName: "전산장비", baseAmount: 100000000 };
    const analysis = { sampleSize: 8, medianRate: 90, lowRate: 88, highRate: 92, expectedBid: 90000000, minBid: 88000000, maxBid: 92000000, minRate: 82, maxRate: 97, distribution: [], samples: [] };
    mocks.estimateBid.mockResolvedValueOnce(analysis); mocks.saveBidAnalysisHistory.mockResolvedValueOnce([{ id: 5 }]);
    const result = await appRouter.createCaller(context).analysis.save(input);
    expect(mocks.estimateBid).toHaveBeenCalledWith(input);
    expect(mocks.saveBidAnalysisHistory).toHaveBeenCalledWith(17, input, expect.objectContaining({ sampleSize: 8, expectedBid: 90000000, minBid: 88000000, maxBid: 92000000 }));
    expect(result).toEqual([{ id: 5 }]);
  });

  it("returns agency and item-specific rate trend points", async () => {
    const input = { agency: "조달청", itemName: "전산장비" };
    mocks.getBidRateTrend.mockResolvedValueOnce([{ date: "2026-08-01", averageRate: 89.2, count: 3 }]);
    const result = await appRouter.createCaller(context).analysis.trend(input);
    expect(mocks.getBidRateTrend).toHaveBeenCalledWith({ ...input, days: 90 });
    expect(result).toEqual([{ date: "2026-08-01", averageRate: 89.2, count: 3 }]);
  });
});
