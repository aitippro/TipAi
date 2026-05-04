/**
 * Ollama Provider —— 本地模型接入
 * API: https://github.com/ollama/ollama/blob/main/docs/api.md
 * Supports OpenAI-compatible /v1/chat/completions endpoint (Ollama v0.5+)
 */

import { type ModelCapabilities, type ProviderConfig } from "../provider";
import { OpenAICompatibleProvider, type ProviderOptions } from "./base";

const OPTIONS: ProviderOptions = {
  name: "ollama",
  defaultModel: "llama3.2",
  defaultBaseUrl: "http://localhost:11434",
  defaultTimeout: 120_000,
  defaultTemperature: 0.7,
  needsAuth: false,
  supportsReasoning: false,
  errorPrefix: "Ollama",
};

export class OllamaProvider extends OpenAICompatibleProvider {
  constructor(config: ProviderConfig) {
    super(config, OPTIONS);
  }

  async detectCapability(): Promise<ModelCapabilities> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      if (!response.ok) return this.getFallbackCapabilities();

      const data = (await response.json()) as { models?: Array<{ name: string }> };
      const models = data.models?.map((m) => m.name) || [OPTIONS.defaultModel];

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
      supportedModels: [OPTIONS.defaultModel],
    };
  }
}

export function createOllamaProvider(config: ProviderConfig): OllamaProvider {
  return new OllamaProvider(config);
}
