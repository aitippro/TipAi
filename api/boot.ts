import { Hono } from "hono";
import type { Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { rest } from "./rest-router";


const app = new Hono<{ Bindings: HttpBindings }>();

// Security headers (CSP, X-Frame-Options, etc.)
app.use(secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    frameSrc: ["'none'"],
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

function getRateLimitKey(c: Context): string {
  const forwarded = c.req.header("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
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

// REST API routes
app.route("/api/rest", rest);

app.get("/api/health", (c) => c.json({ status: "ok", uptime: process.uptime() }));
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export { serveStaticFiles } from "./lib/vite";
export default app;

// Auto-start server in standalone mode (not dev, not Electron-managed)
if (!process.env.VITE_DEV_SERVER_URL && !process.env.TIPAI_ELECTRON) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port, hostname: '127.0.0.1' }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
