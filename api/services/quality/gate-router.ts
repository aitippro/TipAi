/**
 * P2-1: 质量门禁系统 tRPC 路由
 */
import { z } from "zod";
import { createRouter, authedQuery } from "../../middleware";
import { runQualityGate, runQualityGateWithAI, getAvailableChecks } from "./gate";
import { getAvailableModels } from "../promptforge/settings";

export const qualityGateRouter = createRouter({
  /** 运行质量门禁检查（需要登录） */
  check: authedQuery
    .input(
      z.object({
        prompt: z.string().min(1).max(5000),
        threshold: z.number().min(0).max(100).optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { getPromptForgeSettingsRecord } = await import("../promptforge/settings");
      const settings = await getPromptForgeSettingsRecord(ctx.user.id);
      const models = getAvailableModels(settings);

      if (models.length > 0) {
        const { model, apiKey } = models[0];
        return runQualityGateWithAI(input.prompt, model, apiKey, {
          threshold: input.threshold,
        });
      }

      return runQualityGate(input.prompt, { threshold: input.threshold });
    }),

  /** 获取所有可用检查项 */
  checks: authedQuery.query(() => {
    return getAvailableChecks();
  }),
});
