/**
 * P1-2: 框架知识图谱 (Framework Knowledge Graph)
 *
 * 定义 20 个框架之间的关系网络：
 *  - 相似度（基于 bestFor 重叠 + 组件结构）
 *  - 互补关系（可组合使用）
 *  - 升级路径（simple → medium → complex）
 *  - 混合推荐规则
 */

import { FRAMEWORKS } from "../../lib/ai-service-v3/catalog";

export type RelationType = "similar" | "complementary" | "upgrades-to" | "prerequisite";

export interface FrameworkRelation {
  from: string;
  to: string;
  type: RelationType;
  strength: number; // 0-1
  reason: string;
}

export interface FrameworkNode {
  key: string;
  name: string;
  complexity: "simple" | "medium" | "complex";
  category: string;
  componentCount: number;
}

export interface HybridRecommendation {
  primary: string;
  secondary: string;
  useCase: string;
  reason: string;
}

/** 框架复杂度分级 */
const COMPLEXITY_MAP: Record<string, "simple" | "medium" | "complex"> = {
  rtf: "simple",
  ape: "simple",
  tag: "simple",
  care: "simple",
  bab: "simple",
  smart: "simple",
  "co-star": "medium",
  risen: "medium",
  crispe: "medium",
  broke: "medium",
  scqa: "medium",
  prompt: "medium",
  "chain-of-thought": "complex",
  "tree-of-thoughts": "complex",
  react: "complex",
  langgpt: "complex",
  "ape-optimized": "complex",
  "self-refine": "complex",
  "few-shot": "medium",
  "meta-prompting": "complex",
};

/** 框架分类 */
const CATEGORY_MAP: Record<string, string> = {
  rtf: "minimal",
  ape: "minimal",
  tag: "minimal",
  care: "minimal",
  bab: "minimal",
  smart: "minimal",
  "co-star": "comprehensive",
  risen: "structured",
  crispe: "persona",
  broke: "goal",
  scqa: "narrative",
  prompt: "comprehensive",
  "chain-of-thought": "reasoning",
  "tree-of-thoughts": "reasoning",
  react: "agent",
  langgpt: "agent",
  "ape-optimized": "structured",
  "self-refine": "iterative",
  "few-shot": "learning",
  "meta-prompting": "meta",
};

/** 手动定义的互补关系对 */
const COMPLEMENTARY_PAIRS: Array<{ a: string; b: string; reason: string }> = [
  { a: "co-star", b: "few-shot", reason: "CO-STAR 提供完整结构，Few-Shot 提供风格示例" },
  { a: "risen", b: "chain-of-thought", reason: "RISEN 定义步骤，CoT 深化每步推理" },
  { a: "react", b: "langgpt", reason: "ReAct 提供行动循环，LangGPT 提供角色定义" },
  { a: "self-refine", b: "ape-optimized", reason: "APE+ 生成初稿，Self-Refine 迭代优化" },
  { a: "tree-of-thoughts", b: "scqa", reason: "ToT 生成多路径，SCQA 包装最优路径为故事" },
  { a: "crispe", b: "few-shot", reason: "CRISPE 定义 persona，Few-Shot 展示 persona 输出风格" },
  { a: "meta-prompting", b: "co-star", reason: "Meta-Prompting 生成提示词，CO-STAR 作为输出结构" },
  { a: "broke", b: "smart", reason: "BROKE 定义项目框架，SMART 细化可衡量目标" },
  { a: "chain-of-thought", b: "self-refine", reason: "CoT 展示推理过程，Self-Refine 优化推理质量" },
  { a: "prompt", b: "risen", reason: "PROMPT 提供全面结构，RISEN 强化步骤执行" },
];

/** 升级路径：简单框架 → 更复杂的同类框架 */
const UPGRADE_PATHS: Array<{ from: string; to: string; reason: string }> = [
  { from: "rtf", to: "co-star", reason: "RTF 太简单时，升级到 CO-STAR 获得更多控制维度" },
  { from: "ape", to: "ape-optimized", reason: "APE 基础版 → APE+ 扩展版，增加约束和验证" },
  { from: "care", to: "prompt", reason: "CARE 适合快速任务，PROMPT 提供7要素深度控制" },
  { from: "tag", to: "broke", reason: "TAG 基础目标框架 → BROKE 完整的项目目标框架" },
  { from: "smart", to: "broke", reason: "SMART 细化单目标，BROKE 覆盖项目全链路" },
  { from: "scqa", to: "tree-of-thoughts", reason: "SCQA 单一路径叙事 → ToT 多路径探索" },
  { from: "chain-of-thought", to: "tree-of-thoughts", reason: "CoT 单路径推理 → ToT 多路径并行探索" },
  { from: "co-star", to: "crispe", reason: "CO-STAR 通用框架 → CRISPE 深度角色化" },
  { from: "risen", to: "react", reason: "RISEN 步骤驱动 → ReAct 行动-观察循环" },
];

/**
 * 计算两个框架的 Jaccard 相似度（基于 bestFor）
 */
function calculateSimilarity(keyA: string, keyB: string): number {
  const fwA = FRAMEWORKS[keyA];
  const fwB = FRAMEWORKS[keyB];
  if (!fwA || !fwB) return 0;

  const setA = new Set(fwA.bestFor);
  const setB = new Set(fwB.bestFor);
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  let jaccard = intersection.size / Math.max(union.size, 1);

  // 同类加分
  if (CATEGORY_MAP[keyA] === CATEGORY_MAP[keyB]) {
    jaccard += 0.15;
  }

  // 复杂度相近加分
  if (COMPLEXITY_MAP[keyA] === COMPLEXITY_MAP[keyB]) {
    jaccard += 0.1;
  }

  return Math.min(Number(jaccard.toFixed(3)), 1);
}

/**
 * 获取所有框架节点
 */
export function getFrameworkNodes(): FrameworkNode[] {
  return Object.entries(FRAMEWORKS).map(([key, fw]) => ({
    key,
    name: fw.name,
    complexity: COMPLEXITY_MAP[key] || "medium",
    category: CATEGORY_MAP[key] || "general",
    componentCount: fw.components.length,
  }));
}

/**
 * 获取框架的所有关系
 */
export function getFrameworkRelations(): FrameworkRelation[] {
  const relations: FrameworkRelation[] = [];
  const keys = Object.keys(FRAMEWORKS);

  // 相似度关系（相似度 > 0.3）
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const sim = calculateSimilarity(keys[i], keys[j]);
      if (sim >= 0.3) {
        relations.push({
          from: keys[i],
          to: keys[j],
          type: "similar",
          strength: sim,
          reason: `领域重叠度 ${(sim * 100).toFixed(0)}%，适用场景相似`,
        });
      }
    }
  }

  // 互补关系
  for (const pair of COMPLEMENTARY_PAIRS) {
    relations.push({
      from: pair.a,
      to: pair.b,
      type: "complementary",
      strength: 0.85,
      reason: pair.reason,
    });
  }

  // 升级路径
  for (const path of UPGRADE_PATHS) {
    relations.push({
      from: path.from,
      to: path.to,
      type: "upgrades-to",
      strength: 0.9,
      reason: path.reason,
    });
  }

  return relations;
}

/**
 * 获取某个框架的相似框架列表
 */
export function getSimilarFrameworks(key: string, threshold = 0.3): { key: string; similarity: number }[] {
  const results: { key: string; similarity: number }[] = [];
  for (const other of Object.keys(FRAMEWORKS)) {
    if (other === key) continue;
    const sim = calculateSimilarity(key, other);
    if (sim >= threshold) {
      results.push({ key: other, similarity: sim });
    }
  }
  return results.sort((a, b) => b.similarity - a.similarity);
}

/**
 * 获取某个框架的互补框架列表
 */
export function getComplementaryFrameworks(key: string): { key: string; reason: string }[] {
  const results: { key: string; reason: string }[] = [];
  for (const pair of COMPLEMENTARY_PAIRS) {
    if (pair.a === key) {
      results.push({ key: pair.b, reason: pair.reason });
    } else if (pair.b === key) {
      results.push({ key: pair.a, reason: pair.reason });
    }
  }
  return results;
}

/**
 * 获取升级建议
 */
export function getUpgradePath(key: string): { to: string; reason: string } | null {
  const path = UPGRADE_PATHS.find((p) => p.from === key);
  return path ? { to: path.to, reason: path.reason } : null;
}

/**
 * 获取混合推荐（主框架 + 辅助框架）
 */
export function getHybridRecommendations(domain: string, complexity: string): HybridRecommendation[] {
  const recs: HybridRecommendation[] = [];

  // 编程 + 复杂 → RISEN + Chain-of-Thought
  if ((domain === "programming" || domain === "data-analysis") && complexity === "complex") {
    recs.push({
      primary: "risen",
      secondary: "chain-of-thought",
      useCase: "复杂算法/系统设计",
      reason: "RISEN 结构化任务分解，CoT 深化每步技术推理",
    });
  }

  // Agent → ReAct + LangGPT
  if (domain === "programming" && complexity === "complex") {
    recs.push({
      primary: "react",
      secondary: "langgpt",
      useCase: "AI Agent 开发",
      reason: "LangGPT 定义角色能力，ReAct 驱动行动-观察循环",
    });
  }

  // 内容营销 + medium → CO-STAR + Few-Shot
  if (domain === "content-marketing" && complexity !== "simple") {
    recs.push({
      primary: "co-star",
      secondary: "few-shot",
      useCase: "品牌内容标准化输出",
      reason: "CO-STAR 控制内容维度，Few-Shot 锁定品牌调性",
    });
  }

  // 创意写作 + complex → Tree-of-Thoughts + SCQA
  if (domain === "creative-writing" && complexity === "complex") {
    recs.push({
      primary: "tree-of-thoughts",
      secondary: "scqa",
      useCase: "多线叙事/交互式故事",
      reason: "ToT 探索多种情节路径，SCQA 包装最优叙事",
    });
  }

  // 产品管理 → BROKE + SMART
  if (domain === "product-management") {
    recs.push({
      primary: "broke",
      secondary: "smart",
      useCase: "产品规划与目标拆解",
      reason: "BROKE 覆盖项目全链路，SMART 确保目标可衡量",
    });
  }

  // 通用高质量输出 → Self-Refine + APE-Optimized
  if (complexity === "complex") {
    recs.push({
      primary: "ape-optimized",
      secondary: "self-refine",
      useCase: "追求极致输出质量",
      reason: "APE+ 生成高质量初稿，Self-Refine 多轮迭代打磨",
    });
  }

  // 教学 → CRISPE + Few-Shot
  if (domain === "education") {
    recs.push({
      primary: "crispe",
      secondary: "few-shot",
      useCase: "个性化教学/辅导",
      reason: "CRISPE 建立教学 persona，Few-Shot 展示互动范例",
    });
  }

  return recs;
}

/**
 * 获取框架统计信息
 */
export function getGraphStats(): {
  totalFrameworks: number;
  totalRelations: number;
  similarityRelations: number;
  complementaryRelations: number;
  upgradePaths: number;
  hybridPatterns: number;
} {
  const relations = getFrameworkRelations();
  return {
    totalFrameworks: Object.keys(FRAMEWORKS).length,
    totalRelations: relations.length,
    similarityRelations: relations.filter((r) => r.type === "similar").length,
    complementaryRelations: relations.filter((r) => r.type === "complementary").length,
    upgradePaths: relations.filter((r) => r.type === "upgrades-to").length,
    hybridPatterns: COMPLEMENTARY_PAIRS.length + UPGRADE_PATHS.length,
  };
}
