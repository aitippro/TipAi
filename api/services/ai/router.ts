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
} from "./providers";

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
  chat: ["kimi", "openai", "deepseek", "gemini"],
  analysis: ["deepseek", "kimi", "openai", "gemini"],
  code: ["deepseek", "openai", "kimi", "gemini"],
  creative: ["openai", "kimi", "deepseek", "gemini"],
  optimization: ["openai", "deepseek", "kimi", "gemini"],
  classification: ["kimi", "openai", "deepseek", "gemini"],
  default: ["kimi", "openai", "deepseek", "gemini"],
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

  constructor(config: RouterConfig) {
    this.config = {
      providers: config.providers,
      routingRules: { ...DEFAULT_ROUTING_RULES, ...config.routingRules },
      maxRetries: config.maxRetries ?? 2,
      trackUsage: config.trackUsage ?? true,
    };

    this.initProviders();
  }

  private initProviders(): void {
    const factories: Record<string, (c: ProviderConfig) => AIModelProvider> = {
      kimi: createKimiProvider,
      deepseek: createDeepSeekProvider,
      openai: createOpenAIProvider,
      gemini: createGeminiProvider,
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
        console.log(`[AI Router] Provider registered: ${name}`);
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
   */
  async chat(
    messages: ChatMessage[],
    taskType: TaskType = "default",
    options: ChatOptions & { preferredProvider?: string } = {},
  ): Promise<ChatResponse> {
    const { preferredProvider, ...chatOptions } = options;
    const decision = this.decideRoute(taskType, preferredProvider);
    const fallbackChain = [decision.provider, ...decision.fallbackChain];

    let lastError: Error | null = null;

    for (let i = 0; i < fallbackChain.length && i < this.config.maxRetries; i++) {
      const providerName = fallbackChain[i];
      const provider = this.getProvider(providerName);

      if (!provider) {
        console.warn(`[AI Router] Provider ${providerName} unavailable, trying next...`);
        continue;
      }

      try {
        console.log(`[AI Router] Using ${providerName} for ${taskType}`);
        const response = await provider.chat(messages, chatOptions);

        this.recordUsage(providerName, response.usage);

        return {
          ...response,
          // 在响应中注入路由元信息，方便前端展示
          raw: {
            ...(response.raw as Record<string, unknown> ?? {}),
            _router: {
              provider: providerName,
              taskType,
              fallbackIndex: i,
              decision,
            },
          },
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`[AI Router] ${providerName} failed:`, lastError.message);

        // 如果是用户取消（Abort），不重试
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
   */
  async *streamChat(
    messages: ChatMessage[],
    taskType: TaskType = "default",
    options: ChatOptions & { preferredProvider?: string } = {},
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const { preferredProvider, ...chatOptions } = options;
    const decision = this.decideRoute(taskType, preferredProvider);
    const fallbackChain = [decision.provider, ...decision.fallbackChain];

    let lastError: Error | null = null;

    for (let i = 0; i < fallbackChain.length && i < this.config.maxRetries; i++) {
      const providerName = fallbackChain[i];
      const provider = this.getProvider(providerName);

      if (!provider) {
        console.warn(`[AI Router] Provider ${providerName} unavailable, trying next...`);
        continue;
      }

      try {
        console.log(`[AI Router] Streaming with ${providerName} for ${taskType}`);
        const generator = provider.streamChat(messages, chatOptions);
        let totalContent = "";

        for await (const chunk of generator) {
          totalContent += chunk.content;
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
    },
  });
}
