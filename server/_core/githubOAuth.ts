// @ts-nocheck -- Vercel's function builder injects web-standard request globals that conflict with Express 4 types.
import { randomUUID } from "crypto";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

const GITHUB_STATE_COOKIE = "github_oauth_state";
const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";

type GitHubUser = {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
};

function getRequiredEnv(name: "GITHUB_CLIENT_ID" | "GITHUB_CLIENT_SECRET") {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function getCallbackUrl(req: Request) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = req.protocol === "https" || forwardedProto?.toString().split(",").some(value => value.trim() === "https")
    ? "https"
    : "http";
  return `${protocol}://${req.get("host")}/api/auth/github/callback`;
}

function getStateCookie(req: Request) {
  return parseCookieHeader(req.headers.cookie ?? "")[GITHUB_STATE_COOKIE];
}

async function exchangeCodeForToken(code: string) {
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: getRequiredEnv("GITHUB_CLIENT_ID"),
      client_secret: getRequiredEnv("GITHUB_CLIENT_SECRET"),
      code,
    }),
  });
  const payload = await response.json() as { access_token?: string; error_description?: string };
  if (!response.ok || !payload.access_token) throw new Error(payload.error_description || "GitHub access token exchange failed");
  return payload.access_token;
}

async function getGitHubUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetch(GITHUB_USER_URL, {
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`GitHub user lookup failed (${response.status})`);
  return response.json() as Promise<GitHubUser>;
}

export function registerGitHubOAuthRoutes(app: Express) {
  app.get("/api/auth/github", (req, res) => {
    try {
      const clientId = getRequiredEnv("GITHUB_CLIENT_ID");
      const state = randomUUID();
      res.cookie(GITHUB_STATE_COOKIE, state, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: getCallbackUrl(req).startsWith("https://"),
        maxAge: 10 * 60 * 1000,
      });

      const url = new URL(GITHUB_AUTHORIZE_URL);
      url.searchParams.set("client_id", clientId);
      url.searchParams.set("redirect_uri", getCallbackUrl(req));
      url.searchParams.set("state", state);
      url.searchParams.set("scope", "read:user user:email");
      res.redirect(302, url.toString());
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/auth/github/callback", async (req, res) => {
    const code = typeof req.query.code === "string" ? req.query.code : undefined;
    const state = typeof req.query.state === "string" ? req.query.state : undefined;
    if (!code || !state || state !== getStateCookie(req)) {
      return res.status(403).json({ error: "invalid GitHub OAuth state" });
    }
    res.clearCookie(GITHUB_STATE_COOKIE, { path: "/", sameSite: "lax", secure: getCallbackUrl(req).startsWith("https://") });

    try {
      const accessToken = await exchangeCodeForToken(code);
      const githubUser = await getGitHubUser(accessToken);
      const openId = `github:${githubUser.id}`;
      await db.upsertUser({
        openId,
        name: githubUser.name || githubUser.login,
        email: githubUser.email,
        loginMethod: "github",
        lastSignedIn: new Date(),
      });
      const sessionToken = await sdk.createExternalSessionToken(openId, {
        name: githubUser.name || githubUser.login,
        provider: "github",
        expiresInMs: ONE_YEAR_MS,
      });
      res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
      return res.redirect(302, "/");
    } catch (error) {
      console.error("[GitHub OAuth] Callback failed", error);
      return res.status(500).json({ error: "GitHub OAuth callback failed" });
    }
  });
}
