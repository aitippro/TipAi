import type { DecodeStrategy } from "../../services/ai/decoding-strategies";
import { resolveDecodeStrategy } from "../../services/ai/decoding-strategies";

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
};

const AI_CALL_TIMEOUT_MS = 20000

function fetchWithTimeout(url: string, opts: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(timer))
}

/**
 * 文本规范化（用于 Self-Consistency 投票）
 */
function normalizeVoteKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
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

  const promises: Promise<string | null>[] = [];
  for (let i = 0; i < sampleCount; i++) {
    promises.push(callAISingle(provider, apiKey, systemPrompt, userMessage, temperature));
  }

  const results = (await Promise.all(promises)).filter((r): r is string => r !== null);

  if (results.length === 0) {
    console.error("[callAI SC] All paths failed");
    return null;
  }

  // 投票：按规范化文本计数
  const voteCounts = new Map<string, { count: number; representative: string }>();
  for (const result of results) {
    const key = normalizeVoteKey(result);
    const existing = voteCounts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      voteCounts.set(key, { count: 1, representative: result });
    }
  }

  let bestKey = "";
  let bestCount = 0;
  for (const [key, val] of voteCounts) {
    if (val.count > bestCount) {
      bestKey = key;
      bestCount = val.count;
    }
  }

  const winner = voteCounts.get(bestKey);
  const confidence = Number((bestCount / results.length).toFixed(4));
  // console.log(
  //   `[callAI SC] Winner: ${bestCount}/${results.length} votes (confidence=${confidence})`,
  // );

  return winner?.representative ?? null;
}

/**
 * 单次 AI 调用（原 callAI 的核心逻辑）
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

  try {
    if (provider === "claude") {
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
          messages: [{ role: "user", content: userMessage }],
          temperature,
        }),
      }, AI_CALL_TIMEOUT_MS);
      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        console.error(`Claude error ${response.status}: ${errText}`);
        return null;
      }
      const data = (await response.json()) as Record<string, unknown>;
      return (
        ((data.content as Array<Record<string, unknown>> | undefined)?.[0]
          ?.text as string) || null
      );
    }

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
          { role: "user", content: userMessage },
        ],
        temperature,
        max_tokens: 4000,
      }),
    }, AI_CALL_TIMEOUT_MS);
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error(`${provider} error ${response.status}: ${errText}`);
      return null;
    }
    const data = (await response.json()) as Record<string, unknown>;
    const choices = data.choices as Array<Record<string, unknown>> | undefined;
    return ((choices?.[0]?.message as Record<string, unknown>)?.content as string) || null;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`${provider} API call failed: ${msg}`);
    return null;
  } finally {
    // console.log("[AI] callAISingle done", { provider })
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
