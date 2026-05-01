import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import { findUserByUnionId, upsertUser } from "./queries/users";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
};

/** Auto-create or retrieve local user — no login required */
async function getOrCreateLocalUser(): Promise<User> {
  const localId = "local-user";
  const existing = await findUserByUnionId(localId);
  if (existing) return existing;

  await upsertUser({
    unionId: localId,
    name: "TipAi 用户",
    role: "admin",
    lastSignInAt: new Date(),
  });

  const user = await findUserByUnionId(localId);
  if (!user) throw new Error("Failed to create local user");
  return user;
}

let cachedUser: User | null = null;
let cacheTs = 0;
const CACHE_TTL_MS = 60_000; // Refresh user cache every 60s

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  if (!cachedUser || Date.now() - cacheTs > CACHE_TTL_MS) {
    cachedUser = await getOrCreateLocalUser();
    cacheTs = Date.now();
  }
  return { req: opts.req, resHeaders: opts.resHeaders, user: cachedUser };
}
