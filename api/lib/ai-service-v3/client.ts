import type { DecodeStrategy } from "../../services/ai/decoding-strategies";
import { resolveDecodeStrategy } from "../../services/ai/decoding-strategies";
import { native } from "../native";

const MODEL_CONFIGS: Record<
  string,
  { baseUrl: string; modelId: string; name: string }
> = {
  kimi: {
    baseUrl: "https://api.moonshot.cn/v1/chat/completions",
    modelId: "moonshot-v1-8k",
    name: "Kimi",
  },
  openai: {
    baseUrl: "https://api.openai.com/v1/chat/completions",
    modelId: "gpt-4o-mini",
    name: "OpenAI",
  },
  claude: {
    baseUrl: "https://api.anthropic.com/v1/messages",
    modelId: "claude-3-sonnet-20240229",
    name: "Claude",
  },
  deepseek: {
    baseUrl: "https://api.deepseek.com/v1/chat/completions",
    modelId: "deepseek-chat",
    name: "DeepSeek",
  },
  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
    modelId: "gemini-1.5-flash",
    name: "Gemini",
  },
  ollama: {
    baseUrl: "http://localhost:11434/v1/chat/completions",
    modelId: "llama3.1",
    name: "Ollama",
  },
};

const AI_CALL_TIMEOUT_MS = 20000

/** Wrap any promise with a JS-level timeout — protects against native/Rust hangs */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    promise.then(
      (v) => { clearTimeout(timer); resolve(v) },
      (e) => { clearTimeout(timer); reject(e) },
    )
  })
}

function fetchWithTimeout(url: string, opts: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(timer))
}

/**
 * 对同一 prompt 进行多次采样并投票（Self-Consistency 轻量实现）
 */
async function runSelfConsistencyCallAI(
  provider: string,
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  sampleCount: number,
  temperature: number,
): Promise<string | null> {
  // console.log(`[callAI SC] Running ${sampleCount} paths for ${provider}`);

  const config = MODEL_CONFIGS[provider];
  if (!config) {
    console.error(`Unknown provider: ${provider}`);
    return null;
  }

  const req = {
    provider,
    apiKey,
    modelId: config.modelId,
    baseUrl: config.baseUrl,
    systemPrompt,
    userMessage,
    temperature,
    maxTokens: 4000,
    timeoutMs: AI_CALL_TIMEOUT_MS,
  };
  const result = await withTimeout(native.aiCallSelfConsistency(req, sampleCount) as Promise<{ content?: string; error?: string; results?: Array<{ content?: string }>; successfulCount?: number }>, AI_CALL_TIMEOUT_MS + 5000, "aiCallSelfConsistency");
  // Normalize: Rust returns {content, error}, polyfill returns {results[], count, successfulCount}
  const content = result.content ?? result.results?.[0]?.content;
  const error = result.error ?? (result.successfulCount === 0 ? "All self-consistency paths failed" : undefined);
  if (error) {
    console.error(`[callAI SC] ${provider} error: ${error}`);
    return null;
  }
  return content || null;
}

/**
 * 单次 AI 调用（原 callAI 的核心逻辑）
 */
/**
 * Single AI call with provider-specific request format.
 * Claude uses Anthropic API format; all others use OpenAI-compatible format.
 */
async function callAISingle(
  provider: string,
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  temperature = 0.5,
): Promise<string | null> {
  // console.log("[AI] callAISingle", { provider, hasKey: !!apiKey, msgLen: userMessage.length })
  if (!apiKey) {
    console.warn(`No API key for ${provider}`);
    return null;
  }

  const config = MODEL_CONFIGS[provider];
  if (!config) {
    console.error(`Unknown provider: ${provider}`);
    return null;
  }

  // Claude uses Anthropic Messages API — different body & headers from OpenAI format
  if (provider === "claude") {
    try {
      const response = await fetchWithTimeout(config.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: config.modelId,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
          max_tokens: 4000,
          temperature,
        }),
      }, AI_CALL_TIMEOUT_MS);

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        console.error(`Claude error ${response.status}: ${errText}`);
        return null;
      }

      const data = (await response.json()) as Record<string, unknown>;
      const contentArr = data.content as Array<Record<string, unknown>> | undefined;
      return (contentArr?.[0]?.text as string) || null;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(JSON.stringify({
        level: "error",
        component: "ai-service-v3",
        operation: "callAISingle",
        provider,
        error: msg,
        timestamp: new Date().toISOString(),
      }));
      return null;
    }
  }

  // OpenAI-compatible providers: openai, kimi, deepseek, gemini, ollama
  try {
    const req = {
      provider,
      apiKey,
      modelId: config.modelId,
      baseUrl: config.baseUrl,
      systemPrompt,
      userMessage,
      temperature,
      maxTokens: 4000,
      timeoutMs: AI_CALL_TIMEOUT_MS,
    };
    const result = await withTimeout(native.aiCall(req) as Promise<{ content?: string; error?: string }>, AI_CALL_TIMEOUT_MS, "aiCall");
    if (result.error) {
      console.error(`${provider} error: ${result.error}`);
      return null;
    }
    return result.content || null;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    // Structured error logging for observability
    console.error(JSON.stringify({
      level: "error",
      component: "ai-service-v3",
      operation: "callAISingle",
      provider,
      error: msg,
      timestamp: new Date().toISOString(),
    }));
    return null;
  }
}

/**
 * 统一 AI 调用入口（向后兼容 + Decode 策略感知）
 *
 * 新增 decodeStrategy 参数后：
 *  - greedy:     temperature 强制为 0，单次调用
 *  - sampling:   使用策略 temperature，单次调用
 *  - self-consistency: 多路径采样 + 投票
 */
// ============================================================================
// Vision 支持（多模态图片分析）
// ============================================================================

function extractBase64Parts(dataUri: string): { mediaType: string; base64: string } {
  const match = dataUri.match(/^data:([\w/]+);base64,(.+)$/);
  if (match) {
    return { mediaType: match[1], base64: match[2] };
  }
  return { mediaType: "image/jpeg", base64: dataUri };
}

async function callVisionSingle(
  provider: string,
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  imageData: string,
  temperature = 0.5,
): Promise<string | null> {
  if (!apiKey) {
    console.warn(`No API key for ${provider}`);
    return null;
  }

  const config = MODEL_CONFIGS[provider];
  if (!config) {
    console.error(`Unknown provider: ${provider}`);
    return null;
  }

  try {
    if (provider === "claude") {
      const { mediaType, base64 } = extractBase64Parts(imageData);
      const response = await fetchWithTimeout(config.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: config.modelId,
          max_tokens: 4000,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: [
                { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
                { type: "text", text: userMessage },
              ],
            },
          ],
          temperature,
        }),
      }, AI_CALL_TIMEOUT_MS);
      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        console.error(`Claude vision error ${response.status}: ${errText}`);
        return null;
      }
      const data = (await response.json()) as Record<string, unknown>;
      return (
        ((data.content as Array<Record<string, unknown>> | undefined)?.[0]
          ?.text as string) || null
      );
    }

    // OpenAI-compatible: openai, kimi, deepseek
    const response = await fetchWithTimeout(config.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.modelId,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userMessage },
              { type: "image_url", image_url: { url: imageData } },
            ],
          },
        ],
        temperature,
        max_tokens: 4000,
      }),
    }, AI_CALL_TIMEOUT_MS);
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error(`${provider} vision error ${response.status}: ${errText}`);
      return null;
    }
    const data = (await response.json()) as Record<string, unknown>;
    const choices = data.choices as Array<Record<string, unknown>> | undefined;
    return ((choices?.[0]?.message as Record<string, unknown>)?.content as string) || null;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`${provider} vision API call failed: ${msg}`);
    return null;
  }
}

export async function callAIVision(
  provider: string,
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  imageData: string,
  temperature = 0.5,
): Promise<string | null> {
  return callVisionSingle(provider, apiKey, systemPrompt, userMessage, imageData, temperature);
}

export async function callAI(
  provider: string,
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  temperature = 0.5,
  decodeStrategy?: DecodeStrategy,
): Promise<string | null> {
  const strategy = decodeStrategy ? resolveDecodeStrategy(decodeStrategy) : null;

  if (!strategy) {
    return callAISingle(provider, apiKey, systemPrompt, userMessage, temperature);
  }

  switch (strategy.type) {
    case "greedy":
      return callAISingle(provider, apiKey, systemPrompt, userMessage, 0);

    case "sampling":
      return callAISingle(
        provider,
        apiKey,
        systemPrompt,
        userMessage,
        strategy.temperature ?? temperature,
      );

    case "self-consistency": {
      return runSelfConsistencyCallAI(
        provider,
        apiKey,
        systemPrompt,
        userMessage,
        strategy.sampleCount ?? 5,
        strategy.temperature ?? temperature,
      );
    }

    default:
      return callAISingle(provider, apiKey, systemPrompt, userMessage, temperature);
  }
}
