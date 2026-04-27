/**
 * DeepSeek Provider —— DeepSeek API 适配
 * API 文档: https://api-docs.deepseek.com/
 * 兼容 OpenAI 标准接口格式
 */

import {
  type AIModelProvider,
  type ChatMessage,
  type ChatOptions,
  type ChatResponse,
  type ModelCapabilities,
  type ProviderConfig,
  type StreamChunk,
  type TokenUsage,
  estimateTokens,
} from "../provider";

const DEFAULT_MODEL = "deepseek-chat";
const DEFAULT_BASE_URL = "https://api.deepseek.com";

export class DeepSeekProvider implements AIModelProvider {
  public readonly name = "deepseek";
  public readonly config: ProviderConfig;
  private lastUsage: TokenUsage | null = null;

  constructor(config: ProviderConfig) {
    this.config = {
      baseUrl: DEFAULT_BASE_URL,
      model: DEFAULT_MODEL,
      timeout: 60_000,
      ...config,
    };
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResponse> {
    const model = options.model || this.config.model || DEFAULT_MODEL;
    const url = `${this.config.baseUrl}/v1/chat/completions`;

    const promptTokens = messages.reduce(
      (sum, m) => sum + estimateTokens(m.content),
      0,
    );

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4000,
        top_p: options.topP,
        stop: options.stopSequences,
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`DeepSeek API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as Record<string, unknown>;
    const choices = data.choices as Array<Record<string, unknown>> | undefined;
    const message = choices?.[0]?.message as Record<string, unknown> | undefined;
    const content = (message?.content as string) || "";
    const finishReason = (choices?.[0]?.finish_reason as string) || "stop";

    const usageData = data.usage as Record<string, number> | undefined;
    this.lastUsage = {
      promptTokens: usageData?.prompt_tokens ?? promptTokens,
      completionTokens: usageData?.completion_tokens ?? estimateTokens(content),
      totalTokens: usageData?.total_tokens ?? promptTokens + estimateTokens(content),
    };

    return {
      content,
      model,
      provider: this.name,
      usage: this.lastUsage,
      finishReason,
      raw: data,
    };
  }

  async *streamChat(
    messages: ChatMessage[],
    options: ChatOptions = {},
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const model = options.model || this.config.model || DEFAULT_MODEL;
    const url = `${this.config.baseUrl}/v1/chat/completions`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4000,
        top_p: options.topP,
        stream: true,
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`DeepSeek stream error ${response.status}: ${text}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("DeepSeek stream: no response body");

    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";
    let finishReason: string | undefined;
    let usage: TokenUsage | undefined;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;
          const dataStr = trimmed.slice(5).trim();

          if (dataStr === "[DONE]") {
            yield { content: "", done: true, usage, finishReason };
            return;
          }

          try {
            const data = JSON.parse(dataStr) as Record<string, unknown>;
            const choices = data.choices as Array<Record<string, unknown>> | undefined;
            const delta = choices?.[0]?.delta as Record<string, unknown> | undefined;
            const deltaContent = delta?.content as string | undefined;
            const reasoningContent = delta?.reasoning_content as string | undefined;
            finishReason = (choices?.[0]?.finish_reason as string) || finishReason;

            // DeepSeek 支持 reasoning_content（思维链内容）
            const totalContent = (deltaContent || "") + (reasoningContent || "");
            if (totalContent) {
              fullContent += totalContent;
              if (options.onToken) options.onToken(totalContent);
              yield { content: totalContent, done: false };
            }

            const usageData = data.usage as Record<string, number> | undefined;
            if (usageData) {
              usage = {
                promptTokens: usageData.prompt_tokens ?? 0,
                completionTokens: usageData.completion_tokens ?? 0,
                totalTokens: usageData.total_tokens ?? 0,
              };
            }
          } catch {
            // ignore malformed JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    this.lastUsage = usage || {
      promptTokens: messages.reduce((s, m) => s + estimateTokens(m.content), 0),
      completionTokens: estimateTokens(fullContent),
      totalTokens: 0,
    };
    if (this.lastUsage.totalTokens === 0) {
      this.lastUsage.totalTokens = this.lastUsage.promptTokens + this.lastUsage.completionTokens;
    }

    yield { content: "", done: true, usage: this.lastUsage, finishReason };
  }

  async detectCapability(): Promise<ModelCapabilities> {
    try {
      const response = await fetch(`${this.config.baseUrl}/v1/models`, {
        headers: { Authorization: `Bearer ${this.config.apiKey}` },
      });

      if (!response.ok) {
        return this.getFallbackCapabilities();
      }

      const data = (await response.json()) as { data?: Array<{ id: string }> };
      const models = data.data?.map((m) => m.id) || [DEFAULT_MODEL];

      return {
        streaming: true,
        toolCalling: true,
        vision: models.some((m) => m.includes("vision")),
        jsonMode: true,
        maxContextLength: 64_000, // deepseek-chat context length
        supportedModels: models,
      };
    } catch {
      return this.getFallbackCapabilities();
    }
  }

  private getFallbackCapabilities(): ModelCapabilities {
    return {
      streaming: true,
      toolCalling: true,
      vision: false,
      jsonMode: true,
      maxContextLength: 64_000,
      supportedModels: ["deepseek-chat", "deepseek-coder", "deepseek-reasoner"],
    };
  }

  getUsage(): TokenUsage | null {
    return this.lastUsage;
  }
}

export function createDeepSeekProvider(config: ProviderConfig): DeepSeekProvider {
  return new DeepSeekProvider(config);
}
