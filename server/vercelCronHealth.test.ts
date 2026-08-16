import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "http";
import { createRuntimeApp } from "./runtimeApp";

describe("Vercel cron health endpoint", () => {
  let server: Server;
  let baseUrl = "";

  beforeAll(async () => {
    server = createRuntimeApp("vercel").listen(0);
    await new Promise<void>(resolve => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("test server did not start");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });

  it("accepts the configured Cron bearer secret and rejects a different one", async () => {
    const secret = process.env.CRON_SECRET;
    expect(secret).toBeTruthy();

    const accepted = await fetch(`${baseUrl}/api/cron/health`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    expect(accepted.status).toBe(200);
    await expect(accepted.json()).resolves.toMatchObject({ ok: true, scheduler: "vercel" });

    const rejected = await fetch(`${baseUrl}/api/cron/health`, {
      headers: { Authorization: "Bearer invalid-secret" },
    });
    expect(rejected.status).toBe(401);
  });

  it("exposes the daily collection route behind the same Cron guard", async () => {
    const response = await fetch(`${baseUrl}/api/cron/g2b-daily`);
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: "unauthorized-cron" });
  });
});
