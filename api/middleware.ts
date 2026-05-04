import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { serverLogger } from "./lib/logger";

function logTrpcError(err: unknown, path: string | undefined) {
  const route = `tRPC:${path || "?"}`;
  if (err instanceof TRPCError) {
    serverLogger.error(route, `[${err.code}] ${err.message}`, err);
  } else if (err instanceof Error) {
    serverLogger.error(route, err.message, err);
  } else {
    serverLogger.error(route, String(err));
  }
}

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ error, shape, path }) {
    logTrpcError(error, path);
    return {
      ...shape,
      data: {
        ...shape.data,
        path,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
    };
  },
});

export const createRouter = t.router;
export const publicQuery = t.procedure;

const requireAuth = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  // Local-only desktop app — context always has user
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const authedQuery = t.procedure.use(requireAuth);
export const authedMutation = t.procedure.use(requireAuth);
