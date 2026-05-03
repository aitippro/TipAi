/**
 * P1-2: 框架匹配引擎 (Framework Matcher)
 *
 * 基于规则启发式的框架推荐系统：
 *  - 单框架推荐（基于领域 + 复杂度 + 任务类型的关键词匹配打分）
 *  - 组合推荐（基于硬编码互补关系对）
 *  - 升级建议（基于硬编码升级路径）
 *  - 相似替代（基于 Jaccard 相似度）
 *
 * ⚠️ 本模块不含神经网络或 LLM 调用。matchFrameworksWithAI() 在规则匹配结果之上
 *    调用 LLM 生成自然语言推荐理由，是唯一的 AI 增强路径。
 */

import { classifyIntent, type ClassificationResult } from "../clarify/task-classifier";
import {
  getFrameworkRelations,
  getSimilarFrameworks,
  getComplementaryFrameworks,
  getUpgradePath,
  getHybridRecommendations,
} from "./framework-graph";
import { FRAMEWORKS, getFrameworkByKey } from "../../lib/ai-service-v3/catalog";
import { callAI } from "../../lib/ai-service-v3/client";

export interface EnhancedFrameworkRecommendation {
  /** 推荐框架 key */
  framework: string;
  /** 框架名称 */
  frameworkName: string;
  /** 匹配分数 0-100 */
  score: number;
  /** 推荐理由 */
  reason: string;
  /** 匹配维度 */
  matchDimensions: string[];
  /** 相似备选 */
  alternatives: { key: string; name: string; similarity: number }[];
  /** 可升级方向 */
  upgradeTo?: { key: string; name: string; reason: string };
  /** 互补框架（可组合使用） */
  complements: { key: string; name: string; reason: string }[];
}

export interface CombinationRecommendation {
  /** 主框架 */
  primary: { key: string; name: string };
  /** 辅助框架 */
  secondary: { key: string; name: string };
  /** 适用场景 */
  useCase: string;
  /** 组合理由 */
  reason: string;
  /** 预期效果 */
  expectedBenefit: string;
}

export interface MatcherResult {
  /** 用户意图分类 */
  classification: ClassificationResult;
  /** 单框架推荐（排序） */
  recommendations: EnhancedFrameworkRecommendation[];
  /** 组合推荐 */
  combinations: CombinationRecommendation[];
  /** 知识图谱统计 */
  graphStats: {
    totalFrameworks: number;
    totalRelations: number;
  };
}

/**
 * 主入口：根据用户意图生成增强版框架推荐
 */
export function matchFrameworks(userIntent: string): MatcherResult {
  const classification = classifyIntent(userIntent);
  const recommendations = generateRecommendations(classification);
  const combinations = generateCombinations(classification);
  const relations = getFrameworkRelations();

  return {
    classification,
    recommendations,
    combinations,
    graphStats: {
      totalFrameworks: Object.keys(FRAMEWORKS).length,
      totalRelations: relations.length,
    },
  };
}

/**
 * AI 增强：使用 LLM 生成更自然的推荐理由
 */
export async function matchFrameworksWithAI(
  userIntent: string,
  model: string,
  apiKey: string,
): Promise<MatcherResult & { usingAI: boolean }> {
  const base = matchFrameworks(userIntent);

  const prompt = `你是一位提示词框架推荐专家。请根据用户的需求，为以下框架推荐生成自然、专业的推荐理由。

【用户需求】
${userIntent}

【推荐框架】
${base.recommendations.slice(0, 3).map((r) => `- ${r.frameworkName}（${r.framework}）：当前匹配度 ${r.score} 分，匹配维度：${r.matchDimensions.join("、")}`).join("\n")}

请为每个框架生成一段 30-50 字的自然语言推荐理由，直接输出（不要编号）：
推荐理由1
推荐理由2
推荐理由3`;

  const response = await callAI(model, apiKey, "你是一位提示词框架推荐专家。", prompt, 0.6);

  if (response) {
    const reasons = response
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 10 && !l.match(/^推荐|^框架|^-/));

    base.recommendations = base.recommendations.map((r, i) => ({
      ...r,
      reason: reasons[i] || r.reason,
    }));
  }

  return { ...base, usingAI: true };
}

/**
 * 生成单框架推荐列表
 */
function generateRecommendations(
  classification: ClassificationResult,
): EnhancedFrameworkRecommendation[] {
  const { domain, subDomain, taskType, confidence } = classification;
  const scores = new Map<string, number>();
  const reasons = new Map<string, string[]>();
  const dimensions = new Map<string, string[]>();

  for (const [key, framework] of Object.entries(FRAMEWORKS)) {
    let score = 30; // 基础分
    const reasonParts: string[] = [];
    const dims: string[] = [];

    // 1. 领域匹配
    const domainScore = calculateDomainMatch(key, framework.bestFor, domain, subDomain);
    if (domainScore > 0) {
      score += domainScore;
      reasonParts.push(`适合${domain}领域`);
      dims.push("领域匹配");
    }

    // 2. 任务类型匹配
    const taskScore = calculateTaskTypeMatch(key, taskType);
    if (taskScore > 0) {
      score += taskScore;
      reasonParts.push(`匹配${taskType}任务类型`);
      dims.push("任务类型");
    }

    // 3. 复杂度匹配（基于分类置信度推断复杂度）
    const inferredComplexity = inferComplexity(confidence, classification.matchedKeywords.length);
    const complexityScore = calculateComplexityMatch(key, inferredComplexity);
    if (complexityScore > 0) {
      score += complexityScore;
      reasonParts.push(`复杂度适配（${inferredComplexity}）`);
      dims.push("复杂度");
    }

    // 4. 关键词匹配（框架 bestFor 与 matchedKeywords 的匹配）
    const keywordScore = calculateKeywordMatch(framework.bestFor, classification.matchedKeywords);
    if (keywordScore > 0) {
      score += keywordScore;
      reasonParts.push("关键词高度匹配");
      dims.push("关键词");
    }

    scores.set(key, Math.min(score, 100));
    reasons.set(key, reasonParts);
    dimensions.set(key, dims);
  }

  // 排序并构建结果
  const sortedKeys = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k]) => k);

  return sortedKeys.map((key) => {
    const fw = FRAMEWORKS[key];
    const score = scores.get(key) || 0;
    const similar = getSimilarFrameworks(key, 0.25).slice(0, 3);
    const complements = getComplementaryFrameworks(key).slice(0, 2);
    const upgrade = getUpgradePath(key);

    return {
      framework: key,
      frameworkName: fw.name,
      score,
      reason: buildReason(key, score, reasons.get(key) || []),
      matchDimensions: dimensions.get(key) || [],
      alternatives: similar.map((s) => ({
        key: s.key,
        name: FRAMEWORKS[s.key]?.name || s.key,
        similarity: Math.round(s.similarity * 100),
      })),
      upgradeTo: upgrade
        ? {
            key: upgrade.to,
            name: FRAMEWORKS[upgrade.to]?.name || upgrade.to,
            reason: upgrade.reason,
          }
        : undefined,
      complements: complements.map((c) => ({
        key: c.key,
        name: FRAMEWORKS[c.key]?.name || c.key,
        reason: c.reason,
      })),
    };
  });
}

/**
 * 生成组合推荐
 */
function generateCombinations(classification: ClassificationResult): CombinationRecommendation[] {
  const inferredComplexity = inferComplexity(
    classification.confidence,
    classification.matchedKeywords.length,
  );
  const hybrids = getHybridRecommendations(classification.domain, inferredComplexity);

  return hybrids.map((h) => ({
    primary: {
      key: h.primary,
      name: FRAMEWORKS[h.primary]?.name || h.primary,
    },
    secondary: {
      key: h.secondary,
      name: FRAMEWORKS[h.secondary]?.name || h.secondary,
    },
    useCase: h.useCase,
    reason: h.reason,
    expectedBenefit: "组合使用可覆盖更多控制维度，提升输出质量和一致性",
  }));
}

/** 计算领域匹配分数 */
function calculateDomainMatch(
  _fwKey: string,
  bestFor: string[],
  domain: string,
  subDomain: string,
): number {
  let score = 0;
  if (bestFor.includes(domain)) score += 25;
  if (bestFor.includes(subDomain)) score += 15;
  if (bestFor.includes(domain.split("-")[0])) score += 10;
  return score;
}

/** 任务类型匹配分数 */
function calculateTaskTypeMatch(fwKey: string, taskType: string): number {
  const taskToFramework: Record<string, string[]> = {
    "copy-generation": ["co-star", "care", "bab", "scqa"],
    "content-plan": ["broke", "smart", "prompt"],
    "ad-creation": ["co-star", "bab", "care"],
    "brand-strategy": ["tree-of-thoughts", "scqa", "broke"],
    "code-generation": ["ape", "ape-optimized", "rtf", "risen"],
    "code-review": ["self-refine", "chain-of-thought", "ape-optimized"],
    "architecture-design": ["tree-of-thoughts", "risen", "chain-of-thought"],
    debugging: ["chain-of-thought", "react", "self-refine"],
    testing: ["ape-optimized", "risen", "prompt"],
    "lesson-plan": ["crispe", "risen", "prompt"],
    "material-creation": ["co-star", "few-shot", "prompt"],
    "assessment-design": ["smart", "prompt", "risen"],
    "course-outline": ["broke", "tree-of-thoughts", "prompt"],
    "report-generation": ["risen", "co-star", "chain-of-thought"],
    "dashboard-design": ["risen", "prompt", "smart"],
    "model-building": ["chain-of-thought", "tree-of-thoughts", "ape-optimized"],
    "insight-extraction": ["chain-of-thought", "tree-of-thoughts", "scqa"],
    "contract-draft": ["care", "prompt", "risen"],
    "compliance-review": ["chain-of-thought", "risen", "care"],
    "ip-protection": ["risen", "prompt", "care"],
    "legal-advice": ["chain-of-thought", "tree-of-thoughts", "crispe"],
    "prompt-engineering": ["meta-prompting", "few-shot", "self-refine"],
    "graphic-design": ["co-star", "rtf", "few-shot"],
    "photo-editing": ["ape", "rtf", "self-refine"],
    "concept-art": ["tree-of-thoughts", "co-star", "few-shot"],
    "script-writing": ["scqa", "co-star", "tree-of-thoughts"],
    "video-editing": ["risen", "ape", "prompt"],
    "production-plan": ["broke", "smart", "risen"],
    "story-outline": ["tree-of-thoughts", "scqa", "co-star"],
    "character-design": ["persona-plus", "crispe", "few-shot"],
    "world-building": ["tree-of-thoughts", "prompt", "co-star"],
    "text-polish": ["self-refine", "ape-optimized", "care"],
    "prd-writing": ["risen", "prompt", "broke"],
    "security-audit": ["security-audit", "ape-optimized", "chain-of-thought"],
    "translation": ["multi-translate", "self-refine", "few-shot"],
    "localization": ["multi-translate", "co-star", "self-refine"],
    "experiment-design": ["scientific-experiment", "chain-of-thought", "risen"],
    "hypothesis-testing": ["scientific-experiment", "tree-of-thoughts", "chain-of-thought"],
    "medical-diagnosis": ["medical-diagnosis", "chain-of-thought", "tree-of-thoughts"],
    "clinical-decision": ["medical-diagnosis", "scientific-experiment", "chain-of-thought"],
    "legal-research": ["legal-analysis", "chain-of-thought", "scqa"],
    "contract-review": ["legal-analysis", "ape-optimized", "care"],
    "regulatory-compliance": ["legal-analysis", "security-audit", "risen"],
    "roleplay": ["persona-plus", "crispe", "few-shot"],
    "comparison": ["compare-contrast", "tree-of-thoughts", "smart"],
    "product-evaluation": ["compare-contrast", "chain-of-thought", "tree-of-thoughts"],
    "ideation": ["brainstorming", "tree-of-thoughts", "meta-prompting"],
    "creative-thinking": ["brainstorming", "tree-of-thoughts", "co-star"],
    "crisis-management": ["crisis-response", "risen", "scqa"],
    "incident-handling": ["crisis-response", "chain-of-thought", "risen"],
    "data-presentation": ["data-storytelling", "co-star", "prompt"],
    "insight-communication": ["data-storytelling", "scqa", "chain-of-thought"],
    "competitive-analysis": ["chain-of-thought", "tree-of-thoughts", "scqa"],
    "roadmap-planning": ["broke", "smart", "tree-of-thoughts"],
    "user-research": ["crispe", "chain-of-thought", "risen"],
    "paper-writing": ["risen", "prompt", "chain-of-thought"],
    "lit-review": ["chain-of-thought", "risen", "prompt"],
    "research-design": ["tree-of-thoughts", "risen", "chain-of-thought"],
    "data-analysis": ["chain-of-thought", "risen", "ape-optimized"],
    "response-drafting": ["crispe", "care", "co-star"],
    "faq-generation": ["few-shot", "prompt", "care"],
    "complaint-handling": ["crispe", "scqa", "care"],
    "service-sop": ["risen", "prompt", "smart"],
  };

  const matched = taskToFramework[taskType];
  if (!matched) return 0;
  if (matched[0] === fwKey) return 20;
  if (matched[1] === fwKey) return 12;
  if (matched[2] === fwKey) return 8;
  return 0;
}

/** 根据置信度和关键词数量推断复杂度 */
function inferComplexity(confidence: number, keywordCount: number): "simple" | "medium" | "complex" {
  if (confidence < 0.5 || keywordCount <= 2) return "simple";
  if (confidence >= 0.8 && keywordCount >= 5) return "complex";
  return "medium";
}

/** 计算复杂度匹配分数 */
function calculateComplexityMatch(
  fwKey: string,
  complexity: "simple" | "medium" | "complex",
): number {
  const fwComplexityMap: Record<string, "simple" | "medium" | "complex"> = {
    rtf: "simple", ape: "simple", tag: "simple", care: "simple",
    bab: "simple", smart: "simple",
    "co-star": "medium", risen: "medium", crispe: "medium",
    broke: "medium", scqa: "medium", prompt: "medium", "few-shot": "medium",
    "chain-of-thought": "complex", "tree-of-thoughts": "complex",
    react: "complex", langgpt: "complex", "ape-optimized": "complex",
    "self-refine": "complex", "meta-prompting": "complex",
    "security-audit": "complex", "scientific-experiment": "complex",
    "medical-diagnosis": "complex", "legal-analysis": "complex",
    "multi-translate": "medium", "persona-plus": "medium",
    "crisis-response": "medium", "data-storytelling": "medium",
    "compare-contrast": "simple", "brainstorming": "simple",
  };

  const fwComplexity = fwComplexityMap[fwKey];
  if (fwComplexity === complexity) return 15;
  // simple 任务也可以用 medium 框架，但得分低一些
  if (complexity === "simple" && fwComplexity === "medium") return 5;
  // complex 任务不推荐 simple 框架
  if (complexity === "complex" && fwComplexity === "simple") return -10;
  return 0;
}

/** 关键词匹配 */
function calculateKeywordMatch(bestFor: string[], matchedKeywords: string[]): number {
  let count = 0;
  for (const kw of matchedKeywords) {
    const kwLower = kw.toLowerCase();
    for (const bf of bestFor) {
      if (bf.toLowerCase().includes(kwLower) || kwLower.includes(bf.toLowerCase())) {
        count++;
      }
    }
  }
  return Math.min(count * 5, 20);
}

/** 构建推荐理由 */
function buildReason(key: string, score: number, parts: string[]): string {
  const fw = getFrameworkByKey(key);
  if (!fw) return "";

  const base = `${fw.name}框架`;
  if (parts.length === 0) {
    return `${base}，通用性较强，匹配度 ${score} 分`;
  }

  const strength = score >= 80 ? "强烈推荐" : score >= 60 ? "推荐" : "备选";
  return `${base} — ${strength}：${parts.join("、")}，匹配度 ${score} 分`;
}
