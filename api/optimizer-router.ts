import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { promptOptimizations } from "@db/schema";
import { desc, eq } from "drizzle-orm";
import { optimizePrompt, evaluatePrompt } from "./lib/ai-service-v2";

export const optimizerRouter = createRouter({
  // Optimize a single prompt
  optimize: authedQuery
    .input(
      z.object({
        prompt: z.string().min(1).max(5000),
        domain: z.string().default("general"),
        strategy: z.enum(["general", "structured", "concise"]).default("general"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const result = await optimizePrompt(input.prompt, input.domain, input.strategy);

      // Save to history
      const db = getDb();
      await db.insert(promptOptimizations).values({
        userId: ctx.user.id,
        originalPrompt: input.prompt,
        optimizedPrompt: result.optimizedPrompt,
        improvements: JSON.stringify(result.improvements),
        domain: input.domain,
        model: "kimi",
      });

      return result;
    }),

  // Evaluate prompt quality
  evaluate: authedQuery
    .input(
      z.object({
        prompt: z.string().min(1),
        output: z.string().min(1),
        domain: z.string().default("general"),
      }),
    )
    .mutation(async ({ input }) => {
      return evaluatePrompt(input.prompt, input.output, input.domain);
    }),

  // Get optimization history
  history: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.select().from(promptOptimizations)
      .where(eq(promptOptimizations.userId, ctx.user.id))
      .orderBy(desc(promptOptimizations.createdAt))
      .limit(50);
  }),
});
