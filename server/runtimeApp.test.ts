import { afterEach, describe, expect, it } from "vitest";
import { createRuntimeApp, getScheduledPageLimit, isAuthorizedVercelCron } from "./runtimeApp";

describe("Vercel cron authorization", () => {
  const previousSecret = process.env.CRON_SECRET;

  afterEach(() => {
    if (previousSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previousSecret;
  });

  it("accepts only the configured bearer secret", () => {
    process.env.CRON_SECRET = "cron-test-secret";

    expect(isAuthorizedVercelCron("Bearer cron-test-secret")).toBe(true);
    expect(isAuthorizedVercelCron("Bearer another-secret")).toBe(false);
    expect(isAuthorizedVercelCron(undefined)).toBe(false);
  });

  it("rejects requests when no cron secret is configured", () => {
    delete process.env.CRON_SECRET;

    expect(isAuthorizedVercelCron("Bearer cron-test-secret")).toBe(false);
  });

  it("keeps every Vercel cron mode within one page per invocation", () => {
    expect(getScheduledPageLimit("hourly")).toBe(1);
    expect(getScheduledPageLimit("daily")).toBe(1);
    expect(getScheduledPageLimit("six-hour")).toBe(1);
  });

  it("registers GitHub OAuth without exposing the retired Manus callback", () => {
    const app = createRuntimeApp("vercel") as any;
    const paths = app._router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => layer.route.path);

    expect(paths).toContain("/api/auth/github");
    expect(paths).toContain("/api/auth/github/callback");
    expect(paths).not.toContain("/api/oauth/callback");
  });
});
