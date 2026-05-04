/**
 * AI-1b: 解码策略配置层 (Decode Strategy Layer)
 *
 * 功能：
 *  1. 定义三种解码策略：greedy / sampling / self-consistency
 *  2. 策略参数配置与验证
 *  3. 成本透明计算（实时估算 token 费用）
 *  4. 策略与任务类型的推荐映射
 */

import { estimateTokens } from "./provider";

/** 支持的解码策略类型 */
export type DecodeStrategyType = "greedy" | "sampling" | "self-consistency";

/** 解码策略配置 */
export interface DecodeStrategy {
  /** 策略类型 */
  type: DecodeStrategyType;
  /** 采样温度（greedy 强制为 0） */
  temperature?: number;
  /** top_p 核采样 */
  topP?: number;
  /** Self-Consistency 采样路径数（仅 SC 有效） */
  sampleCount?: number;
  /** 最大输出 token 数 */
  maxTokens?: number;
}

/** 成本估算结果 */
export interface CostEstimate {
  /** 预估输入 token 数 */
  promptTokens: number;
  /** 预估输出 token 数（单条） */
  completionTokensPerPath: number;
  /** 采样路径数 */
  pathCount: number;
  /** 总预估 token 数 */
  totalTokens: number;
  /** 预估费用（USD） */
  estimatedCostUsd: number;
  /** 所用模型单价标识 */
  pricingModel: string;
}

/** 各 provider 大致单价（USD / 1M tokens）—— 用于成本估算 */
const PRICING_TABLE: Record<
  string,
  { input: number; output: number }
> = {
  // OpenAI
  "gpt-4o": { input: 2.5, output: 10.0 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4-turbo": { input: 10.0, output: 30.0 },
  "gpt-4": { input: 30.0, output: 60.0 },
  "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
  // Kimi (Moonshot)
  "moonshot-v1-8k": { input: 0.5, output: 1.5 },
  "moonshot-v1-32k": { input: 0.7, output: 2.0 },
  "moonshot-v1-128k": { input: 1.2, output: 3.5 },
  // DeepSeek
  "deepseek-chat": { input: 0.07, output: 0.27 },
  "deepseek-reasoner": { input: 0.55, output: 2.19 },
  // Gemini
  "gemini-1.5-flash": { input: 0.075, output: 0.3 },
  "gemini-1.5-pro": { input: 1.25, output: 5.0 },
  // Ollama (本地免费)
  "llama3.2": { input: 0, output: 0 },
  "llama3.1": { input: 0, output: 0 },
  "qwen2.5": { input: 0, output: 0 },
  "mistral": { input: 0, output: 0 },
};

/** Pre-sorted pricing keys by length descending (computed at module load) */
const SORTED_PRICING_KEYS: string[] = /* @__PURE__ */ (() => {
  return Object.keys(PRICING_TABLE).sort((a, b) => b.length - a.length);
})();

/** 默认策略参数 */
export const DEFAULT_STRATEGY_CONFIG: Record<DecodeStrategyType, Omit<DecodeStrategy, "type">> = {
  greedy: {
    temperature: 0,
    topP: 1.0,
    sampleCount: 1,
    maxTokens: 4000,
  },
  sampling: {
    temperature: 0.7,
    topP: 0.9,
    sampleCount: 1,
    maxTokens: 4000,
  },
  "self-consistency": {
    temperature: 0.7,
    topP: 0.9,
    sampleCount: 5,
    maxTokens: 4000,
  },
};

/** 任务类型 → 推荐解码策略 */
export const TASK_STRATEGY_RECOMMENDATIONS: Record<string, DecodeStrategyType> = {
  chat: "sampling",
  analysis: "self-consistency",
  code: "self-consistency",
  creative: "sampling",
  optimization: "self-consistency",
  classification: "self-consistency",
  default: "sampling",
};

/**
 * 合并用户策略与默认参数，生成最终策略配置
 */
export function resolveDecodeStrategy(
  userStrategy?: Partial<DecodeStrategy>,
): DecodeStrategy {
  const type = userStrategy?.type ?? "sampling";
  const defaults = DEFAULT_STRATEGY_CONFIG[type];

  return {
    type,
    temperature:
      type === "greedy"
        ? 0
        : (userStrategy?.temperature ?? defaults.temperature ?? 0.7),
    topP: userStrategy?.topP ?? defaults.topP ?? 1.0,
    sampleCount:
      type === "self-consistency"
        ? Math.max(3, Math.min(10, userStrategy?.sampleCount ?? defaults.sampleCount ?? 5))
        : 1,
    maxTokens: userStrategy?.maxTokens ?? defaults.maxTokens ?? 4000,
  };
}

/**
 * 根据任务类型推荐默认解码策略
 */
export function recommendStrategyForTask(taskType: string): DecodeStrategyType {
  return TASK_STRATEGY_RECOMMENDATIONS[taskType] ?? "sampling";
}

/**
 * 估算给定策略的 token 成本
 *
 * @param promptText  输入提示词文本
 * @param model       模型名称（用于查单价）
 * @param strategy    解码策略
 * @param expectedOutputLen  预估输出长度（字符数），默认 2000
 */
export function estimateCost(
  promptText: string,
  model: string,
  strategy: DecodeStrategy,
  expectedOutputLen = 2000,
): CostEstimate {
  const promptTokens = estimateTokens(promptText);
  const completionTokensPerPath = Math.ceil(estimateTokens("x".repeat(expectedOutputLen)));
  const pathCount = strategy.sampleCount ?? 1;

  const totalTokens = promptTokens * pathCount + completionTokensPerPath * pathCount;

  // 查找最接近的模型定价（使用预排序 key 列表）
  const pricingKey =
    SORTED_PRICING_KEYS.find((k) => model.includes(k)) ?? "gpt-4o-mini";
  const pricing = PRICING_TABLE[pricingKey] ?? { input: 0.15, output: 0.6 };

  const inputCost = (promptTokens * pathCount * pricing.input) / 1_000_000;
  const outputCost = (completionTokensPerPath * pathCount * pricing.output) / 1_000_000;

  return {
    promptTokens,
    completionTokensPerPath,
    pathCount,
    totalTokens,
    estimatedCostUsd: Number((inputCost + outputCost).toFixed(6)),
    pricingModel: pricingKey,
  };
}

/**
 * 计算 Self-Consistency 的可靠性分数（confidence）
 * 基于投票一致性：最高票数 / 总样本数
 */
export function calculateConfidence(voteCounts: Map<string, number>, totalSamples: number): number {
  if (totalSamples === 0) return 0;
  const maxVotes = Math.max(0, ...voteCounts.values());
  return Number((maxVotes / totalSamples).toFixed(4));
}

/**
 * 将策略配置转换为可展示的文本摘要
 */
export function strategyToLabel(strategy: DecodeStrategy): string {
  switch (strategy.type) {
    case "greedy":
      return "贪心解码 (Greedy) — 确定性输出";
    case "sampling":
      return `随机采样 (Sampling) — T=${strategy.temperature}`;
    case "self-consistency":
      return `自洽投票 (Self-Consistency) — ${strategy.sampleCount} 条路径`;
    default:
      return "未知策略";
  }
}

/**
 * 解码策略元信息（供 UI 展示）
 */
export interface StrategyMeta {
  type: DecodeStrategyType;
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  recommendedFor: string[];
}

export const STRATEGY_METAS: StrategyMeta[] = [
  {
    type: "greedy",
    name: "贪心解码",
    description: "temperature=0 的确定性解码，每次输出完全相同。适合需要一致性的场景。",
    pros: ["输出完全确定", "零随机性", "成本最低"],
    cons: ["缺乏创造性", "无法探索多种可能", "对模糊问题可能给出次优解"],
    recommendedFor: ["格式化输出", "分类任务", "单元测试", "确定性翻译"],
  },
  {
    type: "sampling",
    name: "随机采样",
    description: "temperature>0 的随机解码，每次输出有变化。适合创意和开放式任务。",
    pros: ["输出多样性", "有创造性", "成本适中"],
    cons: ["结果不可复现", "可能需要多次尝试", "对精确任务不稳定"],
    recommendedFor: ["创意写作", "头脑风暴", "对话聊天", "文案生成"],
  },
  {
    type: "self-consistency",
    name: "自洽投票",
    description: "多次采样后投票选出最一致的答案。适合需要高可靠性的推理任务。",
    pros: ["可靠性最高", "减少随机错误", "附带置信度分数"],
    cons: ["成本成倍增加", "延迟较高", "对纯创意任务意义不大"],
    recommendedFor: ["代码生成", "数学推理", "数据分析", "分类判断", "决策建议"],
  },
];
