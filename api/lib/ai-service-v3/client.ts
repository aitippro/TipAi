import { env } from "../env";

const MODEL_CONFIGS: Record<
  string,
  { baseUrl: string; modelId: string; name: string }
> = {
  kimi: {
    baseUrl: env.kimiOpenUrl + "/v1/chat/completions",
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

export async function callAI(
  provider: string,
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
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
      const response = await fetch(config.baseUrl, {
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
      });
      if (!response.ok) {
        console.error(`Claude error: ${response.status}`);
        return null;
      }
      const data = (await response.json()) as Record<string, unknown>;
      return (
        ((data.content as Array<Record<string, unknown>> | undefined)?.[0]
          ?.text as string) || null
      );
    }

    const response = await fetch(config.baseUrl, {
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
    });
    if (!response.ok) {
      console.error(`${provider} error: ${response.status}`);
      return null;
    }
    const data = (await response.json()) as Record<string, unknown>;
    const choices = data.choices as Array<Record<string, unknown>> | undefined;
    return ((choices?.[0]?.message as Record<string, unknown>)?.content as string) || null;
  } catch (error) {
    console.error(`${provider} API call failed:`, error);
    return null;
  }
}
