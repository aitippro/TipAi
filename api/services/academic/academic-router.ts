/**
 * P3-3: 学术合作工具 tRPC 路由
 */
import { z } from "zod";
import { createRouter, publicQuery } from "../../middleware";
import {
  generateCitations,
  generateReproducibilityReport,
  reportToMarkdown,
  getCitationFormats,
} from "./academic";

export const academicRouter = createRouter({
  /** 生成学术引用 */
  citations: publicQuery
    .input(
      z.object({
        text: z.string().min(1).max(5000),
        format: z.enum(["apa", "mla", "gb7714", "ieee", "chicago"]),
      }),
    )
    .query(({ input }) => {
      return generateCitations(input.text, input.format);
    }),

  /** 生成实验复现报告 */
  reproducibility: publicQuery
    .input(
      z.object({
        title: z.string().min(1).max(200),
        steps: z.array(
          z.object({
            step: z.number(),
            description: z.string(),
            prompt: z.string(),
            output: z.string(),
            parameters: z.record(z.union([z.string(), z.number()])).default({}),
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
  formats: publicQuery.query(() => {
    return getCitationFormats();
  }),
});
