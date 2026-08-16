import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getDb: vi.fn(), getSettings: vi.fn(), encryptSecret: vi.fn((value: string) => `encrypted:${value}`), update: vi.fn(), set: vi.fn(), where: vi.fn() }));
vi.mock("./db", () => ({ getDb: mocks.getDb, getSettings: mocks.getSettings, getCollectionDailyStats: vi.fn(), getCollectionPreferences: vi.fn(), getCollectionRuns: vi.fn(), getCollectionWorkEstimate: vi.fn(), getCompanyHistory: vi.fn(), getBidRateTrend: vi.fn(), estimateBid: vi.fn(), getNotice: vi.fn(), getNoticeStats: vi.fn(), listBidAnalysisHistory: vi.fn(), listFavoriteFilters: vi.fn(), listKeywords: vi.fn(), listNotices: vi.fn(), listSaved: vi.fn(), saveBidAnalysisHistory: vi.fn(), saveCollectionPreferences: vi.fn() }));
vi.mock("./g2b", () => ({ collectForUser: vi.fn(), retryFailedCollectionRun: vi.fn() }));
vi.mock("./secure", () => ({ decryptSecret: vi.fn(value => value), encryptSecret: mocks.encryptSecret }));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const context = { user: { id: 17, openId: "settings-user", email: null, name: null, loginMethod: null, role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext;
const input = { dataServiceKey: "updated-service-key", telegramBotToken: "updated-bot-token", telegramChatId: "updated-chat-id", notificationEmail: "new@example.com", emailEnabled: false, telegramEnabled: true, emailProvider: "smtp" as const, fallbackEmailProvider: "owner" as const, emailFrom: "sender@example.com", smtpHost: "smtp.example.com", smtpPort: 465, smtpUsername: "mailer", smtpPassword: "updated-password", emailApiKey: "updated-api-key", mailgunDomain: "mg.example.com" };

describe("settings.save", () => {
  it("updates an existing user's saved settings with edited values", async () => {
    mocks.getSettings.mockResolvedValueOnce({ userId: 17, dataServiceKey: "encrypted:old", telegramBotToken: "encrypted:old", smtpPassword: "encrypted:old", emailApiKey: "encrypted:old" });
    mocks.where.mockResolvedValueOnce(undefined); mocks.set.mockReturnValueOnce({ where: mocks.where }); mocks.update.mockReturnValueOnce({ set: mocks.set }); mocks.getDb.mockResolvedValueOnce({ update: mocks.update });
    const result = await appRouter.createCaller(context).settings.save(input);
    expect(result).toEqual({ success: true });
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ userId: 17, dataServiceKey: "encrypted:updated-service-key", telegramBotToken: "encrypted:updated-bot-token", telegramChatId: "updated-chat-id", smtpPassword: "encrypted:updated-password", emailApiKey: "encrypted:updated-api-key", smtpHost: "smtp.example.com", smtpPort: 465, emailEnabled: false }));
  });
});
