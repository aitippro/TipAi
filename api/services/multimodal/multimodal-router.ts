/**
 * P1-1: 多模态提示词引擎 tRPC 路由
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "../../middleware";
import {
  generateMultimodalPromptWithAI,
  getMultimodalModes,
} from "./multimodal-engine";
import { getAvailableModels } from "../promptforge/settings";
import { parseTextFile, analyzeStyle } from "./file-parser";

export const multimodalRouter = createRouter({
  /** 生成多模态提示词（需要登录） */
  generate: authedQuery
    .input(
      z.object({
        request: z.string().min(1).max(2000),
        mode: z.enum(["text-to-image", "image-to-text", "video-storyboard"]),
        imageData: z.string().optional(),
        expression: z.boolean().optional(),
        fileName: z.string().optional(),
        fileContent: z.string().optional(),
        fileData: z.string().optional(),
        styleAnalysis: z.object({
          primaryStyle: z.string(),
          colorPalette: z.array(z.string()),
          mood: z.string(),
          genre: z.string(),
          pacing: z.string(),
        }).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
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

      // Parse file data if provided (base64 encoded .docx/.pdf)
      let fileContent = input.fileContent;
      let styleAnalysis = input.styleAnalysis;
      if (input.fileData && input.fileName) {
        const buffer = Buffer.from(input.fileData, "base64");
        const parsed = await parseTextFile(buffer.buffer as ArrayBuffer, input.fileName);
        fileContent = fileContent ?? parsed.text;
        styleAnalysis = styleAnalysis ?? analyzeStyle(parsed.text);
      }

      return generateMultimodalPromptWithAI(
        input.request,
        input.mode,
        model,
        apiKey,
        input.imageData,
        input.expression,
        input.fileName,
        fileContent,
        styleAnalysis,
      );
    }),

  /** 获取所有支持的模式 */
  modes: authedQuery.query(() => {
    return getMultimodalModes();
  }),
});
