import express, { type Express, type Request, type Response } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./_core/oauth";
import { registerGitHubOAuthRoutes } from "./_core/githubOAuth";
import { registerStorageProxy } from "./_core/storageProxy";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";
import { collectForUser, collectSpecBackfill, formatCollectionFailures, sendTelegram } from "./g2b";
import { getConfiguredCollectionOwner, getUserByOpenId } from "./db";
import { buildDailyDigest, sendDigestEmail } from "./email";

export type ScheduledMode = "hourly" | "daily" | "six-hour";
export type SchedulerRuntime = "manus" | "vercel";

async function getCollectionOwner() {
  return await getUserByOpenId(ENV.ownerOpenId) ?? await getConfiguredCollectionOwner();
}

export async function runScheduledCollection(mode: ScheduledMode) {
  const owner = await getCollectionOwner();
  if (!owner) return { ok: true as const, skipped: "owner-not-found" as const };

  const result = await collectForUser(owner.id, undefined, mode === "six-hour" ? 1 : 5);
  if (mode === "daily") {
    const title = "나라장터 08:00 키워드 매칭 요약";
    const digest = await buildDailyDigest(owner.id);
    await Promise.all([
      sendTelegram(owner.id, `나라장터 08:00 요약\n최근 5일 수집 ${digest.totalCount}건\n키워드 매칭 ${digest.matchedCount}건`),
      sendDigestEmail(owner.id, title, digest.html),
    ]);
  } else if (result.matched > 0) {
    await sendTelegram(owner.id, `나라장터 신규 키워드 매칭 공고 ${result.matched}건이 수집되었습니다.`);
  }
  return { ok: true as const, result };
}

export async function runSpecBackfill() {
  const owner = await getCollectionOwner();
  if (!owner) return { ok: true as const, skipped: "owner-not-found" as const };
  const result = await collectSpecBackfill(owner.id);
  const failures = "failures" in result ? result.failures : [];
  if (failures.length) throw new Error(formatCollectionFailures(failures));
  return { ok: true as const, result };
}

function sendScheduleError(res: Response, error: unknown) {
  return res.status(500).json({ error: String(error), timestamp: new Date().toISOString() });
}

function registerManusSchedules(app: Express) {
  const scheduledHandler = async (req: Request, res: Response, mode: ScheduledMode) => {
    try {
      const cronUser = await sdk.authenticateRequest(req);
      if (!cronUser.isCron) return res.status(403).json({ error: "cron-only" });
      return res.json(await runScheduledCollection(mode));
    } catch (error) {
      return sendScheduleError(res, error);
    }
  };

  app.post("/api/scheduled/g2b-hourly", (req, res) => scheduledHandler(req, res, "hourly"));
  app.post("/api/scheduled/g2b-six-hour", (req, res) => scheduledHandler(req, res, "six-hour"));
  app.post("/api/scheduled/g2b-daily", (req, res) => scheduledHandler(req, res, "daily"));
  app.post("/api/scheduled/g2b-spec-backfill", async (req, res) => {
    try {
      const cronUser = await sdk.authenticateRequest(req);
      if (!cronUser.isCron) return res.status(403).json({ error: "cron-only" });
      return res.json(await runSpecBackfill());
    } catch (error) {
      return sendScheduleError(res, error);
    }
  });
}

export function isAuthorizedVercelCron(header: string | undefined, cronSecret = process.env.CRON_SECRET) {
  return Boolean(cronSecret && header === `Bearer ${cronSecret}`);
}

function registerVercelSchedules(app: Express) {
  const authorize = (req: Request, res: Response) => {
    if (isAuthorizedVercelCron(req.headers.authorization)) return true;
    res.status(401).json({ error: "unauthorized-cron" });
    return false;
  };
  app.get("/api/cron/health", (req, res) => {
    if (!authorize(req, res)) return;
    return res.json({ ok: true, scheduler: "vercel" });
  });
  const schedule = (mode: ScheduledMode) => async (req: Request, res: Response) => {
    if (!authorize(req, res)) return;
    try {
      return res.json(await runScheduledCollection(mode));
    } catch (error) {
      return sendScheduleError(res, error);
    }
  };

  app.get("/api/cron/g2b-hourly", schedule("hourly"));
  app.get("/api/cron/g2b-six-hour", schedule("six-hour"));
  app.get("/api/cron/g2b-daily", schedule("daily"));
  app.get("/api/cron/g2b-spec-backfill", async (req, res) => {
    if (!authorize(req, res)) return;
    try {
      return res.json(await runSpecBackfill());
    } catch (error) {
      return sendScheduleError(res, error);
    }
  });
}

export function createRuntimeApp(schedulerRuntime: SchedulerRuntime): Express {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerGitHubOAuthRoutes(app);
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  app.get("/api/health", (_req, res) => res.json({ ok: true, runtime: schedulerRuntime }));

  if (schedulerRuntime === "vercel") registerVercelSchedules(app);
  else registerManusSchedules(app);

  return app;
}
