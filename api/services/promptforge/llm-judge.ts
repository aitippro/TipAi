/**
 * P0-1: LLM-as-Judge 评估器
 *
 * 功能：
 *  1. 对提示词进行多维度质量评分（1-10）
 *  2. 分析 top / bottom 候选的差异
 *  3. 支持批量并行评估
 *  4. 生成可解释的评分理由
 *
 * 评估维度（基于 Prompt Report §4）：
 *  - clarity: 清晰度 — 目标是否明确、结构是否清晰
 *  - specificity: 具体性 — 约束、格式、示例是否具体
 *  - completeness: 完整性 — 是否覆盖所有必要信息
 *  - actionability: 可执行性 — AI 是否能直接执行
 *  - creativity: 创造性 — 是否激发 AI 的创造性输出
 *  - overall: 综合评分
 */

import { callAI } from "../../lib/ai-service-v3/client";
import type { DecodeStrategy } from "../ai/decoding-strategies";

export interface JudgeDimensions {
  clarity: number;
  specificity: number;
  completeness: number;
  actionability: number;
  creativity: number;
  overall: number;
}

export interface JudgeResult {
  /** 评分维度 */
  dimensions: JudgeDimensions;
  /** 评分理由 */
  reasoning: string;
  /** 改进建议 */
  suggestions: string[];
  /** 与参考输出相比的质量差距（如有参考） */
  gapToReference?: number;
}

export interface JudgeCandidate {
  id: string;
  prompt: string;
  output?: string;
  domain?: string;
}

export interface JudgeBatchResult {
  results: Map<string, JudgeResult>;
  ranked: { id: string; score: number; result: JudgeResult }[];
  topCandidate: { id: string; score: number; result: JudgeResult } | null;
  bottomCandidate: { id: string; score: number; result: JudgeResult } | null;
  topBottomAnalysis: string;
  avgScore: number;
}

const JUDGE_SYSTEM_PROMPT = `你是一位严格的提示词质量评估专家（LLM-as-Judge）。
你的任务是对给定的提示词进行多维度质量评分。

评分标准（1-10，10分为完美）：
1. clarity(清晰度): 目标是否一句话能说清？结构是否一目了然？
2. specificity(具体性): 约束条件、输出格式、示例是否足够具体？
3. completeness(完整性): 是否覆盖了角色、任务、格式、约束、示例等全部要素？
4. actionability(可执行性): AI 拿到这个提示词能否直接开工，无需追问？
5. creativity(创造性): 提示词是否设计得当，能激发 AI 的高质量创造性输出？
6. overall(综合): 整体质量加权得分

严格标准：
- 7分 = 可用但有明显缺陷
- 8分 = 良好，小瑕疵
- 9分 = 优秀，接近专业水准
- 10分 = 完美，可直接作为最佳实践

返回JSON格式：
{
  "dimensions": {
    "clarity": N,
    "specificity": N,
    "completeness": N,
    "actionability": N,
    "creativity": N,
    "overall": N
  },
  "reasoning": "为什么给这个综合分（2-3句话）",
  "suggestions": ["具体改进建议1", "建议2", "建议3"]
}`;

function clampScore(n: number): number {
  return Math.min(10, Math.max(1, Math.round(n)));
}

function parseJudgeResult(raw: string): JudgeResult | null {
  try {
    const cleaned = raw.replace(/^```json\s*|\s*```$/g, "").trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    const dims = parsed.dimensions as Record<string, number> | undefined;
    if (!dims) return null;

    return {
      dimensions: {
        clarity: clampScore(dims.clarity ?? 7),
        specificity: clampScore(dims.specificity ?? 7),
        completeness: clampScore(dims.completeness ?? 7),
        actionability: clampScore(dims.actionability ?? 7),
        creativity: clampScore(dims.creativity ?? 7),
        overall: clampScore(dims.overall ?? 7),
      },
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "",
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.filter((s): s is string => typeof s === "string")
        : [],
    };
  } catch {
    return null;
  }
}

/**
 * 单条评估
 */
export async function judgePrompt(
  provider: string,
  apiKey: string,
  candidate: JudgeCandidate,
  decodeStrategy?: DecodeStrategy,
): Promise<JudgeResult> {
  const userMessage = `请评估以下提示词的质量：

--- 提示词 ---
${candidate.prompt}

--- 领域 ---
${candidate.domain || "通用"}

${candidate.output ? `--- 实际输出 ---\n${candidate.output}\n` : ""}

请严格按照评分标准打分，并给出具体理由。`;

  const result = await callAI(
    provider,
    apiKey,
    JUDGE_SYSTEM_PROMPT,
    userMessage,
    0.3,
    decodeStrategy,
  );

  if (result) {
    const parsed = parseJudgeResult(result);
    if (parsed) return parsed;
  }

  // fallback
  return {
    dimensions: { clarity: 7, specificity: 7, completeness: 7, actionability: 7, creativity: 7, overall: 7 },
    reasoning: "评估解析失败，返回默认分数",
    suggestions: ["检查提示词结构", "增加具体约束"],
  };
}

/**
 * 批量并行评估
 */
export async function judgeBatch(
  provider: string,
  apiKey: string,
  candidates: JudgeCandidate[],
  decodeStrategy?: DecodeStrategy,
): Promise<JudgeBatchResult> {
  const concurrency = 3; // 避免同时发起过多请求
  const results = new Map<string, JudgeResult>();

  for (let i = 0; i < candidates.length; i += concurrency) {
    const batch = candidates.slice(i, i + concurrency);
    const batchPromises = batch.map(async (c) => {
      const result = await judgePrompt(provider, apiKey, c, decodeStrategy);
      results.set(c.id, result);
    });
    await Promise.all(batchPromises);
  }

  // 排序
  const ranked = Array.from(results.entries())
    .map(([id, result]) => ({ id, score: result.dimensions.overall, result }))
    .sort((a, b) => b.score - a.score);

  const topCandidate = ranked[0] ?? null;
  const bottomCandidate = ranked[ranked.length - 1] ?? null;

  // 生成 top/bottom 差异分析
  const topBottomAnalysis = generateTopBottomAnalysis(topCandidate, bottomCandidate);

  const avgScore =
    ranked.length > 0
      ? Number((ranked.reduce((sum, r) => sum + r.score, 0) / ranked.length).toFixed(2))
      : 0;

  return {
    results,
    ranked,
    topCandidate,
    bottomCandidate,
    topBottomAnalysis,
    avgScore,
  };
}

function generateTopBottomAnalysis(
  top: JudgeBatchResult["topCandidate"],
  bottom: JudgeBatchResult["bottomCandidate"],
): string {
  if (!top || !bottom) return "候选数量不足，无法分析差异。";
  if (top.id === bottom.id) return "只有一个候选，无法比较。";

  const t = top.result.dimensions;
  const b = bottom.result.dimensions;

  const gaps: string[] = [];
  if (t.clarity - b.clarity >= 2) gaps.push(`清晰度差距 ${t.clarity - b.clarity} 分`);
  if (t.specificity - b.specificity >= 2) gaps.push(`具体性差距 ${t.specificity - b.specificity} 分`);
  if (t.completeness - b.completeness >= 2) gaps.push(`完整性差距 ${t.completeness - b.completeness} 分`);
  if (t.actionability - b.actionability >= 2) gaps.push(`可执行性差距 ${t.actionability - b.actionability} 分`);
  if (t.creativity - b.creativity >= 2) gaps.push(`创造性差距 ${t.creativity - b.creativity} 分`);

  const overallGap = t.overall - b.overall;

  if (gaps.length === 0) {
    return `最高分(${t.overall})与最低分(${b.overall})差距 ${overallGap} 分，各维度分布较为均匀。`;
  }

  return `最高分(${t.overall})与最低分(${b.overall})差距 ${overallGap} 分，主要差异维度：${gaps.join("、")}。`;
}

/**
 * 计算相比原始提示词的提升百分比
 */
export function calculateImprovement(originalScore: number, finalScore: number): number {
  if (originalScore <= 0) return 0;
  const improvement = ((finalScore - originalScore) / originalScore) * 100;
  return Number(improvement.toFixed(1));
}
