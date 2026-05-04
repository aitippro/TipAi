/**
 * OpenAI-compatible Provider Base Class
 *
 * Shared base for providers using the standard OpenAI /v1/chat/completions format:
 *   - OpenAI
 *   - DeepSeek
 *   - Kimi (Moonshot)
 *   - Ollama
 *
 * NOTE: Claude is NOT OpenAI-compatible — it uses the Anthropic Messages API
 * with different request body format ({ model, system, messages, max_tokens })
 * and custom headers (x-api-key instead of Authorization: Bearer).
 * Claude API calls are handled directly in client.ts (callAISingle / callVisionSingle)
 * or through the Rust native addon (native/src/ai/client.rs → call_claude()).
 * To add Claude as a first-class AIModelProvider, create a dedicated AnthropicProvider class.
 *
 * Subclasses only need to provide configuration and capability detection.
 * Token estimation is inlined into the single message-build pass.
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

export interface ProviderOptions {
  name: string;
  defaultModel: string;
  defaultBaseUrl: string;
  defaultTimeout?: number;
  defaultTemperature?: number;
  /** Whether to send Bearer auth header (true for API-key-based providers, false for local like Ollama) */
  needsAuth?: boolean;
  /** Whether the provider emits reasoning_content in stream delta (DeepSeek) */
  supportsReasoning?: boolean;
  /** Prefix for error messages (defaults to provider name) */
  errorPrefix?: string;
  /** Whether to include stream: false in non-stream chat body */
  explicitNoStream?: boolean;
}

export abstract class OpenAICompatibleProvider implements AIModelProvider {
  public readonly name: string;
  public readonly config: ProviderConfig;
  protected lastUsage: TokenUsage | null = null;
  protected opts: ProviderOptions;

  constructor(config: ProviderConfig, opts: ProviderOptions) {
    this.name = opts.name;
    this.opts = opts;
    this.config = {
      baseUrl: opts.defaultBaseUrl,
      model: opts.defaultModel,
      timeout: opts.defaultTimeout ?? 60_000,
      ...config,
    };
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResponse> {
    const model = options.model || this.config.model || this.opts.defaultModel;
    const url = `${this.config.baseUrl}/v1/chat/completions`;

    const msgs = messages.map((m) => ({ role: m.role, content: m.content }));

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.opts.needsAuth !== false) {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }

    const body: Record<string, unknown> = {
      model,
      messages: msgs,
      temperature: options.temperature ?? this.opts.defaultTemperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4000,
      top_p: options.topP,
    };
    if (options.stopSequences) body.stop = options.stopSequences;
    if (this.opts.explicitNoStream) body.stream = false;

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: options.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${this.opts.errorPrefix || this.name} API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as Record<string, unknown>;
    const choices = data.choices as Array<Record<string, unknown>> | undefined;
    const message = choices?.[0]?.message as Record<string, unknown> | undefined;
    const content = (message?.content as string) || "";
    const finishReason = (choices?.[0]?.finish_reason as string) || "stop";

    const usageData = data.usage as Record<string, number> | undefined;
    this.lastUsage = {
      promptTokens: usageData?.prompt_tokens ?? 0,
      completionTokens: usageData?.completion_tokens ?? estimateTokens(content),
      totalTokens: usageData?.total_tokens ?? estimateTokens(content),
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
    const model = options.model || this.config.model || this.opts.defaultModel;
    const url = `${this.config.baseUrl}/v1/chat/completions`;

    const msgs = messages.map((m) => ({ role: m.role, content: m.content }));

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    };
    if (this.opts.needsAuth !== false) {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }

    const body: Record<string, unknown> = {
      model,
      messages: msgs,
      temperature: options.temperature ?? this.opts.defaultTemperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4000,
      top_p: options.topP,
      stream: true,
    };
    if (options.stopSequences) body.stop = options.stopSequences;

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: options.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${this.opts.errorPrefix || this.name} stream error ${response.status}: ${text}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error(`${this.name} stream: no response body`);

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

            let chunkContent = deltaContent || "";
            if (this.opts.supportsReasoning) {
              const reasoningContent = delta?.reasoning_content as string | undefined;
              if (reasoningContent) chunkContent += reasoningContent;
            }

            if (chunkContent) {
              fullContent += chunkContent;
              if (options.onToken) options.onToken(chunkContent);
              yield { content: chunkContent, done: false };
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

  abstract detectCapability(): Promise<ModelCapabilities>;

  getUsage(): TokenUsage | null {
    return this.lastUsage;
  }
}
