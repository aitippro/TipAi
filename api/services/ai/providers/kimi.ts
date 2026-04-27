/**
 * Kimi Provider —— 封装现有 api/kimi/ 协议
 * 向后兼容：复用现有的 Kimi v3 调用逻辑
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

const DEFAULT_MODEL = "moonshot-v1-8k";
const DEFAULT_BASE_URL = "https://api.moonshot.cn";

export class KimiProvider implements AIModelProvider {
  public readonly name = "kimi";
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
        temperature: options.temperature ?? 0.5,
        max_tokens: options.maxTokens ?? 4000,
        top_p: options.topP,
        stop: options.stopSequences,
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Kimi API error ${response.status}: ${text}`);
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
        temperature: options.temperature ?? 0.5,
        max_tokens: options.maxTokens ?? 4000,
        top_p: options.topP,
        stream: true,
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Kimi stream error ${response.status}: ${text}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Kimi stream: no response body");

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
            finishReason = (choices?.[0]?.finish_reason as string) || finishReason;

            if (deltaContent) {
              fullContent += deltaContent;
              if (options.onToken) options.onToken(deltaContent);
              yield { content: deltaContent, done: false };
            }

            // Usage may appear in the final chunk
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
        maxContextLength: 200_000, // moonshot-v1-8k / 32k / 128k
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
      maxContextLength: 200_000,
      supportedModels: [
        "moonshot-v1-8k",
        "moonshot-v1-32k",
        "moonshot-v1-128k",
        "moonshot-v1-auto",
      ],
    };
  }

  getUsage(): TokenUsage | null {
    return this.lastUsage;
  }
}

export function createKimiProvider(config: ProviderConfig): KimiProvider {
  return new KimiProvider(config);
}
