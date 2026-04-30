/**
 * P1-2: 框架知识图谱 tRPC 路由
 */
import { z } from "zod";
import { createRouter, publicQuery } from "../../middleware";
import {
  matchFrameworks,
  getFrameworkGraphData,
} from "./index";
import {
  getSimilarFrameworks,
  getComplementaryFrameworks,
  getUpgradePath,
  getHybridRecommendations,
  getGraphStats,
} from "./framework-graph";

export const frameworkRouter = createRouter({
  /** 根据用户意图匹配推荐框架 */
  match: publicQuery
    .input(z.object({ intent: z.string().min(1).max(2000) }))
    .query(({ input }) => {
      return matchFrameworks(input.intent);
    }),

  /** 获取完整知识图谱数据（用于可视化） */
  graph: publicQuery.query(() => {
    return getFrameworkGraphData();
  }),

  /** 获取图谱统计 */
  stats: publicQuery.query(() => {
    return getGraphStats();
  }),

  /** 获取某框架的相似框架 */
  similar: publicQuery
    .input(z.object({ key: z.string(), topK: z.number().min(1).max(10).optional() }))
    .query(({ input }) => {
      return getSimilarFrameworks(input.key, input.topK ?? 5);
    }),

  /** 获取某框架的互补框架 */
  complementary: publicQuery
    .input(z.object({ key: z.string() }))
    .query(({ input }) => {
      return getComplementaryFrameworks(input.key);
    }),

  /** 获取升级路径 */
  upgradePath: publicQuery
    .input(z.object({ key: z.string() }))
    .query(({ input }) => {
      return getUpgradePath(input.key);
    }),

  /** 获取组合推荐 */
  hybrid: publicQuery
    .input(z.object({ domain: z.string(), complexity: z.string() }))
    .query(({ input }) => {
      return getHybridRecommendations(input.domain, input.complexity);
    }),
});
