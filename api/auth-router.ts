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
      const user = await findUserByUsername(input.username);
      if (!user || !user.password) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid username or password",
        });
      }

      const valid = await verifyPassword(input.password, user.password);
      if (!valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid username or password",
        });
      }

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
