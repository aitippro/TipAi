/**
 * Kimi Provider —— Moonshot API 适配
 * API 文档: https://platform.moonshot.cn/docs/api/chat
 */

import { type ModelCapabilities, type ProviderConfig } from "../provider";
import { OpenAICompatibleProvider, type ProviderOptions } from "./base";

const OPTIONS: ProviderOptions = {
  name: "kimi",
  defaultModel: "moonshot-v1-8k",
  defaultBaseUrl: "https://api.moonshot.cn",
  defaultTemperature: 0.5,
  needsAuth: true,
  supportsReasoning: false,
  errorPrefix: "Kimi",
};

export class KimiProvider extends OpenAICompatibleProvider {
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
        maxContextLength: 200_000,
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
      supportedModels: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k", "moonshot-v1-auto"],
    };
  }
}

export function createKimiProvider(config: ProviderConfig): KimiProvider {
  return new KimiProvider(config);
}
