import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { and, desc, eq } from "drizzle-orm";
import { getDb, getCollectionRuns, getNotice, getSettings, listKeywords, listNotices, listSaved } from "./db";
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
    get: protectedProcedure.query(async ({ ctx }) => { const s = await getSettings(ctx.user.id); return s ? { ...s, dataServiceKey: s.dataServiceKey ? "••••••••" : "", telegramBotToken: s.telegramBotToken ? "••••••••" : "" } : null; }),
    save: protectedProcedure.input(z.object({ dataServiceKey: z.string().optional(), telegramBotToken: z.string().optional(), telegramChatId: z.string().optional(), notificationEmail: z.string().email().optional().or(z.literal("")), emailEnabled: z.boolean(), telegramEnabled: z.boolean() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new Error("DB unavailable"); const current = await getSettings(ctx.user.id); const values = { userId: ctx.user.id, dataServiceKey: input.dataServiceKey && !input.dataServiceKey.includes("••") ? encryptSecret(input.dataServiceKey) : current?.dataServiceKey, telegramBotToken: input.telegramBotToken && !input.telegramBotToken.includes("••") ? encryptSecret(input.telegramBotToken) : current?.telegramBotToken, telegramChatId: input.telegramChatId, notificationEmail: input.notificationEmail || null, emailEnabled: input.emailEnabled, telegramEnabled: input.telegramEnabled }; if (current) await db.update(userSettings).set(values).where(eq(userSettings.userId, ctx.user.id)); else await db.insert(userSettings).values(values); return { success: true }; }),
  }),
  collection: router({ runs: protectedProcedure.query(() => getCollectionRuns()), runNow: protectedProcedure.mutation(async ({ ctx }) => collectForUser(ctx.user.id)) }),
});
export type AppRouter = typeof appRouter;
