import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "http";
import { createRuntimeApp } from "./runtimeApp";

describe("GitHub OAuth authorization start", () => {
  let server: Server;
  let baseUrl = "";

  beforeAll(async () => {
    expect(process.env.GITHUB_CLIENT_ID).toBeTruthy();
    expect(process.env.GITHUB_CLIENT_SECRET).toBeTruthy();
    server = createRuntimeApp("vercel").listen(0);
    await new Promise<void>(resolve => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("test server did not start");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });

  it("creates a GitHub authorization redirect with a state cookie", async () => {
    const response = await fetch(`${baseUrl}/api/auth/github`, { redirect: "manual" });
    expect(response.status).toBe(302);
    const location = response.headers.get("location");
    expect(location).toContain("https://github.com/login/oauth/authorize");
    expect(location).toContain("client_id=");
    expect(location).toContain("redirect_uri=");
    expect(response.headers.get("set-cookie")).toContain("github_oauth_state=");
  });
});
