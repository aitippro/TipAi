/**
 * P0-1: OPRO 自动优化引擎
 *
 * 论文依据：Yang et al. "Large Language Models as Optimizers" (Google DeepMind, 2023)
 *
 * 核心思想：用 LLM 自身作为优化器，通过自然语言指令（meta-prompt）
 * 让模型根据历史高分候选生成更好的提示词变体。
 *
 * 流程：
 *  1. 初始化：基于原始提示词生成第一批 candidates
 *  2. 迭代：评估 → 保留 top-K → meta-prompt 生成新 candidates
 *  3. 终止：达到目标分数 / 最大迭代次数 / 连续无提升
 */

import { callAI } from "../../lib/ai-service-v3/client";
import {
  judgeBatch,
  judgePrompt,
  calculateImprovement,
  type JudgeCandidate,
  type JudgeResult,
} from "./llm-judge";
import type { DecodeStrategy } from "../ai/decoding-strategies";

/** OPRO 配置 */
export interface OPROConfig {
  /** 最大迭代轮数 */
  maxIterations: number;
  /** 每轮生成的候选数 */
  candidatesPerIteration: number;
  /** 历史保留 top-K */
  topKHistory: number;
  /** 目标综合分数（1-10） */
  targetScore: number;
  /** 连续 N 轮无提升则 early stop */
  earlyStopPatience: number;
  /** 评估模型 provider */
  judgeProvider: string;
  /** 评估模型 apiKey */
  judgeApiKey: string;
  /** 优化模型 provider（生成 candidates） */
  optimizerProvider: string;
  /** 优化模型 apiKey */
  optimizerApiKey: string;
  /** 领域 */
  domain?: string;
  /** 解码策略 */
  decodeStrategy?: DecodeStrategy;
}

/** 单个候选 */
export interface OPROCandidate {
  id: string;
  prompt: string;
  score: number;
  dimensions: JudgeResult["dimensions"];
  iteration: number;
  rank: number;
  reasoning?: string;
}

/** 单轮迭代 */
export interface OPROIteration {
  iteration: number;
  candidates: OPROCandidate[];
  bestCandidate: OPROCandidate;
  avgScore: number;
  topBottomGap: number;
  analysis: string;
}

/** OPRO 完整结果 */
export interface OPROResult {
  /** 最终优化后的提示词 */
  finalPrompt: string;
  /** 最终得分 */
  finalScore: number;
  /** 原始提示词 */
  originalPrompt: string;
  /** 原始得分 */
  originalScore: number;
  /** 提升百分比 */
  improvementPercent: number;
  /** 完整迭代轨迹 */
  iterations: OPROIteration[];
  /** 总候选数 */
  totalCandidates: number;
  /** 实际迭代轮数 */
  actualIterations: number;
  /** 总 token 消耗（估算） */
  estimatedTokens: number;
  /** 执行耗时 ms */
  elapsedMs: number;
  /** 终止原因 */
  stopReason: "target_reached" | "max_iterations" | "no_improvement" | "error";
}

const DEFAULT_CONFIG: Partial<OPROConfig> = {
  maxIterations: 3,
  candidatesPerIteration: 5,
  topKHistory: 3,
  targetScore: 9,
  earlyStopPatience: 1,
};

let _candidateId = 0;
function nextId(): string {
  return `c-${++_candidateId}`;
}

/**
 * 构建 meta-prompt，基于历史高分候选生成新 candidates
 */
function buildMetaPrompt(
  originalPrompt: string,
  history: OPROCandidate[],
  domain: string,
  count: number,
): string {
  const topEntries = history
    .slice(0, Math.min(history.length, 5))
    .map(
      (c, i) =>
        `候选 ${i + 1} (得分 ${c.score}):\n${c.prompt}\n优势分析: ${c.reasoning || "高分候选"}`,
    )
    .join("\n\n---\n\n");

  return `你是一位世界级的提示词优化专家（Prompt Meta-Optimizer）。
你的任务是基于历史高分候选，生成 ${count} 个新的、更好的提示词变体。

## 原始提示词
${originalPrompt}

## 历史高分候选（按得分排序）
${topEntries || "（无历史记录，请基于原始提示词生成初始变体）"}

## 生成规则
1. 分析历史高分候选的共同成功因素
2. 每个新候选必须在历史最佳基础上有所改进
3. 变化策略：结构调整、增加具体约束、改进角色设定、添加示例、优化输出格式等
4. 保持原始意图不变，不要改变任务本质
5. 每个候选应有不同的优化侧重方向
6. 候选之间要有明显差异，避免同质化

## 领域上下文
${domain || "通用任务"}

返回严格JSON格式（不要 markdown 标记）：
[
  {
    "prompt": "完整的提示词文本",
    "strategy": "本次变化的核心策略（如：增加 Few-shot 示例 / 强化角色设定 / 细化输出格式）"
  }
]`;
}

/**
 * 解析 meta-prompt 返回的 candidates
 */
function parseCandidates(raw: string, _iteration: number): Array<{ prompt: string; strategy: string }> {
  try {
    const cleaned = raw.replace(/^```json\s*|\s*```$/g, "").trim();
    const parsed = JSON.parse(cleaned) as Array<Record<string, unknown>>;
    return parsed
      .filter((p): p is { prompt: string; strategy: string } => typeof p.prompt === "string")
      .map((p) => ({
        prompt: p.prompt,
        strategy: typeof p.strategy === "string" ? p.strategy : "综合优化",
      }));
  } catch {
    // 尝试提取所有带引号的文本作为候选
    const matches = raw.match(/"prompt"\s*:\s*"([\s\S]*?)"/g);
    if (matches) {
      return matches
        .map((m) => {
          const content = m.replace(/"prompt"\s*:\s*"/, "").replace(/"$/, "");
          return { prompt: content, strategy: "自动提取" };
        })
        .slice(0, 5);
    }
    return [];
  }
}

/**
 * 生成初始 candidates（第 0 轮）
 */
async function generateInitialCandidates(
  originalPrompt: string,
  config: OPROConfig,
): Promise<Array<{ prompt: string; strategy: string }>> {
  const metaPrompt = buildMetaPrompt(originalPrompt, [], config.domain || "", config.candidatesPerIteration);

  const result = await callAI(
    config.optimizerProvider,
    config.optimizerApiKey,
    metaPrompt,
    `请为以下提示词生成 ${config.candidatesPerIteration} 个优化变体：\n\n${originalPrompt}`,
    0.7,
    config.decodeStrategy,
  );

  if (!result) {
    // fallback：基于原始提示词做简单变体
    return Array.from({ length: config.candidatesPerIteration }, (_, i) => ({
      prompt: originalPrompt,
      strategy: `初始变体 ${i + 1}`,
    }));
  }

  const candidates = parseCandidates(result, 0);
  if (candidates.length === 0) {
    return [{ prompt: originalPrompt, strategy: "原始提示词" }];
  }

  return candidates;
}

/**
 * 基于历史生成新一轮 candidates
 */
async function generateNextCandidates(
  originalPrompt: string,
  history: OPROCandidate[],
  config: OPROConfig,
  iteration: number,
): Promise<Array<{ prompt: string; strategy: string }>> {
  const metaPrompt = buildMetaPrompt(
    originalPrompt,
    history,
    config.domain || "",
    config.candidatesPerIteration,
  );

  const result = await callAI(
    config.optimizerProvider,
    config.optimizerApiKey,
    metaPrompt,
    `第 ${iteration} 轮优化。请基于历史高分候选生成 ${config.candidatesPerIteration} 个新的改进变体。`,
    0.7,
    config.decodeStrategy,
  );

  if (!result) return [];

  const candidates = parseCandidates(result, iteration);
  return candidates.length > 0 ? candidates : [];
}

/**
 * 执行 OPRO 优化
 */
export async function runOPRO(
  originalPrompt: string,
  userConfig: Partial<OPROConfig>,
): Promise<OPROResult> {
  const startTime = Date.now();
  const config: OPROConfig = { ...DEFAULT_CONFIG, ...userConfig } as OPROConfig;

  console.log(`[OPRO] Starting optimization: maxIterations=${config.maxIterations}, candidatesPerIteration=${config.candidatesPerIteration}`);

  // 1. 评估原始提示词作为 baseline
  const baselineJudge = await judgePrompt(
    config.judgeProvider,
    config.judgeApiKey,
    { id: "baseline", prompt: originalPrompt, domain: config.domain },
    config.decodeStrategy,
  );
  const originalScore = baselineJudge.dimensions.overall;

  console.log(`[OPRO] Baseline score: ${originalScore}/10`);

  // 如果原始分已经很高，直接返回
  if (originalScore >= config.targetScore) {
    return {
      finalPrompt: originalPrompt,
      finalScore: originalScore,
      originalPrompt,
      originalScore,
      improvementPercent: 0,
      iterations: [],
      totalCandidates: 1,
      actualIterations: 0,
      estimatedTokens: 0,
      elapsedMs: Date.now() - startTime,
      stopReason: "target_reached",
    };
  }

  // 2. 生成初始 candidates
  const initialRaw = await generateInitialCandidates(originalPrompt, config);
  let allHistory: OPROCandidate[] = [];
  const iterations: OPROIteration[] = [];

  let bestEver: OPROCandidate = {
    id: "baseline",
    prompt: originalPrompt,
    score: originalScore,
    dimensions: baselineJudge.dimensions,
    iteration: 0,
    rank: 1,
    reasoning: baselineJudge.reasoning,
  };

  let noImprovementCount = 0;
  let estimatedTokens = 0;

  for (let iteration = 1; iteration <= config.maxIterations; iteration++) {
    console.log(`[OPRO] Iteration ${iteration}/${config.maxIterations}`);

    // 生成 candidates
    let rawCandidates: Array<{ prompt: string; strategy: string }>;
    if (iteration === 1) {
      rawCandidates = initialRaw;
    } else {
      rawCandidates = await generateNextCandidates(originalPrompt, allHistory, config, iteration);
      if (rawCandidates.length === 0) {
        console.warn(`[OPRO] Iteration ${iteration}: failed to generate candidates`);
        break;
      }
    }

    // 去重：与历史重复的跳过
    const seenPrompts = new Set(allHistory.map((c) => c.prompt.trim()));
    const uniqueCandidates = rawCandidates.filter((c) => !seenPrompts.has(c.prompt.trim()));

    if (uniqueCandidates.length === 0) {
      console.warn(`[OPRO] Iteration ${iteration}: all candidates are duplicates`);
      noImprovementCount++;
      if (noImprovementCount >= config.earlyStopPatience) {
        console.log(`[OPRO] Early stop: no new candidates for ${config.earlyStopPatience} rounds`);
        break;
      }
      continue;
    }

    // 批量评估
    const judgeCandidates: JudgeCandidate[] = uniqueCandidates.map((c) => ({
      id: nextId(),
      prompt: c.prompt,
      domain: config.domain,
    }));

    const batchResult = await judgeBatch(
      config.judgeProvider,
      config.judgeApiKey,
      judgeCandidates,
      config.decodeStrategy,
    );

    // 构建本轮 candidates
    const iterationCandidates: OPROCandidate[] = batchResult.ranked.map((r, idx) => ({
      id: r.id,
      prompt: judgeCandidates.find((c) => c.id === r.id)?.prompt || "",
      score: r.score,
      dimensions: r.result.dimensions,
      iteration,
      rank: idx + 1,
      reasoning: r.result.reasoning,
    }));

    // 更新历史
    allHistory = [...allHistory, ...iterationCandidates]
      .sort((a, b) => b.score - a.score)
      .slice(0, config.topKHistory * config.candidatesPerIteration);

    // 检查本轮最佳
    const iterationBest = iterationCandidates[0];
    const previousBest = bestEver.score;

    if (iterationBest && iterationBest.score > bestEver.score) {
      bestEver = iterationBest;
      noImprovementCount = 0;
      console.log(`[OPRO] New best: ${bestEver.score}/10 (was ${previousBest})`);
    } else {
      noImprovementCount++;
      console.log(`[OPRO] No improvement. Best remains: ${bestEver.score}/10`);
    }

    // 记录本轮
    iterations.push({
      iteration,
      candidates: iterationCandidates,
      bestCandidate: iterationBest || bestEver,
      avgScore: batchResult.avgScore,
      topBottomGap:
        batchResult.topCandidate && batchResult.bottomCandidate
          ? batchResult.topCandidate.score - batchResult.bottomCandidate.score
          : 0,
      analysis: batchResult.topBottomAnalysis,
    });

    estimatedTokens += estimateIterationTokens(
      uniqueCandidates.length,
      originalPrompt.length,
    );

    // 终止检查
    if (bestEver.score >= config.targetScore) {
      console.log(`[OPRO] Target score ${config.targetScore} reached!`);
      break;
    }

    if (noImprovementCount >= config.earlyStopPatience) {
      console.log(`[OPRO] Early stop: no improvement for ${config.earlyStopPatience} rounds`);
      break;
    }
  }

  const elapsedMs = Date.now() - startTime;
  const improvementPercent = calculateImprovement(originalScore, bestEver.score);

  const stopReason: OPROResult["stopReason"] =
    bestEver.score >= config.targetScore
      ? "target_reached"
      : noImprovementCount >= config.earlyStopPatience
        ? "no_improvement"
        : "max_iterations";

  console.log(
    `[OPRO] Finished in ${elapsedMs}ms. Final score: ${bestEver.score}/10 (improvement: +${improvementPercent}%)`,
  );

  return {
    finalPrompt: bestEver.prompt,
    finalScore: bestEver.score,
    originalPrompt,
    originalScore,
    improvementPercent,
    iterations,
    totalCandidates: allHistory.length,
    actualIterations: iterations.length,
    estimatedTokens,
    elapsedMs,
    stopReason,
  };
}

function estimateIterationTokens(candidateCount: number, promptLength: number): number {
  // 粗略估算：meta-prompt + candidates + judge calls
  const metaPromptTokens = Math.ceil(promptLength * 1.5);
  const candidateTokens = candidateCount * Math.ceil(promptLength * 1.2);
  const judgeTokens = candidateCount * 500;
  return metaPromptTokens + candidateTokens + judgeTokens;
}
