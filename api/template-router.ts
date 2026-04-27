import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { templates } from "@db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export const templateRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(templates)
      .where(eq(templates.isPublic, 1))
      .orderBy(desc(templates.createdAt));
  }),

  get: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [template] = await db.select().from(templates).where(eq(templates.id, input.id));
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
      const db = getDb();
      const [template] = await db.insert(templates).values({
        userId: ctx.user.id,
        title: input.title,
        description: input.description || "",
        domain: input.domain,
        content: input.content,
        tags: input.tags || "",
        isPublic: input.isPublic ? 1 : 0,
      }).returning();
      return { id: template.id, success: true };
    }),

  use: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(templates)
        .set({ useCount: sql`useCount + 1` })
        .where(eq(templates.id, input.id));
      return { success: true };
    }),

  rate: authedQuery
    .input(z.object({ id: z.number(), score: z.number().min(1).max(10) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [template] = await db.select().from(templates).where(eq(templates.id, input.id));
      if (!template) throw new TRPCError({ code: "NOT_FOUND" });
      const newCount = (template.ratingCount || 0) + 1;
      const newRating = ((template.rating || 0) * (template.ratingCount || 0) + input.score) / newCount;
      await db.update(templates)
        .set({ rating: newRating, ratingCount: newCount })
        .where(eq(templates.id, input.id));
      return { success: true, newRating, newCount };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.delete(templates)
        .where(and(eq(templates.id, input.id), eq(templates.userId, ctx.user.id)));
      return { success: true };
    }),

  myTemplates: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.select().from(templates)
      .where(eq(templates.userId, ctx.user.id))
      .orderBy(desc(templates.createdAt));
  }),
});
