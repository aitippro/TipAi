/**
 * AI-1: 智能模型路由器
 * 功能：
 *  1. 根据任务类型自动选择最优模型
 *  2. 主模型故障时自动降级到备用模型
 *  3. Token 用量统计与成本追踪
 *  4. 流式输出统一（所有模型返回标准化 SSE）
 */

import {
  type AIModelProvider,
  type ChatMessage,
  type ChatOptions,
  type ChatResponse,
  type ProviderConfig,
  type StreamChunk,
  type TokenUsage,
  formatSSE,
  normalizeMessages,
} from "./provider";

import {
  createKimiProvider,
  createDeepSeekProvider,
  createOpenAIProvider,
  createGeminiProvider,
  createOllamaProvider,
} from "./providers";

import {
  type DecodeStrategy,
  type CostEstimate,
  resolveDecodeStrategy,
  recommendStrategyForTask,
  estimateCost,
  strategyToLabel,
} from "./decoding-strategies";

import {
  runSelfConsistency,
  scResultToChatResponse,
} from "./self-consistency";

export type TaskType =
  | "chat"
  | "analysis"
  | "code"
  | "creative"
  | "optimization"
  | "classification"
  | "default";

export interface RouterConfig {
  /** 各 provider 的配置 */
  providers: Record<string, ProviderConfig>;
  /** 任务类型 → provider 优先级映射 */
  routingRules?: Partial<Record<TaskType, string[]>>;
  /** 最大重试次数（含主模型） */
  maxRetries?: number;
  /** 是否启用用量统计 */
  trackUsage?: boolean;
  /** 是否启用解码策略层 */
  enableDecodeLayer?: boolean;
  /** 默认解码策略 */
  defaultDecodeStrategy?: DecodeStrategy;
}

export interface RoutingDecision {
  taskType: TaskType;
  provider: string;
  model: string;
  reason: string;
  fallbackChain: string[];
}

export interface RouteUsageSummary {
  totalCalls: number;
  totalTokens: number;
  byProvider: Record<string, { calls: number; tokens: number }>;
}

/**
 * 默认路由规则：按任务类型推荐模型优先级
 * 优先级越高，排在越前面
 */
const DEFAULT_ROUTING_RULES: Record<TaskType, string[]> = {
  chat: ["kimi", "openai", "deepseek", "gemini", "ollama"],
  analysis: ["deepseek", "kimi", "openai", "gemini", "ollama"],
  code: ["deepseek", "openai", "kimi", "gemini", "ollama"],
  creative: ["openai", "kimi", "deepseek", "gemini", "ollama"],
  optimization: ["openai", "deepseek", "kimi", "gemini", "ollama"],
  classification: ["kimi", "openai", "deepseek", "gemini", "ollama"],
  default: ["kimi", "openai", "deepseek", "gemini", "ollama"],
};

/**
 * 根据用户意图推断任务类型
 */
export function detectTaskType(intent: string): TaskType {
  const lower = intent.toLowerCase();

  if (/\b(code|编程|程序|算法|debug|bug|函数|class|接口|api|架构|refactor|重构)\b/.test(lower)) {
    return "code";
  }
  if (/\b(分析|analyze|分析|数据|统计|趋势|report|报告|洞察|评估|evaluate)\b/.test(lower)) {
    return "analysis";
  }
  if (/\b(优化|optimize|改进|improve|精简|polish|enhance|refine|rewrite|重写)\b/.test(lower)) {
    return "optimization";
  }
  if (/\b(分类|classify|标签|tag|识别|detect|判断|判断)\b/.test(lower)) {
    return "classification";
  }
  if (/\b(创意|creative|写|write|故事|story|文案|copy|诗歌|poem|小说|novel|脚本|script)\b/.test(lower)) {
    return "creative";
  }

  return "default";
}

/**
 * AI 模型智能路由器
 */
export class AIRouter {
  private providerInstances: Map<string, AIModelProvider> = new Map();
  private config: Required<RouterConfig>;
  private usageHistory: RouteUsageSummary = {
    totalCalls: 0,
    totalTokens: 0,
    byProvider: {},
  };

  /** 解码策略累计统计 */
  private decodeStats: {
    scCalls: number;
    scTotalPaths: number;
    scAvgConfidence: number;
  } = {
    scCalls: 0,
    scTotalPaths: 0,
    scAvgConfidence: 0,
  };

  constructor(config: RouterConfig) {
    this.config = {
      providers: config.providers,
      routingRules: { ...DEFAULT_ROUTING_RULES, ...config.routingRules },
      maxRetries: config.maxRetries ?? 2,
      trackUsage: config.trackUsage ?? true,
      enableDecodeLayer: config.enableDecodeLayer ?? true,
      defaultDecodeStrategy: config.defaultDecodeStrategy ?? resolveDecodeStrategy({ type: "sampling" }),
    };

    this.initProviders();
  }

  private initProviders(): void {
    const factories: Record<string, (c: ProviderConfig) => AIModelProvider> = {
      kimi: createKimiProvider,
      deepseek: createDeepSeekProvider,
      openai: createOpenAIProvider,
      gemini: createGeminiProvider,
      ollama: createOllamaProvider,
    };

    for (const [name, providerConfig] of Object.entries(this.config.providers)) {
      const factory = factories[name];
      if (!factory) {
        console.warn(`[AI Router] Unknown provider: ${name}, skipping`);
        continue;
      }

      if (!providerConfig.apiKey) {
        console.warn(`[AI Router] No API key for ${name}, skipping`);
        continue;
      }

      try {
        const instance = factory(providerConfig);
        this.providerInstances.set(name, instance);
        // console.log(`[AI Router] Provider registered: ${name}`);
      } catch (error) {
        console.error(`[AI Router] Failed to init ${name}:`, error);
      }
    }
  }

  /**
   * 获取可用的 provider 列表
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providerInstances.keys());
  }

  /**
   * 判断某个 provider 是否可用
   */
  isProviderAvailable(name: string): boolean {
    return this.providerInstances.has(name);
  }

  /**
   * 获取指定 provider 实例
   */
  getProvider(name: string): AIModelProvider | null {
    return this.providerInstances.get(name) ?? null;
  }

  /**
   * 做路由决策（不解耦实际调用，用于调试/日志）
   */
  decideRoute(taskType: TaskType, preferredProvider?: string): RoutingDecision {
    const rules = this.config.routingRules[taskType] || this.config.routingRules.default || [];
    const chain = preferredProvider
      ? [preferredProvider, ...rules.filter((p) => p !== preferredProvider)]
      : rules;

    // 过滤出实际可用的 provider
    const availableChain = chain.filter((name) => this.isProviderAvailable(name));

    const selected = availableChain[0] || "none";
    const fallbackChain = availableChain.slice(1);

    const provider = this.getProvider(selected);
    const model = provider?.config.model ?? "unknown";

    return {
      taskType,
      provider: selected,
      model,
      reason: preferredProvider
        ? `User preferred ${preferredProvider}, fallback chain: [${fallbackChain.join(", ")}]`
        : `Auto-selected by task type "${taskType}", fallback chain: [${fallbackChain.join(", ")}]`,
      fallbackChain,
    };
  }

  /**
   * 带自动降级的非流式调用
   * 新增：集成 Decode 策略层（greedy / sampling / self-consistency）
   */
  async chat(
    messages: ChatMessage[],
    taskType: TaskType = "default",
    options: ChatOptions & { preferredProvider?: string } = {},
  ): Promise<ChatResponse> {
    const { preferredProvider, ...chatOptions } = options;
    const decision = this.decideRoute(taskType, preferredProvider);
    const fallbackChain = [decision.provider, ...decision.fallbackChain];

    // 解析解码策略
    const decodeStrategy = this.resolveStrategy(chatOptions.decodeStrategy, taskType);
    const isSC = decodeStrategy.type === "self-consistency";

    let lastError: Error | null = null;

    for (let i = 0; i < fallbackChain.length && i < this.config.maxRetries; i++) {
      const providerName = fallbackChain[i];
      const provider = this.getProvider(providerName);

      if (!provider) {
        console.warn(`[AI Router] Provider ${providerName} unavailable, trying next...`);
        continue;
      }

      try {
        // console.log(
        //   `[AI Router] Using ${providerName} for ${taskType} | Strategy: ${strategyToLabel(decodeStrategy)}`,
        // );

        let response: ChatResponse;

        if (isSC && this.config.enableDecodeLayer) {
          // Self-Consistency：多路径采样 + 投票
          const scResult = await runSelfConsistency(
            provider,
            messages,
            { ...chatOptions, temperature: decodeStrategy.temperature, maxTokens: decodeStrategy.maxTokens },
            decodeStrategy,
          );

          response = scResultToChatResponse(scResult, providerName, provider.config.model || "unknown");

          // 更新 SC 统计
          this.decodeStats.scCalls += 1;
          this.decodeStats.scTotalPaths += scResult.paths.length;
          this.decodeStats.scAvgConfidence =
            (this.decodeStats.scAvgConfidence * (this.decodeStats.scCalls - 1) + scResult.confidence) /
            this.decodeStats.scCalls;
        } else {
          // Greedy / Sampling：单次调用
          const finalOptions: ChatOptions = {
            ...chatOptions,
            temperature: decodeStrategy.temperature,
            maxTokens: decodeStrategy.maxTokens ?? chatOptions.maxTokens,
            topP: decodeStrategy.topP ?? chatOptions.topP,
          };
          response = await provider.chat(messages, finalOptions);
        }

        this.recordUsage(providerName, response.usage);

        return {
          ...response,
          raw: {
            ...(response.raw as Record<string, unknown> ?? {}),
            _router: {
              provider: providerName,
              taskType,
              fallbackIndex: i,
              decision,
            },
            _decodeStrategy: decodeStrategy.type,
            _decodeLabel: strategyToLabel(decodeStrategy),
          },
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`[AI Router] ${providerName} failed:`, lastError.message);

        if (lastError.name === "AbortError") {
          throw lastError;
        }

        // 继续尝试下一个 provider
      }
    }

    throw lastError ?? new Error(`All AI providers failed for task "${taskType}"`);
  }

  /**
   * 带自动降级的流式调用
   * 返回标准化 SSE 格式的 AsyncGenerator
   *
   * 注意：Self-Consistency 不支持流式（需等全部路径完成才能投票），
   *       流式模式下自动降级为 sampling 策略。
   */
  async *streamChat(
    messages: ChatMessage[],
    taskType: TaskType = "default",
    options: ChatOptions & { preferredProvider?: string } = {},
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const { preferredProvider, ...chatOptions } = options;
    const decision = this.decideRoute(taskType, preferredProvider);
    const fallbackChain = [decision.provider, ...decision.fallbackChain];

    // 流式模式不支持 SC，自动降级为 sampling
    const decodeStrategy = this.resolveStrategy(chatOptions.decodeStrategy, taskType);
    const streamingStrategy: DecodeStrategy =
      decodeStrategy.type === "self-consistency"
        ? { type: "sampling", temperature: decodeStrategy.temperature, topP: decodeStrategy.topP, maxTokens: decodeStrategy.maxTokens }
        : decodeStrategy;

    let lastError: Error | null = null;

    for (let i = 0; i < fallbackChain.length && i < this.config.maxRetries; i++) {
      const providerName = fallbackChain[i];
      const provider = this.getProvider(providerName);

      if (!provider) {
        console.warn(`[AI Router] Provider ${providerName} unavailable, trying next...`);
        continue;
      }

      try {
        // console.log(`[AI Router] Streaming with ${providerName} for ${taskType} | Strategy: ${strategyToLabel(streamingStrategy)}`);

        const finalOptions: ChatOptions = {
          ...chatOptions,
          temperature: streamingStrategy.temperature,
          maxTokens: streamingStrategy.maxTokens ?? chatOptions.maxTokens,
          topP: streamingStrategy.topP ?? chatOptions.topP,
        };

        const generator = provider.streamChat(messages, finalOptions);

        for await (const chunk of generator) {
          yield chunk;
        }

        // 流结束后记录用量
        const usage = provider.getUsage();
        if (usage) {
          this.recordUsage(providerName, usage);
        }

        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`[AI Router] ${providerName} stream failed:`, lastError.message);

        if (lastError.name === "AbortError") {
          throw lastError;
        }

        // 对于流式输出，降级时需要发送降级通知
        if (i < fallbackChain.length - 1 && i < this.config.maxRetries - 1) {
          yield {
            content: `\n\n[系统提示: ${providerName} 响应异常，正在切换至 ${fallbackChain[i + 1]}...]\n\n`,
            done: false,
          };
        }
      }
    }

    // 所有 provider 都失败了
    yield {
      content: `\n\n[错误: 所有 AI 模型均不可用，请检查 API Key 配置或稍后重试]\n`,
      done: true,
      finishReason: "error",
    };

    throw lastError ?? new Error(`All AI providers failed for streaming task "${taskType}"`);
  }

  /**
   * 获取指定任务的解码策略成本估算
   */
  estimateTaskCost(
    promptText: string,
    taskType: TaskType = "default",
    strategy?: DecodeStrategy,
    preferredProvider?: string,
  ): CostEstimate | null {
    const decision = this.decideRoute(taskType, preferredProvider);
    const provider = this.getProvider(decision.provider);
    if (!provider) return null;

    const resolved = this.resolveStrategy(strategy, taskType);
    return estimateCost(promptText, provider.config.model || "unknown", resolved);
  }

  /**
   * 获取解码策略统计
   */
  getDecodeStats(): typeof this.decodeStats {
    return { ...this.decodeStats };
  }

  /**
   * 解析最终解码策略（用户指定 → 任务推荐 → 全局默认 → sampling）
   */
  private resolveStrategy(
    userStrategy?: DecodeStrategy,
    taskType: TaskType = "default",
  ): DecodeStrategy {
    if (userStrategy) {
      return resolveDecodeStrategy(userStrategy);
    }
    if (this.config.defaultDecodeStrategy) {
      return resolveDecodeStrategy(this.config.defaultDecodeStrategy);
    }
    return resolveDecodeStrategy({ type: recommendStrategyForTask(taskType) });
  }

  /**
   * 简易调用：传入 systemPrompt + userMessage，自动包装为 messages[]
   * 向后兼容现有 ai-service-v3/client.ts 的 callAI() 签名
   */
  async call(
    systemPrompt: string,
    userMessage: string,
    taskType: TaskType = "default",
    options?: ChatOptions & { preferredProvider?: string },
  ): Promise<string | null> {
    const messages = normalizeMessages(systemPrompt, userMessage);
    try {
      const response = await this.chat(messages, taskType, options);
      return response.content;
    } catch (error) {
      console.error("[AI Router] call() failed:", error);
      return null;
    }
  }

  /**
   * 流式调用的 SSE 包装版本
   * 直接返回 SSE 字符串流
   */
  async *streamSSE(
    messages: ChatMessage[],
    taskType: TaskType = "default",
    options?: ChatOptions & { preferredProvider?: string },
  ): AsyncGenerator<string, void, unknown> {
    for await (const chunk of this.streamChat(messages, taskType, options)) {
      yield formatSSE(chunk);
    }
    yield "data: [DONE]\n\n";
  }

  private recordUsage(providerName: string, usage: TokenUsage | undefined): void {
    if (!this.config.trackUsage || !usage) return;

    this.usageHistory.totalCalls += 1;
    this.usageHistory.totalTokens += usage.totalTokens;

    if (!this.usageHistory.byProvider[providerName]) {
      this.usageHistory.byProvider[providerName] = { calls: 0, tokens: 0 };
    }
    this.usageHistory.byProvider[providerName].calls += 1;
    this.usageHistory.byProvider[providerName].tokens += usage.totalTokens;
  }

  /**
   * 获取累计用量统计
   */
  getUsageSummary(): RouteUsageSummary {
    return { ...this.usageHistory };
  }

  /**
   * 重置用量统计
   */
  resetUsage(): void {
    this.usageHistory = {
      totalCalls: 0,
      totalTokens: 0,
      byProvider: {},
    };
  }
}

/**
 * 快捷工厂函数：根据环境变量创建默认路由器
 */
export function createDefaultRouter(): AIRouter {
  return new AIRouter({
    providers: {
      kimi: {
        apiKey: process.env.KIMI_API_KEY || "",
        baseUrl: process.env.KIMI_OPEN_URL || "https://api.moonshot.cn",
        model: process.env.KIMI_MODEL || "moonshot-v1-8k",
      },
      deepseek: {
        apiKey: process.env.DEEPSEEK_API_KEY || "",
        baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      },
      openai: {
        apiKey: process.env.OPENAI_API_KEY || "",
        baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com",
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      },
      gemini: {
        apiKey: process.env.GEMINI_API_KEY || "",
        baseUrl: process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com",
        model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
      },
      ollama: {
        apiKey: "", // Ollama runs locally, no API key needed
        baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
        model: process.env.OLLAMA_MODEL || "llama3.2",
      },
    },
  });
}
