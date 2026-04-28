/**
 * Ollama Provider —— 本地模型接入
 * API: https://github.com/ollama/ollama/blob/main/docs/api.md
 * Supports OpenAI-compatible /v1/chat/completions endpoint (Ollama v0.5+)
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

const DEFAULT_MODEL = "llama3.2";
const DEFAULT_BASE_URL = "http://localhost:11434";

export class OllamaProvider implements AIModelProvider {
  public readonly name = "ollama";
  public readonly config: ProviderConfig;
  private lastUsage: TokenUsage | null = null;

  constructor(config: ProviderConfig) {
    this.config = {
      baseUrl: config.baseUrl || DEFAULT_BASE_URL,
      model: config.model || DEFAULT_MODEL,
      timeout: config.timeout ?? 120_000,
      ...config,
    };
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResponse> {
    const model = options.model || this.config.model || DEFAULT_MODEL;
    const url = `${this.config.baseUrl}/v1/chat/completions`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4000,
        top_p: options.topP,
        stop: options.stopSequences,
        stream: false,
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as Record<string, unknown>;
    const choices = data.choices as Array<Record<string, unknown>> | undefined;
    const message = choices?.[0]?.message as Record<string, unknown> | undefined;
    const content = (message?.content as string) || "";

    const usageData = data.usage as Record<string, number> | undefined;
    this.lastUsage = {
      promptTokens: usageData?.prompt_tokens ?? 0,
      completionTokens: usageData?.completion_tokens ?? estimateTokens(content),
      totalTokens: usageData?.total_tokens ?? 0,
    };

    return {
      content,
      model,
      provider: this.name,
      usage: this.lastUsage,
      finishReason: (choices?.[0]?.finish_reason as string) || "stop",
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
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4000,
        top_p: options.topP,
        stream: true,
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama stream error ${response.status}: ${text}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Ollama stream: no response body");

    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";
    let finishReason: string | undefined;

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
            yield { content: "", done: true, finishReason };
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

            const usageData = data.usage as Record<string, number> | undefined;
            if (usageData) {
              this.lastUsage = {
                promptTokens: usageData.prompt_tokens ?? 0,
                completionTokens: usageData.completion_tokens ?? 0,
                totalTokens: usageData.total_tokens ?? 0,
              };
            }
          } catch {
            // ignore malformed JSON
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    this.lastUsage = this.lastUsage || {
      promptTokens: messages.reduce((s, m) => s + estimateTokens(m.content), 0),
      completionTokens: estimateTokens(fullContent),
      totalTokens: 0,
    };

    yield { content: "", done: true, usage: this.lastUsage, finishReason };
  }

  async detectCapability(): Promise<ModelCapabilities> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      if (!response.ok) return this.getFallbackCapabilities();

      const data = (await response.json()) as { models?: Array<{ name: string }> };
      const models = data.models?.map((m) => m.name) || [DEFAULT_MODEL];

      return {
        streaming: true,
        toolCalling: false,
        vision: models.some((m) => m.includes("vision") || m.includes("llava")),
        jsonMode: true,
        maxContextLength: 128_000,
        supportedModels: models,
      };
    } catch {
      return this.getFallbackCapabilities();
    }
  }

  private getFallbackCapabilities(): ModelCapabilities {
    return {
      streaming: true,
      toolCalling: false,
      vision: false,
      jsonMode: true,
      maxContextLength: 128_000,
      supportedModels: [DEFAULT_MODEL],
    };
  }

  getUsage(): TokenUsage | null {
    return this.lastUsage;
  }
}

export function createOllamaProvider(config: ProviderConfig): OllamaProvider {
  return new OllamaProvider(config);
}
