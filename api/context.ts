import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user: { id: number; name: string; role: string };
};

/**
 * Create tRPC context — local-only desktop app.
 * Always returns a local user since there is no login/auth system.
 */
export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  return {
    req: opts.req,
    resHeaders: opts.resHeaders,
    user: { id: 1, name: "TipAi 用户", role: "admin" },
  };
}
