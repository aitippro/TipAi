/**
 * OpenAI Provider —— OpenAI API 适配
 * 兼容标准 OpenAI / Azure / 兼容接口
 */

import { type ModelCapabilities, type ProviderConfig } from "../provider";
import { OpenAICompatibleProvider, type ProviderOptions } from "./base";

const OPTIONS: ProviderOptions = {
  name: "openai",
  defaultModel: "gpt-4o-mini",
  defaultBaseUrl: "https://api.openai.com",
  defaultTemperature: 0.7,
  needsAuth: true,
  supportsReasoning: false,
  errorPrefix: "OpenAI",
};

export class OpenAIProvider extends OpenAICompatibleProvider {
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
        vision: models.some((m) => m.includes("vision") || m.includes("gpt-4o")),
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
      toolCalling: true,
      vision: true,
      jsonMode: true,
      maxContextLength: 128_000,
      supportedModels: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"],
    };
  }
}

export function createOpenAIProvider(config: ProviderConfig): OpenAIProvider {
  return new OpenAIProvider(config);
}
