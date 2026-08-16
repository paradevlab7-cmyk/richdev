import { describe, expect, it } from "vitest";

const clientId = process.env.GITHUB_CLIENT_ID ?? "";
const clientSecret = process.env.GITHUB_CLIENT_SECRET ?? "";

describe("GitHub OAuth credentials", () => {
  it("is accepted by GitHub OAuth token endpoint", async () => {
    expect(clientId).toMatch(/^Ov23/);
    expect(clientSecret.length).toBeGreaterThanOrEqual(20);

    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: "manus-credential-validation-only",
      }),
    });
    const payload = (await response.json()) as { error?: string; error_description?: string };

    expect(response.ok).toBe(true);
    expect(payload.error).toBe("bad_verification_code");
    expect(payload.error_description).toMatch(/incorrect|expired|not found|bad verification/i);
  }, 15_000);
});
