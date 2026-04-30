/**
 * P1-1: 多模态提示词引擎 tRPC 路由
 */
import { z } from "zod";
import { createRouter, publicQuery } from "../../middleware";
import { generateMultimodalPrompt, getMultimodalModes } from "./multimodal-engine";

export const multimodalRouter = createRouter({
  /** 生成多模态提示词 */
  generate: publicQuery
    .input(
      z.object({
        request: z.string().min(1).max(2000),
        mode: z.enum(["text-to-image", "image-to-text", "video-storyboard"]),
      }),
    )
    .query(({ input }) => {
      return generateMultimodalPrompt(input.request, input.mode);
    }),

  /** 获取所有支持的模式 */
  modes: publicQuery.query(() => {
    return getMultimodalModes();
  }),
});
