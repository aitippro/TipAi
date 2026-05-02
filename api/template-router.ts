/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, authedQuery } from "./middleware";

// ── Native Addon ─────────────────────────────────────────
let native: any = null;
try {
  native = require("../native");
} catch {
  // Browser fallback
}

export const templateRouter = createRouter({
  list: publicQuery.query(async () => {
    if (!native) return [];
    return native.templateListPublic();
  }),

  get: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      if (!native) throw new TRPCError({ code: "NOT_FOUND" });
      const list = native.templateListPublic();
      const template = list.find((t: any) => t.id === input.id);
      if (!template) throw new TRPCError({ code: "NOT_FOUND" });
      return template;
    }),

  create: authedQuery
    .input(
      z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        domain: z.string().default("general"),
        content: z.string().min(1),
        tags: z.string().optional(),
        isPublic: z.boolean().default(true),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!native) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const template = native.templateCreate({
        userId: ctx.user.id,
        title: input.title,
        description: input.description || "",
        domain: input.domain,
        content: input.content,
        tags: input.tags || "",
        isPublic: input.isPublic ? 1 : 0,
      });
      return { id: template.id, success: true };
    }),

  use: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      if (!native) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      native.templateUse(input.id);
      return { success: true };
    }),

  rate: authedQuery
    .input(z.object({ id: z.number(), score: z.number().min(1).max(10) }))
    .mutation(async ({ input }) => {
      if (!native) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { newRating, newCount } = native.templateRate(input.id, input.score);
      return { success: true, newRating, newCount };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!native) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      native.templateDelete(input.id, ctx.user.id);
      return { success: true };
    }),

  myTemplates: authedQuery.query(async ({ ctx }) => {
    if (!native) return [];
    return native.templateListByUser(ctx.user.id);
  }),
});
