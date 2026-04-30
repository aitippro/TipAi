/**
 * P0-2 Clarify 策略路由 — 统一导出
 */

export {
  classifyIntent,
  detectDomainV2,
  getAllDomains,
  getDomainInfo,
  type ClassificationResult,
} from "./task-classifier";

export {
  getDomainKnowledge,
  findMissingInfo,
  getKnowledgeStats,
  type DomainKnowledge,
} from "./domain-knowledge";

export {
  generateClarifyStrategy,
  evaluateQuestionQuality,
  getAllFrameworkRecommendations,
  type ClarifyStrategy,
  type FrameworkRecommendation,
} from "./strategy-router";
