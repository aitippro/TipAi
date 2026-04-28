/**
 * Gemini Provider — Google Gemini API
 * API: https://ai.google.dev/gemini-api/docs
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

const DEFAULT_MODEL = "gemini-1.5-flash";
const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com";

interface GeminiContent {
  role: string;
  parts: Array<{ text?: string; inlineData?: unknown }>;
}

interface GeminiRequest {
  contents: GeminiContent[];
  systemInstruction?: { parts: Array<{ text: string }> };
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    stopSequences?: string[];
  };
}

export class GeminiProvider implements AIModelProvider {
  public readonly name = "gemini";
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

  private buildRequest(messages: ChatMessage[], options: ChatOptions): GeminiRequest {
    const systemMsg = messages.find((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system");

    const contents: GeminiContent[] = chatMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const request: GeminiRequest = { contents };
    if (systemMsg) {
      request.systemInstruction = { parts: [{ text: systemMsg.content }] };
    }
    request.generationConfig = {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 4000,
      topP: options.topP,
      stopSequences: options.stopSequences,
    };

    return request;
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResponse> {
    const model = options.model || this.config.model || DEFAULT_MODEL;
    const url = `${this.config.baseUrl}/v1beta/models/${model}:generateContent?key=${this.config.apiKey}`;

    const body = this.buildRequest(messages, options);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: options.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${text}`);
    }

    const data = (await response.json()) as Record<string, unknown>;
    const candidates = data.candidates as Array<Record<string, unknown>> | undefined;
    const candidate = candidates?.[0];
    const content = candidate?.content as Record<string, unknown> | undefined;
    const parts = content?.parts as Array<Record<string, unknown>> | undefined;
    const text = parts?.map((p) => p.text as string).filter(Boolean).join("") || "";

    const usageMeta = data.usageMetadata as Record<string, number> | undefined;
    this.lastUsage = {
      promptTokens: usageMeta?.promptTokenCount ?? 0,
      completionTokens: usageMeta?.candidatesTokenCount ?? estimateTokens(text),
      totalTokens: usageMeta?.totalTokenCount ?? 0,
    };

    return {
      content: text,
      model,
      provider: this.name,
      usage: this.lastUsage,
      finishReason: (candidate?.finishReason as string) || "STOP",
      raw: data,
    };
  }

  async *streamChat(
    messages: ChatMessage[],
    options: ChatOptions = {},
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const model = options.model || this.config.model || DEFAULT_MODEL;
    const url = `${this.config.baseUrl}/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${this.config.apiKey}`;

    const body = this.buildRequest(messages, options);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: options.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini stream error ${response.status}: ${text}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Gemini stream: no response body");

    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

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
          if (!dataStr || dataStr === "[DONE]") continue;

          try {
            const data = JSON.parse(dataStr) as Record<string, unknown>;
            const candidates = data.candidates as Array<Record<string, unknown>> | undefined;
            const candidate = candidates?.[0];
            const content = candidate?.content as Record<string, unknown> | undefined;
            const parts = content?.parts as Array<Record<string, unknown>> | undefined;
            const text = parts?.map((p) => p.text as string).filter(Boolean).join("") || "";

            if (text) {
              fullText += text;
              if (options.onToken) options.onToken(text);
              yield { content: text, done: false };
            }
          } catch {
            // ignore malformed JSON
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    this.lastUsage = {
      promptTokens: messages.reduce((s, m) => s + estimateTokens(m.content), 0),
      completionTokens: estimateTokens(fullText),
      totalTokens: 0,
    };
    this.lastUsage.totalTokens = this.lastUsage.promptTokens + this.lastUsage.completionTokens;

    yield { content: "", done: true, usage: this.lastUsage, finishReason: "STOP" };
  }

  async detectCapability(): Promise<ModelCapabilities> {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/v1beta/models/${this.config.model}?key=${this.config.apiKey}`
      );
      if (!response.ok) return this.getFallbackCapabilities();

      const data = (await response.json()) as { inputTokenLimit?: number; supportedGenerationMethods?: string[] };
      return {
        streaming: data.supportedGenerationMethods?.includes("streamGenerateContent") ?? true,
        toolCalling: data.supportedGenerationMethods?.includes("generateContent") ?? true,
        vision: true,
        jsonMode: true,
        maxContextLength: data.inputTokenLimit ?? 1_000_000,
        supportedModels: [this.config.model || DEFAULT_MODEL],
      };
    } catch {
      return this.getFallbackCapabilities();
    }
  }

  private getFallbackCapabilities(): ModelCapabilities {
    return {
      streaming: true,
      toolCalling: true,
      vision: true,
      jsonMode: true,
      maxContextLength: 1_000_000,
      supportedModels: ["gemini-1.5-flash", "gemini-1.5-pro"],
    };
  }

  getUsage(): TokenUsage | null {
    return this.lastUsage;
  }
}

export function createGeminiProvider(config: ProviderConfig): GeminiProvider {
  return new GeminiProvider(config);
}
