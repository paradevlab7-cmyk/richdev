import { describe, expect, it } from "vitest";

describe("Vercel API token", () => {
  it("authenticates against the Vercel user endpoint", async () => {
    const token = process.env.VERCEL_TOKEN;
    expect(token).toBeTruthy();

    const response = await fetch("https://api.vercel.com/v2/user", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { user?: { id?: string } };
    expect(body.user?.id).toBeTruthy();
  }, 15_000);
});
