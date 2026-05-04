import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import { findUserByUnionId, upsertUser } from "./queries/users";
import { verifySessionToken } from "./kimi/session";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
};

/** Parse a specific cookie value from the Cookie header */
function getCookieValue(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(name + "=")) {
      return trimmed.slice(name.length + 1);
    }
  }
  return undefined;
}

/**
 * Auto-create or retrieve local user — only for Electron/desktop mode.
 * In server/browser mode, real auth via JWT cookie is required.
 */
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

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  // 1. Try JWT-based auth from session cookie
  const cookieHeader = opts.req.headers.get("cookie");
  const sid = getCookieValue(cookieHeader, "kimi_sid");

  if (sid) {
    const payload = await verifySessionToken(sid);
    if (payload && payload.unionId) {
      const user = await findUserByUnionId(payload.unionId);
      if (user) {
        return { req: opts.req, resHeaders: opts.resHeaders, user };
      }
    }
  }

  // 2. Fallback: Electron desktop mode auto-creates local user
  if (process.env.TIPAI_ELECTRON) {
    const user = await getOrCreateLocalUser();
    return { req: opts.req, resHeaders: opts.resHeaders, user };
  }

  // 3. No auth — user remains undefined (requireAuth will reject)
  return { req: opts.req, resHeaders: opts.resHeaders };
}
