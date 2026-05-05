import path from "path";
import { Hono } from "hono";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { native } from "./lib/native";
import { serverLogger } from "./lib/logger";

// ── Global error capture — always active ──────────────────────
process.on("uncaughtException", (err) => {
  serverLogger.fatal("uncaughtException", err.message, err);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  serverLogger.fatal("unhandledRejection", String(reason), reason instanceof Error ? reason : undefined);
});

// ── Initialize native database in non-Electron environments (dev/Vite/server) ──
// Electron main.cjs handles dbOpen() + dbMigrate() in production; we do it here for dev parity.
if (!process.env.TIPAI_ELECTRON && native.dbOpen) {
  try {
    const dbUrl = process.env.DATABASE_URL || "";
    const dbPath = dbUrl.startsWith("file:")
      ? dbUrl.slice(5)
      : path.join(process.env.USER_DATA_PATH || process.cwd(), "data", "tipai.db");
    const secret = process.env.API_KEY_SECRET || process.env.APP_SECRET || undefined;
    native.dbOpen(dbPath, secret);
    native.dbMigrate(path.join(process.cwd(), "db", "migrations"));
  } catch (err) {
    if (err instanceof Error && !err.message.includes("no-op")) {
      console.warn("[boot] dbOpen failed:", err.message);
    }
  }
}

const app = new Hono();

// tRPC handler
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

export default app;
