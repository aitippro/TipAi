/**
 * Gemini Provider —— Google Gemini API 适配
 * API 文档: https://ai.google.dev/gemini-api/docs
 *
 * ⚠️ TODO: 当前为 stub 实现，标记 Gemini 集成位置。
 * 实际接入时需：
 *  1. 引入 Google Generative AI SDK 或实现 REST 调用
 *  2. 适配 Gemini 的消息格式（content.parts[] 结构）
 *  3. 处理多模态输入（image/video/audio）
 *  4. 实现流式输出（Gemini 使用 server-sent events）
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

  /**
   * TODO: 实现 Gemini 非流式对话
   * Gemini API 路径: /v1beta/models/{model}:generateContent
   * 请求格式差异:
   *   - 使用 contents[] 而非 messages[]
   *   - role 为 "user" / "model"（无 system role，需通过 systemInstruction 字段传入）
   *   - content.parts[] 结构支持 text / inlineData（多模态）
   */
  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResponse> {
    const model = options.model || this.config.model || DEFAULT_MODEL;

    // 临时 stub：返回标记提示
    const stubContent = `[Gemini Stub] Provider "${this.name}" with model "${model}" is not yet fully implemented.\n\nMessages received:\n${messages.map((m) => `[${m.role}]: ${m.content.substring(0, 50)}...`).join("\n")}`;

    this.lastUsage = {
      promptTokens: messages.reduce((s, m) => s + estimateTokens(m.content), 0),
      completionTokens: estimateTokens(stubContent),
      totalTokens: 0,
    };
    this.lastUsage.totalTokens = this.lastUsage.promptTokens + this.lastUsage.completionTokens;

    return {
      content: stubContent,
      model,
      provider: this.name,
      usage: this.lastUsage,
      finishReason: "stop",
      raw: { _stub: true, message: "Gemini provider stub — not yet implemented" },
    };
  }

  /**
   * TODO: 实现 Gemini 流式对话
   * Gemini 流式 API: /v1beta/models/{model}:streamGenerateContent
   * 返回 JSON 流（非 SSE），每行一个 GenerateContentResponse
   */
  async *streamChat(
    messages: ChatMessage[],
    options: ChatOptions = {},
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const model = options.model || this.config.model || DEFAULT_MODEL;
    const stubContent = `[Gemini Stream Stub] model=${model} — streaming not yet implemented.`;

    yield { content: stubContent, done: false };

    this.lastUsage = {
      promptTokens: messages.reduce((s, m) => s + estimateTokens(m.content), 0),
      completionTokens: estimateTokens(stubContent),
      totalTokens: 0,
    };
    this.lastUsage.totalTokens = this.lastUsage.promptTokens + this.lastUsage.completionTokens;

    yield { content: "", done: true, usage: this.lastUsage, finishReason: "stop" };
  }

  async detectCapability(): Promise<ModelCapabilities> {
    // TODO: 实现真实的能力探测（调用 /v1beta/models/{model}）
    return this.getFallbackCapabilities();
  }

  private getFallbackCapabilities(): ModelCapabilities {
    return {
      streaming: true,   // Gemini 支持流式
      toolCalling: true,  // Gemini 1.5 Pro/Flash 支持 function calling
      vision: true,       // Gemini 原生支持多模态
      jsonMode: true,     // 通过 responseMimeType: "application/json"
      maxContextLength: 1_000_000, // Gemini 1.5 支持 1M token context
      supportedModels: [
        "gemini-1.5-flash",
        "gemini-1.5-flash-8b",
        "gemini-1.5-pro",
        "gemini-1.0-pro",
        "gemini-1.0-pro-vision",
      ],
    };
  }

  getUsage(): TokenUsage | null {
    return this.lastUsage;
  }
}

export function createGeminiProvider(config: ProviderConfig): GeminiProvider {
  return new GeminiProvider(config);
}
