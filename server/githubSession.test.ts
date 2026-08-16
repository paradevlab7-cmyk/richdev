import { describe, expect, it } from "vitest";
import { sdk } from "./_core/sdk";

describe("GitHub OAuth session", () => {
  it("issues a GitHub-marked session that can be verified without Manus OAuth", async () => {
    const token = await sdk.createExternalSessionToken("github:123456", {
      name: "GitHub User",
      provider: "github",
      expiresInMs: 60_000,
    });

    await expect(sdk.verifySession(token)).resolves.toMatchObject({
      openId: "github:123456",
      name: "GitHub User",
      provider: "github",
    });
  });
});
