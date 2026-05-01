/**
 * P1-2: 框架知识图谱 tRPC 路由
 */
import { z } from "zod";
import { createRouter, authedQuery } from "../../middleware";
import {
  matchFrameworks,
  matchFrameworksWithAI,
  getFrameworkGraphData,
} from "./index";
import {
  getSimilarFrameworks,
  getComplementaryFrameworks,
  getUpgradePath,
  getHybridRecommendations,
  getGraphStats,
} from "./framework-graph";
import { getAvailableModels } from "../promptforge/settings";

export const frameworkRouter = createRouter({
  /** 根据用户意图匹配推荐框架（需要登录，使用 AI 增强） */
  match: authedQuery
    .input(z.object({ intent: z.string().min(1).max(2000) }))
    .query(async ({ input, ctx }) => {
      const { getPromptForgeSettingsRecord } = await import("../promptforge/settings");
      const settings = await getPromptForgeSettingsRecord(ctx.user.id);
      const models = getAvailableModels(settings);

      if (models.length > 0) {
        const { model, apiKey } = models[0];
        return matchFrameworksWithAI(input.intent, model, apiKey);
      }

      return { ...matchFrameworks(input.intent), usingAI: false };
    }),

  /** 获取完整知识图谱数据（用于可视化） */
  graph: authedQuery.query(() => {
    return getFrameworkGraphData();
  }),

  /** 获取图谱统计 */
  stats: authedQuery.query(() => {
    return getGraphStats();
  }),

  /** 获取某框架的相似框架 */
  similar: authedQuery
    .input(z.object({ key: z.string(), topK: z.number().min(1).max(10).optional() }))
    .query(({ input }) => {
      return getSimilarFrameworks(input.key, input.topK ?? 5);
    }),

  /** 获取某框架的互补框架 */
  complementary: authedQuery
    .input(z.object({ key: z.string() }))
    .query(({ input }) => {
      return getComplementaryFrameworks(input.key);
    }),

  /** 获取升级路径 */
  upgradePath: authedQuery
    .input(z.object({ key: z.string() }))
    .query(({ input }) => {
      return getUpgradePath(input.key);
    }),

  /** 获取组合推荐 */
  hybrid: authedQuery
    .input(z.object({ domain: z.string(), complexity: z.string() }))
    .query(({ input }) => {
      return getHybridRecommendations(input.domain, input.complexity);
    }),
});
