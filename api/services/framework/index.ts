/**
 * P1-2: 智能框架匹配引擎 — 统一导出
 */

export {
  getFrameworkNodes,
  getFrameworkRelations,
  getSimilarFrameworks,
  getComplementaryFrameworks,
  getUpgradePath,
  getHybridRecommendations,
  getGraphStats,
  getFrameworkGraphData,
  type FrameworkRelation,
  type FrameworkNode,
  type HybridRecommendation,
  type RelationType,
} from "./framework-graph";

export {
  matchFrameworks,
  matchFrameworksWithAI,
  type EnhancedFrameworkRecommendation,
  type CombinationRecommendation,
  type MatcherResult,
} from "./framework-matcher";

export { frameworkRouter } from "./framework-router";
