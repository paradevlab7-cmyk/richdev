import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { sdk } from "./sdk";
import { ENV } from "./env";
import { collectForUser, collectSpecBackfill, sendTelegram } from "../g2b";
import { getConfiguredCollectionOwner, getUserByOpenId } from "../db";
import { buildDailyDigest, sendDigestEmail } from "../email";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  const scheduledHandler = async (req: express.Request, res: express.Response, mode: "hourly" | "daily") => {
    try {
      const cronUser = await sdk.authenticateRequest(req);
      if (!cronUser.isCron) return res.status(403).json({ error: "cron-only" });
      const owner = await getUserByOpenId(ENV.ownerOpenId) ?? await getConfiguredCollectionOwner();
      if (!owner) return res.json({ ok: true, skipped: "owner-not-found" });
      const result = await collectForUser(owner.id);
      if (mode === "daily") {
        const title = "나라장터 08:00 키워드 매칭 요약";
        const digest = await buildDailyDigest(owner.id);
        await Promise.all([sendTelegram(owner.id, `나라장터 08:00 요약\n최근 5일 수집 ${digest.totalCount}건\n키워드 매칭 ${digest.matchedCount}건`), sendDigestEmail(owner.id, title, digest.html)]);
      } else if (result.matched > 0) {
        await sendTelegram(owner.id, `나라장터 신규 키워드 매칭 공고 ${result.matched}건이 수집되었습니다.`);
      }
      return res.json({ ok: true, result });
    } catch (error) { return res.status(500).json({ error: String(error), timestamp: new Date().toISOString() }); }
  };
  app.post("/api/scheduled/g2b-hourly", (req, res) => scheduledHandler(req, res, "hourly"));
  app.post("/api/scheduled/g2b-six-hour", (req, res) => scheduledHandler(req, res, "hourly"));
  app.post("/api/scheduled/g2b-daily", (req, res) => scheduledHandler(req, res, "daily"));
  app.post("/api/scheduled/g2b-spec-backfill", async (req, res) => {
    try {
      const cronUser = await sdk.authenticateRequest(req);
      if (!cronUser.isCron) return res.status(403).json({ error: "cron-only" });
      const owner = await getUserByOpenId(ENV.ownerOpenId) ?? await getConfiguredCollectionOwner();
      if (!owner) return res.json({ ok: true, skipped: "owner-not-found" });
      const result = await collectSpecBackfill(owner.id);
      return res.json({ ok: true, result });
    } catch (error) {
      return res.status(500).json({ error: String(error), timestamp: new Date().toISOString() });
    }
  });

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
