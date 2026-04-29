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

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  if (!cachedUser) {
    cachedUser = await getOrCreateLocalUser();
  }
  return { req: opts.req, resHeaders: opts.resHeaders, user: cachedUser };
}
