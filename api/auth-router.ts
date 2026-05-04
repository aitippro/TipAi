import * as cookie from "cookie";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { Session } from "@contracts/constants";
import { getSessionCookieOptions } from "./lib/cookies";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { signSessionToken } from "./kimi/session";
import { env } from "./lib/env";
import { findUserByUnionId, findUserByUsername, upsertUser } from "./queries/users";
import { verifyPassword } from "./lib/password";

// ── Brute Force Protection ──────────────────────────────────────────────
// Track failed login attempts per IP to prevent brute force attacks

const loginAttempts = new Map<string, { count: number; blockedUntil: number }>();

// Periodic cleanup of expired entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of loginAttempts) {
    if (now > entry.blockedUntil) {
      loginAttempts.delete(key);
    }
  }
}, 60_000).unref();

function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
}

function checkBruteForce(ip: string): void {
  const entry = loginAttempts.get(ip);
  if (!entry) return;

  if (Date.now() < entry.blockedUntil) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "登录尝试次数过多，请 15 分钟后重试",
    });
  }

  // Block expired, clean up
  loginAttempts.delete(ip);
}

function recordFailedAttempt(ip: string): void {
  const entry = loginAttempts.get(ip) || { count: 0, blockedUntil: 0 };
  entry.count++;
  if (entry.count >= 5) {
    // Block for 15 minutes after 5 failed attempts
    entry.blockedUntil = Date.now() + 15 * 60 * 1000;
  }
  loginAttempts.set(ip, entry);
}

// Demo login rate limiting (10 per IP per hour)
const demoLoginAttempts = new Map<string, { count: number; resetAt: number }>();

// Rate limit for demo login: max 10 per IP per hour
const DEMO_LOGIN_LIMIT = 10;
const DEMO_LOGIN_WINDOW = 60 * 60 * 1000; // 1 hour

function checkDemoRateLimit(ip: string): void {
  const now = Date.now();
  const entry = demoLoginAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    demoLoginAttempts.set(ip, { count: 1, resetAt: now + DEMO_LOGIN_WINDOW });
    return;
  }

  if (entry.count >= DEMO_LOGIN_LIMIT) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "演示登录频率过高，请稍后再试",
    });
  }

  entry.count++;
}

export const authRouter = createRouter({
  // Use publicQuery for me so unauthenticated users don't get 401 errors
  me: publicQuery.query((opts) => opts.ctx.user ?? null),

  logout: authedQuery.mutation(async ({ ctx }) => {
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: 0,
      }),
    );
    return { success: true };
  }),

  // Demo login for non-localhost environments (deployed sites)
  demoLogin: publicQuery.mutation(async ({ ctx }) => {
    // Rate limit: max 10 per IP per hour
    const ip = getClientIp(ctx.req);
    checkDemoRateLimit(ip);

    const demoUnionId = "demo-user-" + Math.random().toString(36).slice(2, 10);
    await upsertUser({
      unionId: demoUnionId,
      name: "演示用户",
      lastSignInAt: new Date(),
    });

    const user = await findUserByUnionId(demoUnionId);
    if (!user) {
      throw new Error("Failed to create demo user session");
    }

    const token = await signSessionToken({
      unionId: demoUnionId,
      clientId: env.appId || "demo",
    });
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, token, {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: Session.maxAgeMs / 1000,
      }),
    );
    return { success: true, user };
  }),

  // Local login (username + password) for dev/test
  localLogin: publicQuery
    .input(
      z.object({
        username: z.string().min(1).max(50),
        password: z.string().min(1).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Brute force check
      const ip = getClientIp(ctx.req);
      checkBruteForce(ip);

      const user = await findUserByUsername(input.username);
      if (!user || !user.password) {
        recordFailedAttempt(ip);
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid username or password",
        });
      }

      const valid = await verifyPassword(input.password, user.password);
      if (!valid) {
        recordFailedAttempt(ip);
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid username or password",
        });
      }

      // Successful login — clear any failed attempts
      loginAttempts.delete(ip);

      const token = await signSessionToken({
        unionId: user.unionId,
        clientId: env.appId || "local",
      });
      const opts = getSessionCookieOptions(ctx.req.headers);
      ctx.resHeaders.append(
        "set-cookie",
        cookie.serialize(Session.cookieName, token, {
          httpOnly: opts.httpOnly,
          path: opts.path,
          sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
          secure: opts.secure,
          maxAge: Session.maxAgeMs / 1000,
        }),
      );
      return { success: true, user };
    }),
});
