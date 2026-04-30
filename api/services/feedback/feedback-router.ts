/**
 * P2-2: 反馈闭环系统 tRPC 路由
 */
import { z } from "zod";
import { createRouter, authedQuery } from "../../middleware";
import { submitFeedback, getFeedbackStats, getFeedbackHistory, quickRate } from "./feedback-engine";

export const feedbackRouter = createRouter({
  /** 提交多维度反馈 */
  submit: authedQuery
    .input(
      z.object({
        projectId: z.number().min(1),
        stepId: z.number().optional(),
        scores: z.object({
          clarity: z.number().min(1).max(10),
          relevance: z.number().min(1).max(10),
          completeness: z.number().min(1).max(10),
          actionability: z.number().min(1).max(10),
          overall: z.number().min(1).max(10),
        }),
        comment: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return submitFeedback({
        projectId: input.projectId,
        stepId: input.stepId,
        userId: ctx.user.id,
        scores: input.scores,
        comment: input.comment,
      });
    }),

  /** 获取反馈统计 */
  stats: authedQuery
    .input(z.object({ projectId: z.number().optional() }))
    .query(async ({ input }) => {
      return getFeedbackStats(input.projectId);
    }),

  /** 获取反馈历史 */
  history: authedQuery
    .input(
      z.object({
        projectId: z.number().optional(),
        limit: z.number().min(1).max(100).default(50),
      }),
    )
    .query(async ({ input }) => {
      return getFeedbackHistory(input.projectId, input.limit);
    }),

  /** 快速单维度评分 */
  quickRate: authedQuery
    .input(
      z.object({
        projectId: z.number().min(1),
        dimension: z.enum(["clarity", "relevance", "completeness", "actionability", "overall"]),
        score: z.number().min(1).max(10),
        comment: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return quickRate(input.projectId, ctx.user.id, input.dimension, input.score, input.comment);
    }),
});
