import { describe, expect, it } from "vitest";

describe("VERCEL_TOKEN credential", () => {
  it("authenticates against the lightweight Vercel projects endpoint", async () => {
    const token = process.env.VERCEL_TOKEN;
    expect(token, "VERCEL_TOKEN must be configured for this credential test").toBeTruthy();

    const response = await fetch(
      "https://api.vercel.com/v9/projects?teamId=team_XCHlkpEdmQm9ZpK9t793U50B",
      { headers: { Authorization: `Bearer ${token}` } }
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { projects?: unknown[] };
    expect(Array.isArray(body.projects)).toBe(true);
  }, 15_000);
});

