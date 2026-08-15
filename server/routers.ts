import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { and, desc, eq } from "drizzle-orm";
import { estimateBid, getDb, getCollectionRuns, getNotice, getSettings, listKeywords, listNotices, listSaved } from "./db";
import { collectForUser } from "./g2b";
import { encryptSecret } from "./secure";
import { monitoringKeywords, notices, savedNotices, userSettings } from "../drizzle/schema";

const sourceTypes = ["bid", "spec", "award", "contract", "standard"] as const;
export const appRouter = router({
  system: systemRouter,
  auth: router({ me: publicProcedure.query(opts => opts.ctx.user), logout: publicProcedure.mutation(({ ctx }) => { ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 }); return { success: true } as const; }) }),
  notices: router({
    list: protectedProcedure.input(z.object({ q: z.string().optional(), sourceType: z.enum(["all", ...sourceTypes]).default("all"), from: z.string().optional(), to: z.string().optional() })).query(({ input }) => listNotices({ ...input, from: input.from ? new Date(input.from) : undefined, to: input.to ? new Date(input.to) : undefined })),
    detail: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) => getNotice(input.id)),
    stats: protectedProcedure.query(async () => { const rows = await listNotices({ limit: 500 }); return { total: rows.length, bid: rows.filter(r => r.sourceType === "bid").length, spec: rows.filter(r => r.sourceType === "spec").length, award: rows.filter(r => r.sourceType === "award").length, contract: rows.filter(r => r.sourceType === "contract").length }; }),
  }),
  keywords: router({
    list: protectedProcedure.query(({ ctx }) => listKeywords(ctx.user.id)),
    add: protectedProcedure.input(z.object({ keyword: z.string().min(1).max(255) })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("DB unavailable"); await db.insert(monitoringKeywords).values({ userId: ctx.user.id, keyword: input.keyword.trim() }); return { success: true }; }),
    remove: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("DB unavailable"); await db.delete(monitoringKeywords).where(and(eq(monitoringKeywords.id, input.id), eq(monitoringKeywords.userId, ctx.user.id))); return { success: true }; }),
  }),
  saved: router({
    list: protectedProcedure.query(({ ctx }) => listSaved(ctx.user.id)),
    toggle: protectedProcedure.input(z.object({ noticeId: z.number() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("DB unavailable"); const existing = (await db.select().from(savedNotices).where(and(eq(savedNotices.userId, ctx.user.id), eq(savedNotices.noticeId, input.noticeId))).limit(1))[0]; if (existing) await db.delete(savedNotices).where(eq(savedNotices.id, existing.id)); else await db.insert(savedNotices).values({ userId: ctx.user.id, noticeId: input.noticeId }); return { saved: !existing }; }),
  }),
  settings: router({
    get: protectedProcedure.query(async ({ ctx }) => { const s = await getSettings(ctx.user.id); return s ? { ...s, dataServiceKey: s.dataServiceKey ? "••••••••" : "", telegramBotToken: s.telegramBotToken ? "••••••••" : "", smtpPassword: s.smtpPassword ? "••••••••" : "", emailApiKey: s.emailApiKey ? "••••••••" : "" } : null; }),
    save: protectedProcedure.input(z.object({ dataServiceKey: z.string().optional(), telegramBotToken: z.string().optional(), telegramChatId: z.string().optional(), notificationEmail: z.string().email().optional().or(z.literal("")), emailEnabled: z.boolean(), telegramEnabled: z.boolean(), emailProvider: z.enum(["owner", "smtp", "resend", "sendgrid", "mailgun"]), fallbackEmailProvider: z.enum(["none", "owner", "smtp", "resend", "sendgrid", "mailgun"]), emailFrom: z.string().email().optional().or(z.literal("")), smtpHost: z.string().optional(), smtpPort: z.number().int().min(1).max(65535).optional(), smtpUsername: z.string().optional(), smtpPassword: z.string().optional(), emailApiKey: z.string().optional(), mailgunDomain: z.string().optional() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("DB unavailable"); const current = await getSettings(ctx.user.id); const stored = (value: string | undefined, existing: string | null | undefined) => value && !value.includes("••") ? encryptSecret(value) : existing; const values = { userId: ctx.user.id, dataServiceKey: stored(input.dataServiceKey, current?.dataServiceKey), telegramBotToken: stored(input.telegramBotToken, current?.telegramBotToken), telegramChatId: input.telegramChatId, notificationEmail: input.notificationEmail || null, emailEnabled: input.emailEnabled, telegramEnabled: input.telegramEnabled, emailProvider: input.emailProvider, fallbackEmailProvider: input.fallbackEmailProvider, emailFrom: input.emailFrom || null, smtpHost: input.smtpHost || null, smtpPort: input.smtpPort || null, smtpUsername: input.smtpUsername || null, smtpPassword: stored(input.smtpPassword, current?.smtpPassword), emailApiKey: stored(input.emailApiKey, current?.emailApiKey), mailgunDomain: input.mailgunDomain || null }; if (current) await db.update(userSettings).set(values).where(eq(userSettings.userId, ctx.user.id)); else await db.insert(userSettings).values(values); return { success: true }; }),
  }),
  collection: router({ runs: protectedProcedure.query(() => getCollectionRuns()), runNow: protectedProcedure.mutation(async ({ ctx }) => { const result = await collectForUser(ctx.user.id); if (result.failures.length === 5) throw new Error(result.failures.map(item => `${item.sourceType}: ${item.message}`).join("\n")); return result; }) }),
  analysis: router({ estimate: protectedProcedure.input(z.object({ agency: z.string().optional(), itemName: z.string().optional(), baseAmount: z.number().positive() })).query(({ input }) => estimateBid(input)) }),
});
export type AppRouter = typeof appRouter;
