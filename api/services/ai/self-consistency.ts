/**
 * AI-1c: Self-Consistency 自洽引擎
 *
 * 论文依据：Wang et al. "Self-Consistency Improves Chain of Thought Reasoning in LLMs" (ICLR 2023)
 *
 * 功能：
 *  1. 对同一 prompt 进行 N 次独立采样（temperature > 0）
 *  2. 对 N 个输出进行投票聚合
 *  3. 返回多数决结果 + 置信度分数 + 完整轨迹
 *  4. 支持文本相似度投票（处理同义不同表述的情况）
 */

import type { AIModelProvider, ChatMessage, ChatOptions, ChatResponse, TokenUsage } from "./provider";
import { calculateConfidence, type DecodeStrategy } from "./decoding-strategies";

/** 单条采样路径的结果 */
export interface SCPath {
  /** 路径序号 */
  index: number;
  /** 原始输出文本 */
  content: string;
  /** 规范化后的 key（用于投票） */
  normalizedKey: string;
  /** token 用量 */
  usage?: TokenUsage;
  /** 完成原因 */
  finishReason?: string;
}

/** 投票簇（相同/相似答案的集合） */
export interface SCCluster {
  /** 簇 ID */
  id: string;
  /** 该簇的规范化 key */
  normalizedKey: string;
  /** 该簇的代表性答案（取第一条） */
  representative: string;
  /** 票数 */
  votes: number;
  /** 占比 */
  ratio: number;
  /** 属于该簇的路径索引 */
  pathIndices: number[];
}

/** Self-Consistency 完整结果 */
export interface SCResult {
  /** 最终选中的答案 */
  finalAnswer: string;
  /** 置信度 0-1 */
  confidence: number;
  /** 所有采样路径 */
  paths: SCPath[];
  /** 投票簇分布 */
  clusters: SCCluster[];
  /** 总 token 消耗 */
  totalUsage: TokenUsage;
  /** 使用的策略配置 */
  strategy: DecodeStrategy;
  /** 执行耗时 ms */
  elapsedMs: number;
}

/** 投票算法类型 */
export type SCVotingMethod = "exact" | "normalized" | "semantic-similarity";

/** Self-Consistency 配置 */
export interface SCConfig {
  /** 投票方法 */
  votingMethod?: SCVotingMethod;
  /** 语义相似度阈值（0-1，仅 semantic-similarity 有效） */
  similarityThreshold?: number;
  /** 是否保留所有路径的原始输出（用于调试/可视化） */
  preservePaths?: boolean;
  /** 最大并行数 */
  maxConcurrency?: number;
}

const DEFAULT_SC_CONFIG: Required<SCConfig> = {
  votingMethod: "normalized",
  similarityThreshold: 0.85,
  preservePaths: true,
  maxConcurrency: 5,
};

/**
 * 文本规范化：用于投票前的统一处理
 *  1. 转小写
 *  2. 去除多余空白
 *  3. 去除标点（可选级别）
 */
export function normalizeText(text: string, level: "soft" | "hard" = "soft"): string {
  let normalized = text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  if (level === "hard") {
    // 去除常见标点、括号、引号
    normalized = normalized
      .replace(/[.,;:!?。，；：！？、"'""''（）()[\]{}]/g, "")
      .replace(/\s+/g, " ");
  }

  return normalized;
}

/**
 * 简单的字符级相似度计算（Jaccard 系数）
 * 用于轻量级语义相似度判断
 */
export function charJaccardSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  if (!a || !b) return 0.0;

  const setA = new Set(a.split(""));
  const setB = new Set(b.split(""));

  const intersection = new Set([...setA].filter((c) => setB.has(c)));
  const union = new Set([...setA, ...setB]);

  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * 对 JSON/代码类输出进行结构化规范化
 * 尝试解析 JSON 并统一格式化，失败则回退到文本规范化
 */
export function normalizeStructured(text: string): string {
  const trimmed = text.trim();

  // 尝试提取 JSON 代码块
  const jsonBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = jsonBlockMatch ? jsonBlockMatch[1].trim() : trimmed;

  try {
    const parsed = JSON.parse(jsonText);
    return JSON.stringify(parsed, Object.keys(parsed).sort());
  } catch {
    // 尝试检测是否是代码（简单启发式）
    const codeIndicators = /^(function|class|const|let|var|import|export|def|#include)/m;
    if (codeIndicators.test(trimmed)) {
      // 代码规范化：去除注释、统一空白
      return trimmed
        .replace(/\/\/.*$/gm, "")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\s+/g, " ")
        .toLowerCase();
    }

    return normalizeText(trimmed, "soft");
  }
}

/**
 * 投票聚合：将多条路径按相似度分组
 */
function aggregateVotes(
  paths: SCPath[],
  votingMethod: SCVotingMethod,
  similarityThreshold: number,
): SCCluster[] {
  const clusters: SCCluster[] = [];

  for (const path of paths) {
    let matched = false;

    if (votingMethod === "semantic-similarity") {
      for (const cluster of clusters) {
        const sim = charJaccardSimilarity(path.normalizedKey, cluster.normalizedKey);
        if (sim >= similarityThreshold) {
          cluster.votes += 1;
          cluster.ratio = Number((cluster.votes / paths.length).toFixed(4));
          cluster.pathIndices.push(path.index);
          matched = true;
          break;
        }
      }
    } else {
      // exact / normalized：直接匹配 normalizedKey
      const existing = clusters.find((c) => c.normalizedKey === path.normalizedKey);
      if (existing) {
        existing.votes += 1;
        existing.ratio = Number((existing.votes / paths.length).toFixed(4));
        existing.pathIndices.push(path.index);
        matched = true;
      }
    }

    if (!matched) {
      clusters.push({
        id: `cluster-${clusters.length}`,
        normalizedKey: path.normalizedKey,
        representative: path.content,
        votes: 1,
        ratio: Number((1 / paths.length).toFixed(4)),
        pathIndices: [path.index],
      });
    }
  }

  // 按票数降序排列
  return clusters.sort((a, b) => b.votes - a.votes);
}

/**
 * 并行执行多次采样调用
 */
async function samplePaths(
  provider: AIModelProvider,
  messages: ChatMessage[],
  options: ChatOptions,
  sampleCount: number,
  maxConcurrency: number,
): Promise<SCPath[]> {
  const paths: SCPath[] = [];

  // 分批并行执行，避免同时发送过多请求
  for (let batchStart = 0; batchStart < sampleCount; batchStart += maxConcurrency) {
    const batchSize = Math.min(maxConcurrency, sampleCount - batchStart);
    const batchPromises: Promise<SCPath>[] = [];

    for (let i = 0; i < batchSize; i++) {
      const pathIndex = batchStart + i;
      batchPromises.push(
        (async (): Promise<SCPath> => {
          try {
            const response = await provider.chat(messages, {
              ...options,
              // 确保每次采样都有随机性
              temperature: options.temperature ?? 0.7,
            });

            const normalizedKey = normalizeStructured(response.content);

            return {
              index: pathIndex,
              content: response.content,
              normalizedKey,
              usage: response.usage,
              finishReason: response.finishReason,
            };
          } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            console.error(`[Self-Consistency] Path ${pathIndex} failed:`, errMsg);

            return {
              index: pathIndex,
              content: `[ERROR: ${errMsg}]`,
              normalizedKey: `__error_${pathIndex}__`,
              usage: undefined,
              finishReason: "error",
            };
          }
        })(),
      );
    }

    const batchResults = await Promise.all(batchPromises);
    paths.push(...batchResults);
  }

  return paths;
}

/**
 * 执行 Self-Consistency 推理
 *
 * @param provider  AI Provider 实例
 * @param messages  对话消息
 * @param options   ChatOptions（temperature 会被保留用于采样）
 * @param strategy  解码策略（必须包含 sampleCount）
 * @param config    SC 额外配置
 */
export async function runSelfConsistency(
  provider: AIModelProvider,
  messages: ChatMessage[],
  options: ChatOptions,
  strategy: DecodeStrategy,
  config?: SCConfig,
): Promise<SCResult> {
  const startTime = Date.now();
  const scConfig = { ...DEFAULT_SC_CONFIG, ...config };
  const sampleCount = strategy.sampleCount ?? 5;

  console.log(
    `[Self-Consistency] Starting ${sampleCount} paths with ${scConfig.votingMethod} voting...`,
  );

  // 1. 并行采样
  const paths = await samplePaths(
    provider,
    messages,
    options,
    sampleCount,
    scConfig.maxConcurrency,
  );

  // 2. 过滤失败的路径
  const validPaths = paths.filter((p) => p.finishReason !== "error");

  if (validPaths.length === 0) {
    throw new Error("Self-Consistency: All sampling paths failed");
  }

  if (validPaths.length === 1) {
    console.warn("[Self-Consistency] Only 1 valid path, falling back to single result");
  }

  // 3. 投票聚合
  const clusters = aggregateVotes(
    validPaths,
    scConfig.votingMethod,
    scConfig.similarityThreshold,
  );

  // 4. 选取多数决结果
  const winner = clusters[0];
  const confidence = calculateConfidence(
    new Map(clusters.map((c) => [c.normalizedKey, c.votes])),
    validPaths.length,
  );

  // 5. 汇总 token 用量
  const totalUsage: TokenUsage = validPaths.reduce(
    (sum, p) => ({
      promptTokens: sum.promptTokens + (p.usage?.promptTokens ?? 0),
      completionTokens: sum.completionTokens + (p.usage?.completionTokens ?? 0),
      totalTokens: sum.totalTokens + (p.usage?.totalTokens ?? 0),
    }),
    { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  );

  const elapsedMs = Date.now() - startTime;

  console.log(
    `[Self-Consistency] Completed in ${elapsedMs}ms. Winner: ${winner.votes}/${validPaths.length} votes (confidence=${confidence})`,
  );

  return {
    finalAnswer: winner.representative,
    confidence,
    paths: scConfig.preservePaths ? paths : [],
    clusters,
    totalUsage,
    strategy,
    elapsedMs,
  };
}

/**
 * 将 SCResult 转换为标准 ChatResponse（供 AIRouter 统一处理）
 */
export function scResultToChatResponse(result: SCResult, providerName: string, model: string): ChatResponse {
  return {
    content: result.finalAnswer,
    model,
    provider: providerName,
    usage: result.totalUsage,
    finishReason: "stop",
    raw: {
      _decodeStrategy: "self-consistency",
      _confidence: result.confidence,
      _pathCount: result.strategy.sampleCount,
      _elapsedMs: result.elapsedMs,
      _clusters: result.clusters.map((c) => ({
        votes: c.votes,
        ratio: c.ratio,
        representativePreview: c.representative.slice(0, 200),
      })),
      ...(result.paths.length > 0 ? { _paths: result.paths } : {}),
    },
  };
}
