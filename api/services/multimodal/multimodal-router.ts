/**
 * P1-1: 多模态提示词引擎 tRPC 路由
 */
import { z } from "zod";
import { createRouter, authedQuery } from "../../middleware";
import {
  generateMultimodalPromptWithAI,
  generateMultimodalPromptMock,
  getMultimodalModes,
} from "./multimodal-engine";
import { getAvailableModels } from "../promptforge/settings";

export const multimodalRouter = createRouter({
  /** 生成多模态提示词（需要登录） */
  generate: authedQuery
    .input(
      z.object({
        request: z.string().min(1).max(2000),
        mode: z.enum(["text-to-image", "image-to-text", "video-storyboard"]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { getPromptForgeSettingsRecord } = await import("../promptforge/settings");
      const settings = await getPromptForgeSettingsRecord(ctx.user.id);
      const models = getAvailableModels(settings);

      if (models.length === 0) {
        // 未配置 API Key，使用 Mock
        return generateMultimodalPromptMock(input.request, input.mode);
      }

      const { model, apiKey } = models[0];
      return generateMultimodalPromptWithAI(input.request, input.mode, model, apiKey);
    }),

  /** 获取所有支持的模式 */
  modes: authedQuery.query(() => {
    return getMultimodalModes();
  }),
});
