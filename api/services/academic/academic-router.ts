/**
 * P3-3: 学术合作工具 tRPC 路由
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "../../middleware";
import {
  generateCitationsWithAI,
  generateReproducibilityReport,
  reportToMarkdown,
  getCitationFormats,
} from "./academic";
import { getAvailableModels } from "../promptforge/settings";

export const academicRouter = createRouter({
  /** 生成学术引用（需要登录） */
  citations: authedQuery
    .input(
      z.object({
        text: z.string().min(1).max(5000),
        format: z.enum(["apa", "mla", "gb7714", "ieee", "chicago"]),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { getPromptForgeSettingsRecord } = await import("../promptforge/settings");
      const settings = await getPromptForgeSettingsRecord(ctx.user.id);
      const models = getAvailableModels(settings);

      if (models.length === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "未配置 AI 模型，请先在「设置 > 提示词工坊」中配置 API Key。",
        });
      }

      const { model, apiKey } = models[0];
      return generateCitationsWithAI(input.text, input.format, model, apiKey);
    }),

  /** 生成实验复现报告 */
  reproducibility: authedQuery
    .input(
      z.object({
        title: z.string().min(1).max(200),
        steps: z.array(
          z.object({
            step: z.number(),
            description: z.string(),
            prompt: z.string(),
            output: z.string(),
            parameters: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
          }),
        ),
      }),
    )
    .query(({ input }) => {
      const report = generateReproducibilityReport(input.title, input.steps);
      return {
        report,
        markdown: reportToMarkdown(report),
      };
    }),

  /** 获取支持的引用格式 */
  formats: authedQuery.query(() => {
    return getCitationFormats();
  }),
});
