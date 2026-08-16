import { afterEach, describe, expect, it } from "vitest";
import { isAuthorizedVercelCron } from "./runtimeApp";

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
});
