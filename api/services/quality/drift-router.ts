/**
 * P2-3: Drift Detection tRPC 路由
 */
import { z } from "zod";
import { createRouter, publicQuery } from "../../middleware";
import { detectDrift, compareVersions, textToVector, cosineSimilarity } from "./drift";

export const driftRouter = createRouter({
  /** 检测漂移 */
  detect: publicQuery
    .input(
      z.object({
        versions: z.array(
          z.object({
            version: z.string(),
            text: z.string(),
          }),
        ).min(2).max(20),
        baselineIndex: z.number().min(0).default(0),
      }),
    )
    .query(({ input }) => {
      return detectDrift(input.versions, input.baselineIndex);
    }),

  /** 对比两个版本 */
  compare: publicQuery
    .input(
      z.object({
        textA: z.string(),
        textB: z.string(),
      }),
    )
    .query(({ input }) => {
      return compareVersions(input.textA, input.textB);
    }),

  /** 计算相似度 */
  similarity: publicQuery
    .input(
      z.object({
        textA: z.string(),
        textB: z.string(),
      }),
    )
    .query(({ input }) => {
      const vecA = textToVector(input.textA);
      const vecB = textToVector(input.textB);
      return {
        similarity: cosineSimilarity(vecA, vecB),
        tokensA: vecA.tokens.length,
        tokensB: vecB.tokens.length,
      };
    }),
});
