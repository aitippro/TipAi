import path from "path";
import { Hono } from "hono";
import type { Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { native } from "./lib/native";

// ── Initialize native database in non-Electron environments (dev/Vite/server) ──
// Electron main.cjs handles dbOpen() in production; we do it here for dev parity.
if (!process.env.TIPAI_ELECTRON && native.dbOpen) {
  try {
    const dbUrl = process.env.DATABASE_URL || "";
    const dbPath = dbUrl.startsWith("file:")
      ? dbUrl.slice(5)
      : path.join(process.env.USER_DATA_PATH || process.cwd(), "data", "tipai.db");
    const secret = process.env.API_KEY_SECRET || undefined;
    native.dbOpen(dbPath, secret);
  } catch (err) {
    // dbOpen may be a no-op in polyfill; log only real errors
    if (err instanceof Error && !err.message.includes("no-op")) {
      console.warn("[boot] dbOpen failed:", err.message);
    }
  }
}

const app = new Hono();

// Security headers (CSP, X-Frame-Options, etc.)
app.use(secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    baseUri: ["'self'"],
    scriptSrc: ["'self'"],
    // TODO: replace 'unsafe-inline' with nonce-based approach for stricter CSP
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    frameSrc: ["'none'"],
    frameAncestors: ["'none'"],
    objectSrc: ["'none'"],
  },
  crossOriginEmbedderPolicy: false, // relaxed for SPA compatibility
}));

// CORS - only allow same-origin in production
app.use("/api/*", cors({
  origin: (origin) => {
    // Allow same-origin requests always
    if (!origin) return "";
    // In development, allow localhost
    if (!env.isProduction) return origin;
    // In production, strict whitelist
    const allowedOrigins = [process.env.APP_URL].filter(Boolean);
    return allowedOrigins.includes(origin) ? origin : "";
  },
  credentials: true,
  allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowHeaders: ["Content-Type", "Authorization", "x-trpc-source"],
}));

// Body size limit - 5MB for API requests (generous but safe)
app.use("/api/*", bodyLimit({ maxSize: 5 * 1024 * 1024 }));

// Rate limiting middleware (in-memory, per IP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Periodic cleanup to prevent unbounded Map growth from stale entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

function getRateLimitKey(c: Context): string {
  // Prefer the direct connection IP; fall back to x-forwarded-for only in trusted proxy setups
  const directIp = c.req.header("x-real-ip") || c.req.header("x-client-ip");
  const forwarded = c.req.header("x-forwarded-for");
  const ip = directIp?.trim() || forwarded?.split(",")[0]?.trim() || "unknown";
  return ip;
}

function checkRateLimit(
  c: Context,
  opts: { windowMs: number; limit: number; pathPattern?: RegExp }
): Response | null {
  if (opts.pathPattern && !opts.pathPattern.test(c.req.path)) return null;

  // Desktop app: disable rate limiting — all requests are local
  if (process.env.TIPAI_ELECTRON || process.env.DISABLE_RATE_LIMIT) return null;

  const key = getRateLimitKey(c);
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    // Clean up expired entry to prevent unbounded Map growth
    if (entry && now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
    rateLimitMap.set(key, { count: 1, resetAt: now + opts.windowMs });
    return null;
  }

  if (entry.count >= opts.limit) {
    return c.json({ error: "Too many requests" }, 429);
  }

  entry.count++;
  return null;
}

// General API rate limit: 30 req/min per IP
app.use("/api/*", async (c, next) => {
  const blocked = checkRateLimit(c, { windowMs: 60_000, limit: 30 });
  if (blocked) return blocked;
  await next();
});

// Stricter rate limit for AI generation endpoints: 5 req/min per IP
app.use("/api/trpc/promptForge.generate", async (c, next) => {
  const blocked = checkRateLimit(c, { windowMs: 60_000, limit: 5 });
  if (blocked) return blocked;
  await next();
});
app.use("/api/trpc/promptForge.clarify", async (c, next) => {
  const blocked = checkRateLimit(c, { windowMs: 60_000, limit: 5 });
  if (blocked) return blocked;
  await next();
});
app.use("/api/trpc/promptForge.decompose", async (c, next) => {
  const blocked = checkRateLimit(c, { windowMs: 60_000, limit: 5 });
  if (blocked) return blocked;
  await next();
});
app.use("/api/trpc/promptForge.quickGenerate", async (c, next) => {
  const blocked = checkRateLimit(c, { windowMs: 60_000, limit: 5 });
  if (blocked) return blocked;
  await next();
});

// tRPC handler
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

// Health endpoint
app.get("/api/health", (c) => c.json({ status: "ok", uptime: process.uptime() }));

export { serveStaticFiles } from "./lib/vite";
export default app;
