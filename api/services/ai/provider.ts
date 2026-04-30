/**
 * AI-1: 统一 AI 模型 Provider 抽象层
 * 所有模型实现必须遵循此接口
 */

export type MessageRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: MessageRole;
  content: string;
  name?: string; // for tool/function calls
}

import type { DecodeStrategy } from "./decoding-strategies";

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
  /** 解码策略配置（新增：greedy / sampling / self-consistency） */
  decodeStrategy?: DecodeStrategy;
  // Optional callbacks for streaming
  onToken?: (token: string) => void;
  // Abort signal
  signal?: AbortSignal;
}

export interface ChatResponse {
  content: string;
  model: string;
  provider: string;
  usage?: TokenUsage;
  finishReason?: string;
  // Raw response for debugging
  raw?: unknown;
}

export interface StreamChunk {
  content: string;
  done: boolean;
  usage?: TokenUsage;
  finishReason?: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ModelCapabilities {
  streaming: boolean;
  toolCalling: boolean;
  vision: boolean;
  jsonMode: boolean;
  maxContextLength: number;
  supportedModels: string[];
}

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  timeout?: number;
}

/**
 * 统一的 AI 模型 Provider 接口
 * 所有模型（Kimi/DeepSeek/OpenAI/Gemini/Claude）必须实现此接口
 */
export interface AIModelProvider {
  /** Provider 唯一标识 */
  readonly name: string;

  /** 当前配置 */
  readonly config: ProviderConfig;

  /**
   * 非流式对话补全
   * @param messages 对话消息列表
   * @param options 可选参数
   * @returns 完整的对话响应
   */
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;

  /**
   * 流式对话补全
   * 返回标准化的 SSE 格式流
   * @param messages 对话消息列表
   * @param options 可选参数
   * @returns 异步迭代器，每次 yield 一个 StreamChunk
   */
  streamChat(
    messages: ChatMessage[],
    options?: ChatOptions,
  ): AsyncGenerator<StreamChunk, void, unknown>;

  /**
   * 检测模型能力
   * 尝试调用一次轻量级 API 来判断该 provider 是否可用及其能力
   */
  detectCapability(): Promise<ModelCapabilities>;

  /**
   * 获取最近一次调用的 Token 用量
   */
  getUsage(): TokenUsage | null;
}

/**
 * Provider 构建器 —— 简化各 provider 的实例化
 */
export type ProviderFactory = (config: ProviderConfig) => AIModelProvider;

/**
 * 通用 SSE 格式化器 —— 将各模型的流式输出统一为标准 SSE
 */
export function formatSSE(chunk: StreamChunk): string {
  return `data: ${JSON.stringify({
    content: chunk.content,
    done: chunk.done,
    ...(chunk.usage ? { usage: chunk.usage } : {}),
    ...(chunk.finishReason ? { finishReason: chunk.finishReason } : {}),
  })}\n\n`;
}

/**
 * SSE 结束标记
 */
export const SSE_DONE = "data: [DONE]\n\n";

/**
 * 将 OpenAI 风格的 ChatCompletion 格式解析为统一 ChatMessage[]
 */
export function normalizeMessages(
  systemPrompt?: string,
  userMessage?: string,
  history?: ChatMessage[],
): ChatMessage[] {
  const messages: ChatMessage[] = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  if (history && history.length > 0) {
    messages.push(...history);
  }

  if (userMessage) {
    messages.push({ role: "user", content: userMessage });
  }

  return messages;
}

/**
 * 统计估算 Token 数（基于字符的简单估算）
 * 各 provider 可根据自身 tokenizer 覆盖此方法
 */
export function estimateTokens(text: string): number {
  // 中文字符 ≈ 1 token，英文按空格分词 ≈ 0.75 tokens/word
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const nonChineseChars = text.length - chineseChars;
  return Math.ceil(chineseChars + nonChineseChars * 0.4);
}
