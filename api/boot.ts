import path from "path";
import { Hono } from "hono";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
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
