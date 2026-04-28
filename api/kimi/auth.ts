import type { Context } from "hono";
import { setCookie } from "hono/cookie";
import * as jose from "jose";
import * as cookie from "cookie";
import { randomUUID, createHmac } from "node:crypto";
import { env } from "../lib/env";
import { getSessionCookieOptions } from "../lib/cookies";
import { Session } from "@contracts/constants";
import { Errors } from "@contracts/errors";
import { signSessionToken, verifySessionToken } from "./session";
import { users as kimiUsers } from "./platform";
import { findUserByUnionId, upsertUser } from "../queries/users";
import type { TokenResponse } from "./types";

function signState(redirectUri: string): { state: string; nonce: string } {
  const nonce = randomUUID();
  const payload = `${redirectUri}:${nonce}`;
  const signature = createHmac("sha256", env.appSecret).update(payload).digest("base64url");
  const state = btoa(JSON.stringify({ redirectUri, nonce, signature }));
  return { state, nonce };
}

function verifyState(state: string): { redirectUri: string } | null {
  try {
    const parsed = JSON.parse(atob(state));
    if (!parsed.redirectUri || !parsed.nonce || !parsed.signature) return null;
    const payload = `${parsed.redirectUri}:${parsed.nonce}`;
    const expectedSig = createHmac("sha256", env.appSecret).update(payload).digest("base64url");
    if (expectedSig !== parsed.signature) return null;
    return { redirectUri: parsed.redirectUri };
  } catch {
    return null;
  }
}

export function buildOAuthUrl(redirectUri: string): string {
  const { state } = signState(redirectUri);
  const url = new URL(`${env.kimiAuthUrl}/api/oauth/authorize`);
  url.searchParams.set("client_id", env.appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "profile");
  url.searchParams.set("state", state);
  return url.toString();
}

async function exchangeAuthCode(
  code: string,
  redirectUri: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: env.appId,
    redirect_uri: redirectUri,
    client_secret: env.appSecret,
  });

  const resp = await fetch(`${env.kimiAuthUrl}/api/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token exchange failed (${resp.status}): ${text}`);
  }

  return resp.json() as Promise<TokenResponse>;
}

let _jwks: ReturnType<typeof jose.createRemoteJWKSet> | null = null;

function getJwks() {
  if (!_jwks) {
    if (!env.kimiAuthUrl) {
      throw new Error("KIMI_AUTH_URL is not configured");
    }
    _jwks = jose.createRemoteJWKSet(
      new URL(`${env.kimiAuthUrl}/api/.well-known/jwks.json`),
    );
  }
  return _jwks;
}

async function verifyAccessToken(
  accessToken: string,
): Promise<{ userId: string; clientId: string }> {
  const { payload } = await jose.jwtVerify(accessToken, getJwks());
  const userId = payload.user_id as string;
  const clientId = payload.client_id as string;
  if (!userId) {
    throw new Error("user_id missing from access token");
  }
  return { userId, clientId };
}

export async function authenticateRequest(headers: Headers) {
  const cookies = cookie.parse(headers.get("cookie") || "");
  const token = cookies[Session.cookieName];
  if (!token) {
    console.warn("[auth] No session cookie found in request.");
    throw Errors.forbidden("Invalid authentication token.");
  }
  const claim = await verifySessionToken(token);
  if (!claim) {
    throw Errors.forbidden("Invalid authentication token.");
  }
  const user = await findUserByUnionId(claim.unionId);
  if (!user) {
    throw Errors.forbidden("User not found. Please re-login.");
  }
  return user;
}

export function createOAuthCallbackHandler() {
  return async (c: Context) => {
    const code = c.req.query("code");
    const state = c.req.query("state");
    const error = c.req.query("error");
    const errorDescription = c.req.query("error_description");

    if (error) {
      if (error === "access_denied") {
        return c.redirect("/", 302);
      }
      // Do not leak raw error details to the client
      console.error("[OAuth] Authorization error:", error, errorDescription);
      return c.json(
        { error: "OAuth authorization failed" },
        400,
      );
    }

    if (!code || !state) {
      return c.json({ error: "code and state are required" }, 400);
    }

    try {
      const parsed = verifyState(state);
      if (!parsed) {
        console.error("[OAuth] Invalid or tampered state parameter");
        return c.json({ error: "Invalid state" }, 400);
      }
      const redirectUri = parsed.redirectUri;

      // Validate redirect_uri against whitelist
      const allowedOrigins = [process.env.APP_URL].filter(Boolean);
      const redirectOrigin = new URL(redirectUri).origin;
      if (!allowedOrigins.includes(redirectOrigin)) {
        console.error("[OAuth] Invalid redirect_uri:", redirectOrigin);
        return c.json({ error: "Invalid redirect_uri" }, 400);
      }

      const tokenResp = await exchangeAuthCode(code, redirectUri);
      const { userId } = await verifyAccessToken(tokenResp.access_token);
      const userProfile = await kimiUsers.getProfile(tokenResp.access_token);
      if (!userProfile) {
        throw new Error("Failed to fetch user profile from Kimi Open");
      }

      await upsertUser({
        unionId: userId,
        name: userProfile.name,
        avatar: userProfile.avatar_url,
        lastSignInAt: new Date(),
      });

      const token = await signSessionToken({
        unionId: userId,
        clientId: env.appId,
      });

      const cookieOpts = getSessionCookieOptions(c.req.raw.headers);
      setCookie(c, Session.cookieName, token, {
        ...cookieOpts,
        maxAge: Session.maxAgeMs / 1000,
      });

      return c.redirect("/", 302);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      return c.json({ error: "OAuth callback failed" }, 500);
    }
  };
}

export { exchangeAuthCode, verifyAccessToken };
