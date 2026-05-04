/**
 * DeepSeek Provider —— DeepSeek API 适配
 * API 文档: https://api-docs.deepseek.com/
 */

import { type ModelCapabilities, type ProviderConfig } from "../provider";
import { OpenAICompatibleProvider, type ProviderOptions } from "./base";

const OPTIONS: ProviderOptions = {
  name: "deepseek",
  defaultModel: "deepseek-chat",
  defaultBaseUrl: "https://api.deepseek.com",
  defaultTemperature: 0.7,
  needsAuth: true,
  supportsReasoning: true,
  errorPrefix: "DeepSeek",
};

export class DeepSeekProvider extends OpenAICompatibleProvider {
  constructor(config: ProviderConfig) {
    super(config, OPTIONS);
  }

  async detectCapability(): Promise<ModelCapabilities> {
    try {
      const response = await fetch(`${this.config.baseUrl}/v1/models`, {
        headers: { Authorization: `Bearer ${this.config.apiKey}` },
      });

      if (!response.ok) return this.getFallbackCapabilities();

      const data = (await response.json()) as { data?: Array<{ id: string }> };
      const models = data.data?.map((m) => m.id) || [OPTIONS.defaultModel];

      return {
        streaming: true,
        toolCalling: true,
        vision: models.some((m) => m.includes("vision")),
        jsonMode: true,
        maxContextLength: 64_000,
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
}

export function createDeepSeekProvider(config: ProviderConfig): DeepSeekProvider {
  return new DeepSeekProvider(config);
}
