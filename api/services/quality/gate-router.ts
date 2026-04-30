/**
 * P2-1: 质量门禁系统 tRPC 路由
 */
import { z } from "zod";
import { createRouter, publicQuery } from "../../middleware";
import { runQualityGate, getAvailableChecks } from "./gate";

export const qualityGateRouter = createRouter({
  /** 运行质量门禁检查 */
  check: publicQuery
    .input(
      z.object({
        prompt: z.string().min(1).max(5000),
        threshold: z.number().min(0).max(100).optional(),
      }),
    )
    .query(({ input }) => {
      return runQualityGate(input.prompt, {
        threshold: input.threshold,
      });
    }),

  /** 获取所有可用检查项 */
  checks: publicQuery.query(() => {
    return getAvailableChecks();
  }),
});
