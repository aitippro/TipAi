/**
 * P2-2: 反馈闭环系统 (Feedback Loop)
 *
 * 基于 evaluations 表构建数据驱动的反馈闭环：
 *  - 5 维度评分收集（clarity/relevance/completeness/actionability/overall）
 *  - 统计分析和趋势检测
 *  - 进化建议生成
 */

import { getDb } from "../../queries/connection";
import { evaluations } from "@db/schema";
import { desc, eq, avg, count, sql } from "drizzle-orm";

export type FeedbackDimension = "clarity" | "relevance" | "completeness" | "actionability" | "overall";

export interface FeedbackSubmission {
  projectId: number;
  stepId?: number;
  userId: number;
  scores: Record<FeedbackDimension, number>;
  comment?: string;
}

export interface FeedbackStats {
  totalCount: number;
  avgScores: Record<FeedbackDimension, number | null>;
  trends: Record<FeedbackDimension, "up" | "down" | "stable">;
  topIssues: { dimension: FeedbackDimension; avgScore: number; suggestion: string }[];
  evolutionSuggestion: string;
}

export interface FeedbackHistoryItem {
  id: number;
  projectId: number;
  stepId: number | null;
  dimension: FeedbackDimension;
  score: number;
  feedback: string | null;
  createdAt: Date;
}

const DIMENSION_LABELS: Record<FeedbackDimension, string> = {
  clarity: "清晰度",
  relevance: "相关性",
  completeness: "完整性",
  actionability: "可操作性",
  overall: "总体",
};

const DIMENSION_SUGGESTIONS: Record<FeedbackDimension, string[]> = {
  clarity: [
    "增加更明确的动作指令动词",
    "删除模糊表述，使用具体术语",
    "将长句拆分为短句",
  ],
  relevance: [
    "确保提示词与任务目标高度相关",
    "删除与核心任务无关的内容",
    "强化关键信息的关联性",
  ],
  completeness: [
    "补充角色定义和背景信息",
    "明确输出格式要求",
    "添加约束条件和边界说明",
  ],
  actionability: [
    "增加可执行的具体步骤",
    "提供示例或模板",
    "明确期望的交付物",
  ],
  overall: [
    "综合优化所有维度",
    "参考质量门禁检查报告",
    "使用 OPRO 自动优化引擎",
  ],
};

// ============================================================================
// 提交反馈
// ============================================================================

export async function submitFeedback(input: FeedbackSubmission): Promise<number[]> {
  const db = getDb();
  const ids: number[] = [];
  const now = new Date();

  for (const [dimension, score] of Object.entries(input.scores)) {
    const result = await db.insert(evaluations).values({
      projectId: input.projectId,
      stepId: input.stepId ?? null,
      userId: input.userId,
      dimension: dimension as FeedbackDimension,
      score: Math.max(1, Math.min(10, score)),
      feedback: input.comment ?? null,
      createdAt: now,
    }).returning({ id: evaluations.id });
    ids.push(result[0].id);
  }

  return ids;
}

// ============================================================================
// 统计分析
// ============================================================================

export async function getFeedbackStats(projectId?: number): Promise<FeedbackStats> {
  const db = getDb();

  const baseQuery = projectId
    ? db.select().from(evaluations).where(eq(evaluations.projectId, projectId))
    : db.select().from(evaluations);

  const rows = await baseQuery;

  if (rows.length === 0) {
    return {
      totalCount: 0,
      avgScores: { clarity: null, relevance: null, completeness: null, actionability: null, overall: null },
      trends: { clarity: "stable", relevance: "stable", completeness: "stable", actionability: "stable", overall: "stable" },
      topIssues: [],
      evolutionSuggestion: "暂无反馈数据，建议先收集用户反馈",
    };
  }

  // 按维度分组计算平均分
  const dims: FeedbackDimension[] = ["clarity", "relevance", "completeness", "actionability", "overall"];
  const avgScores: Record<string, number | null> = {};

  for (const dim of dims) {
    const dimRows = rows.filter((r) => r.dimension === dim);
    if (dimRows.length === 0) {
      avgScores[dim] = null;
    } else {
      avgScores[dim] = Math.round(
        (dimRows.reduce((s, r) => s + r.score, 0) / dimRows.length) * 10
      ) / 10;
    }
  }

  // 趋势分析：最近 30% vs 之前 70%
  const trends: Record<string, "up" | "down" | "stable"> = {};
  for (const dim of dims) {
    const dimRows = rows
      .filter((r) => r.dimension === dim)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    if (dimRows.length < 4) {
      trends[dim] = "stable";
      continue;
    }

    const split = Math.floor(dimRows.length * 0.7);
    const early = dimRows.slice(0, split);
    const recent = dimRows.slice(split);

    const earlyAvg = early.reduce((s, r) => s + r.score, 0) / early.length;
    const recentAvg = recent.reduce((s, r) => s + r.score, 0) / recent.length;
    const diff = recentAvg - earlyAvg;

    trends[dim] = diff > 0.5 ? "up" : diff < -0.5 ? "down" : "stable";
  }

  // 问题排序（分数最低的维度）
  const scoredDims = dims
    .filter((d) => avgScores[d] !== null)
    .map((d) => ({
      dimension: d,
      avgScore: avgScores[d]!,
      suggestion: DIMENSION_SUGGESTIONS[d][0],
    }))
    .sort((a, b) => a.avgScore - b.avgScore);

  const topIssues = scoredDims.filter((d) => d.avgScore < 7).slice(0, 3);

  // 进化建议
  let evolutionSuggestion: string;
  const overallScore = avgScores.overall ?? 0;
  if (overallScore >= 8) {
    evolutionSuggestion = "提示词质量优秀，建议保持当前风格并作为模板复用";
  } else if (overallScore >= 6) {
    evolutionSuggestion = `建议优先改进：${topIssues.map((i) => DIMENSION_LABELS[i.dimension]).join("、")}。可参考质量门禁系统的详细报告。`;
  } else {
    evolutionSuggestion = "提示词质量需大幅改进，建议使用 OPRO 自动优化引擎或框架匹配功能重新设计";
  }

  return {
    totalCount: rows.length / dims.length, // 每组 5 条
    avgScores: avgScores as Record<FeedbackDimension, number | null>,
    trends: trends as Record<FeedbackDimension, "up" | "down" | "stable">,
    topIssues,
    evolutionSuggestion,
  };
}

// ============================================================================
// 历史记录
// ============================================================================

export async function getFeedbackHistory(
  projectId?: number,
  limit = 50,
): Promise<FeedbackHistoryItem[]> {
  const db = getDb();

  const query = projectId
    ? db.select().from(evaluations).where(eq(evaluations.projectId, projectId))
    : db.select().from(evaluations);

  const rows = await query.orderBy(desc(evaluations.createdAt)).limit(limit);

  return rows.map((r) => ({
    id: r.id,
    projectId: r.projectId,
    stepId: r.stepId,
    dimension: r.dimension as FeedbackDimension,
    score: r.score,
    feedback: r.feedback,
    createdAt: r.createdAt,
  }));
}

// ============================================================================
// 快速评分（单维度）
// ============================================================================

export async function quickRate(
  projectId: number,
  userId: number,
  dimension: FeedbackDimension,
  score: number,
  comment?: string,
): Promise<number> {
  const db = getDb();
  const result = await db.insert(evaluations).values({
    projectId,
    userId,
    dimension,
    score: Math.max(1, Math.min(10, score)),
    feedback: comment ?? null,
    createdAt: new Date(),
  }).returning({ id: evaluations.id });

  return result[0].id;
}
