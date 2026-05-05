 

/**
 * P2-2: 反馈闭环系统 (Feedback Loop)
 *
 * 基于 evaluations 表构建数据驱动的反馈闭环：
 *  - 5 维度评分收集（clarity/relevance/completeness/actionability/overall）
 *  - 统计分析和趋势检测
 *  - 进化建议生成
 */

// ── Native Addon ─────────────────────────────────────────
import { native } from "../../lib/native";

function mapNativeEvaluation(row: NativeEvalEntry): FeedbackHistoryItem {
  return {
    id: row.id,
    projectId: row.projectId ?? row.project_id,
    stepId: row.stepId ?? row.step_id ?? null,
    userId: row.userId ?? row.user_id,
    dimension: row.dimension as FeedbackDimension,
    score: row.score,
    feedback: row.feedback ?? null,
    createdAt: (row.createdAt ?? row.created_at) ? new Date(row.createdAt ?? row.created_at as string) : null,
  };
}

// 复用 index.d.ts 中的类型（运行时从 native 模块获取）
// NAPI-RS returns camelCase, polyfill returns snake_case — handle both
interface NativeEvalEntry {
  id: number;
  projectId?: number;
  project_id: number;
  stepId?: number;
  step_id?: number;
  userId?: number;
  user_id: number;
  dimension: string;
  score: number;
  feedback?: string;
  createdAt?: string;
  created_at?: string;
}

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
  userId: number;
  dimension: FeedbackDimension;
  score: number;
  feedback: string | null;
  createdAt: Date | null;
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
  const ids: number[] = [];

  for (const [dimension, score] of Object.entries(input.scores)) {
    try {
      const entry = native.evaluationCreate({
        projectId: input.projectId,
        stepId: input.stepId ?? null,
        userId: input.userId,
        dimension: dimension as FeedbackDimension,
        score: Math.max(1, Math.min(10, score)),
        feedback: input.comment ?? null,
      });
      ids.push(entry.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[submitFeedback] Failed to create evaluation for ${dimension}:`, msg);
      throw new Error(`反馈提交失败（维度: ${dimension}）: ${msg}`);
    }
  }

  return ids;
}

// ============================================================================
// 统计分析
// ============================================================================

export async function getFeedbackStats(projectId?: number): Promise<FeedbackStats> {
  let stats: ReturnType<typeof native.evaluationStats>;
  let rows: NativeEvalEntry[];
  try {
    stats = native.evaluationStats(projectId ?? null);
    rows = native.evaluationList(projectId ?? null, 1000);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[getFeedbackStats] Native evaluation query failed:", msg);
    throw new Error(`反馈统计查询失败: ${msg}`);
  }

  if ((stats.totalCount ?? stats.total_count) === 0 && rows.length === 0) {
    return {
      totalCount: 0,
      avgScores: { clarity: null, relevance: null, completeness: null, actionability: null, overall: null },
      trends: { clarity: "stable", relevance: "stable", completeness: "stable", actionability: "stable", overall: "stable" },
      topIssues: [],
      evolutionSuggestion: "暂无反馈数据，建议先收集用户反馈",
    };
  }

  const dims: FeedbackDimension[] = ["clarity", "relevance", "completeness", "actionability", "overall"];

  // 平均值从 Rust stats 获取
  const avgScores: Record<string, number | null> = {
    clarity: stats.avgClarity ?? stats.avg_clarity ?? null,
    relevance: stats.avgRelevance ?? stats.avg_relevance ?? null,
    completeness: stats.avgCompleteness ?? stats.avg_completeness ?? null,
    actionability: stats.avgActionability ?? stats.avg_actionability ?? null,
    overall: stats.avgOverall ?? stats.avg_overall ?? null,
  };

  // 趋势分析：最近 30% vs 之前 70%
  const trends: Record<string, "up" | "down" | "stable"> = {};
  for (const dim of dims) {
    const dimRows = rows
      .filter((r: NativeEvalEntry) => r.dimension === dim)
      .sort((a: NativeEvalEntry, b: NativeEvalEntry) =>
        (a.createdAt ?? a.created_at ? new Date((a.createdAt ?? a.created_at) as string).getTime() : 0) - (b.createdAt ?? b.created_at ? new Date((b.createdAt ?? b.created_at) as string).getTime() : 0)
      );

    if (dimRows.length < 4) {
      trends[dim] = "stable";
      continue;
    }

    const split = Math.floor(dimRows.length * 0.7);
    const early = dimRows.slice(0, split);
    const recent = dimRows.slice(split);

    const earlyAvg = early.reduce((s: number, r: NativeEvalEntry) => s + r.score, 0) / early.length;
    const recentAvg = recent.reduce((s: number, r: NativeEvalEntry) => s + r.score, 0) / recent.length;
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
    totalCount: stats.totalCount ?? stats.total_count,
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
  let rows: NativeEvalEntry[];
  try {
    rows = native.evaluationList(projectId ?? null, limit);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[getFeedbackHistory] Native evaluation query failed:", msg);
    throw new Error(`反馈历史查询失败: ${msg}`);
  }

  return rows.map(mapNativeEvaluation);
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
  try {
    const entry = native.evaluationCreate({
      projectId,
      userId,
      dimension,
      score: Math.max(1, Math.min(10, score)),
      feedback: comment ?? null,
    });
    return entry.id;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[quickRate] Native evaluation create failed:", msg);
    throw new Error(`评分提交失败: ${msg}`);
  }
}
