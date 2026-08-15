import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { and, desc, eq } from "drizzle-orm";
import { estimateBid, getCollectionDailyStats, getCollectionPreferences, getCollectionRuns, getCollectionWorkEstimate, getCompanyHistory, getDb, getNotice, getNoticeStats, getSettings, listFavoriteFilters, listKeywords, listNotices, listSaved, saveCollectionPreferences } from "./db";
import { collectForUser } from "./g2b";
import { decryptSecret, encryptSecret } from "./secure";
import { parseEndOfDay, parseStartOfDay } from "./dateRange";
import { favoriteFilters, monitoringKeywords, notices, savedNotices, userSettings } from "../drizzle/schema";
import { COLLECTION_SOURCE_TYPES, DEFAULT_COLLECTION_DAYS, normalizeCollectionDays, normalizeServiceCollectionDefaults } from "../shared/collectionPreferences";

const sourceTypes = COLLECTION_SOURCE_TYPES;
export const collectionDailyStatsInput = z.object({ days: z.number().int().min(1).max(90).default(7) });
export const collectionServiceDefaultsInput = z.object({ bid: z.number().int().min(1).max(180), spec: z.number().int().min(1).max(180), award: z.number().int().min(1).max(180), contract: z.number().int().min(1).max(180), standard: z.number().int().min(1).max(180) });
export const collectionPreferencesInput = z.object({ lastCollectionDays: z.number().int().min(1).max(180).default(DEFAULT_COLLECTION_DAYS), serviceDefaults: collectionServiceDefaultsInput });
export const collectionRunInput = z.object({ days: z.number().int().min(1).max(180).default(DEFAULT_COLLECTION_DAYS), serviceDefaults: collectionServiceDefaultsInput.optional() });
export const collectionEstimateInput = z.object({ days: z.number().int().min(1).max(180).default(DEFAULT_COLLECTION_DAYS), sourceTypes: z.array(z.enum(sourceTypes)).min(1).max(sourceTypes.length).default([...sourceTypes]) });
export const companyHistoryInput = z.object({ companyName: z.string().trim().min(1).max(200), limit: z.number().int().min(1).max(100).default(50) });
export const appRouter = router({
  system: systemRouter,
  auth: router({ me: publicProcedure.query(opts => opts.ctx.user), logout: publicProcedure.mutation(({ ctx }) => { ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 }); return { success: true } as const; }) }),
  notices: router({
    list: protectedProcedure.input(z.object({ q: z.string().optional(), keywords: z.array(z.string().min(1)).max(20).optional(), sourceType: z.enum(["all", ...sourceTypes]).default("all"), agency: z.string().max(255).optional(), contact: z.string().max(255).optional(), from: z.string().optional(), to: z.string().optional(), limit: z.number().int().min(1).max(500).optional(), offset: z.number().int().min(0).optional() })).query(({ input }) => listNotices({ ...input, from: parseStartOfDay(input.from), to: parseEndOfDay(input.to) })),
    detail: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) => getNotice(input.id)),
    companyHistory: protectedProcedure.input(companyHistoryInput).query(({ input }) => getCompanyHistory(input.companyName, input.limit)),
    stats: protectedProcedure.query(() => getNoticeStats()),
  }),
  keywords: router({
    list: protectedProcedure.query(({ ctx }) => listKeywords(ctx.user.id)),
    add: protectedProcedure.input(z.object({ keyword: z.string().min(1).max(255) })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("DB unavailable"); await db.insert(monitoringKeywords).values({ userId: ctx.user.id, keyword: input.keyword.trim() }); return { success: true }; }),
    remove: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("DB unavailable"); await db.delete(monitoringKeywords).where(and(eq(monitoringKeywords.id, input.id), eq(monitoringKeywords.userId, ctx.user.id))); return { success: true }; }),
  }),
  favoriteFilters: router({
    list: protectedProcedure.query(({ ctx }) => listFavoriteFilters(ctx.user.id)),
    add: protectedProcedure.input(z.object({ name: z.string().trim().min(1).max(120), query: z.object({ q: z.string(), from: z.string(), to: z.string(), keywords: z.array(z.string()).max(20), status: z.enum(["all", "active", "closing", "closed", "unknown"]), sort: z.enum(["latest", "oldest", "deadline", "amount", "title"]) }) })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("DB unavailable"); await db.insert(favoriteFilters).values({ userId: ctx.user.id, name: input.name, sourceType: "spec", queryJson: JSON.stringify(input.query) }); return { success: true }; }),
    remove: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("DB unavailable"); await db.delete(favoriteFilters).where(and(eq(favoriteFilters.id, input.id), eq(favoriteFilters.userId, ctx.user.id))); return { success: true }; }),
  }),
  saved: router({
    list: protectedProcedure.query(({ ctx }) => listSaved(ctx.user.id)),
    toggle: protectedProcedure.input(z.object({ noticeId: z.number() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("DB unavailable"); const existing = (await db.select().from(savedNotices).where(and(eq(savedNotices.userId, ctx.user.id), eq(savedNotices.noticeId, input.noticeId))).limit(1))[0]; if (existing) await db.delete(savedNotices).where(eq(savedNotices.id, existing.id)); else await db.insert(savedNotices).values({ userId: ctx.user.id, noticeId: input.noticeId }); return { saved: !existing }; }),
    update: protectedProcedure.input(z.object({ id: z.number(), status: z.enum(["watching", "reviewing", "submitted", "closed"]).optional(), memo: z.string().max(4000).optional() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("DB unavailable"); const values = { ...(input.status ? { status: input.status } : {}), ...(input.memo !== undefined ? { memo: input.memo.trim() || null } : {}) }; await db.update(savedNotices).set(values).where(and(eq(savedNotices.id, input.id), eq(savedNotices.userId, ctx.user.id))); return { success: true }; }),
  }),
  settings: router({
    get: protectedProcedure.query(async ({ ctx }) => { const s = await getSettings(ctx.user.id); if (!s) return null; return { ...s, dataServiceKey: decryptSecret(s.dataServiceKey), telegramBotToken: decryptSecret(s.telegramBotToken), smtpPassword: decryptSecret(s.smtpPassword), emailApiKey: decryptSecret(s.emailApiKey) }; }),
    save: protectedProcedure.input(z.object({ dataServiceKey: z.string().optional(), telegramBotToken: z.string().optional(), telegramChatId: z.string().optional(), notificationEmail: z.string().email().optional().or(z.literal("")), emailEnabled: z.boolean(), telegramEnabled: z.boolean(), emailProvider: z.enum(["owner", "smtp", "resend", "sendgrid", "mailgun"]), fallbackEmailProvider: z.enum(["none", "owner", "smtp", "resend", "sendgrid", "mailgun"]), emailFrom: z.string().email().optional().or(z.literal("")), smtpHost: z.string().optional(), smtpPort: z.number().int().min(1).max(65535).optional(), smtpUsername: z.string().optional(), smtpPassword: z.string().optional(), emailApiKey: z.string().optional(), mailgunDomain: z.string().optional() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("DB unavailable"); const current = await getSettings(ctx.user.id); const stored = (value: string | undefined, existing: string | null | undefined) => value && !value.includes("••") ? encryptSecret(value) : existing; const values = { userId: ctx.user.id, dataServiceKey: stored(input.dataServiceKey, current?.dataServiceKey), telegramBotToken: stored(input.telegramBotToken, current?.telegramBotToken), telegramChatId: input.telegramChatId, notificationEmail: input.notificationEmail || null, emailEnabled: input.emailEnabled, telegramEnabled: input.telegramEnabled, emailProvider: input.emailProvider, fallbackEmailProvider: input.fallbackEmailProvider, emailFrom: input.emailFrom || null, smtpHost: input.smtpHost || null, smtpPort: input.smtpPort || null, smtpUsername: input.smtpUsername || null, smtpPassword: stored(input.smtpPassword, current?.smtpPassword), emailApiKey: stored(input.emailApiKey, current?.emailApiKey), mailgunDomain: input.mailgunDomain || null }; if (current) await db.update(userSettings).set(values).where(eq(userSettings.userId, ctx.user.id)); else await db.insert(userSettings).values(values); return { success: true }; }),
  }),
  collection: router({
    runs: protectedProcedure.query(() => getCollectionRuns()),
    dailyStats: protectedProcedure.input(collectionDailyStatsInput.optional()).query(({ input }) => getCollectionDailyStats(input?.days ?? 7)),
    preferences: router({
      get: protectedProcedure.query(({ ctx }) => getCollectionPreferences(ctx.user.id)),
      save: protectedProcedure.input(collectionPreferencesInput).mutation(({ ctx, input }) => saveCollectionPreferences(ctx.user.id, { lastCollectionDays: input.lastCollectionDays, serviceDefaults: normalizeServiceCollectionDefaults(input.serviceDefaults) })),
    }),
    estimate: protectedProcedure.input(collectionEstimateInput).query(({ input }) => getCollectionWorkEstimate(normalizeCollectionDays(input.days), input.sourceTypes)),
    runNow: protectedProcedure.input(collectionRunInput).mutation(async ({ ctx, input }) => {
      const preferences = await getCollectionPreferences(ctx.user.id);
      const serviceDefaults = input.serviceDefaults ? normalizeServiceCollectionDefaults(input.serviceDefaults) : preferences.serviceDefaults;
      await saveCollectionPreferences(ctx.user.id, { lastCollectionDays: input.days, serviceDefaults });
      const result = await collectForUser(ctx.user.id, undefined, 5, input.serviceDefaults ? serviceDefaults : input.days);
      if (result.failures.length === 5) throw new Error(result.failures.map(item => `${item.sourceType}: ${item.message}`).join("\n"));
      return result;
    }),
  }),
  analysis: router({ estimate: protectedProcedure.input(z.object({ agency: z.string().optional(), itemName: z.string().optional(), baseAmount: z.number().positive() })).query(({ input }) => estimateBid(input)) }),
});
export type AppRouter = typeof appRouter;
