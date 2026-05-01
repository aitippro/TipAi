import { eq } from "drizzle-orm";

import { userSettings, type UserSettings } from "@db/schema";

import { decrypt, encrypt } from "../../lib/crypto";
import { getDb } from "../../queries/connection";
import type { UpdatePromptForgeSettingsInput } from "./schemas";

/**
 * Infer the best default model based on user's configured API keys.
 * Priority: deepseek > kimi > openai > claude
 */
function inferDefaultModel(settings?: UserSettings): string {
  const order = ["deepseek", "kimi", "openai", "claude"];
  for (const model of order) {
    const key = getApiKey(model, settings) || process.env[`${model.toUpperCase()}_API_KEY`] || "";
    if (key) return model;
  }
  return "kimi"; // ultimate fallback
}

const DEFAULT_SETTINGS = {
  defaultModel: "kimi",
  defaultFramework: "auto",
  defaultLanguage: "zh",
} as const;

type PromptForgeSettingsResponse = {
  defaultModel: string;
  defaultFramework: string;
  defaultLanguage: string;
  hasKimiKey: boolean;
  hasOpenAIKey: boolean;
  hasClaudeKey: boolean;
  hasDeepSeekKey: boolean;
};

function mapSettingsResponse(settings?: UserSettings): PromptForgeSettingsResponse {
  if (!settings) {
    return {
      ...DEFAULT_SETTINGS,
      hasKimiKey: false,
      hasOpenAIKey: false,
      hasClaudeKey: false,
      hasDeepSeekKey: false,
    };
  }

  // Always use the first available model with a valid key as default.
  // This ensures users who configured e.g. DeepSeek don't get stuck on
  // an old invalid Kimi key sitting in the database.
  const defaultModel = inferDefaultModel(settings);

  return {
    defaultModel,
    defaultFramework: settings.defaultFramework,
    defaultLanguage: settings.defaultLanguage,
    hasKimiKey: !!settings.kimiApiKey,
    hasOpenAIKey: !!settings.openaiApiKey,
    hasClaudeKey: !!settings.claudeApiKey,
    hasDeepSeekKey: !!settings.deepseekApiKey,
  };
}

function buildSettingsUpdateData(
  input: UpdatePromptForgeSettingsInput,
  existing?: UserSettings,
): Record<string, unknown> {
  const updateData: Record<string, unknown> = {};

  if (input.defaultModel !== undefined) updateData.defaultModel = input.defaultModel;
  if (input.defaultFramework !== undefined) updateData.defaultFramework = input.defaultFramework;
  if (input.defaultLanguage !== undefined) updateData.defaultLanguage = input.defaultLanguage;

  // Track which keys are being set
  let newKimiKey: string | undefined;
  let newOpenAIKey: string | undefined;
  let newClaudeKey: string | undefined;
  let newDeepSeekKey: string | undefined;

  if (input.kimiApiKey && input.kimiApiKey.trim().length > 0 && input.kimiApiKey !== "***") {
    newKimiKey = encrypt(input.kimiApiKey.trim());
    updateData.kimiApiKey = newKimiKey;
  }
  if (input.openaiApiKey && input.openaiApiKey.trim().length > 0 && input.openaiApiKey !== "***") {
    newOpenAIKey = encrypt(input.openaiApiKey.trim());
    updateData.openaiApiKey = newOpenAIKey;
  }
  if (input.claudeApiKey && input.claudeApiKey.trim().length > 0 && input.claudeApiKey !== "***") {
    newClaudeKey = encrypt(input.claudeApiKey.trim());
    updateData.claudeApiKey = newClaudeKey;
  }
  if (input.deepseekApiKey && input.deepseekApiKey.trim().length > 0 && input.deepseekApiKey !== "***") {
    newDeepSeekKey = encrypt(input.deepseekApiKey.trim());
    updateData.deepseekApiKey = newDeepSeekKey;
  }

  // Auto-sync defaultModel when a new key is configured and current default has no key
  const currentDefaultModel = input.defaultModel ?? existing?.defaultModel ?? DEFAULT_SETTINGS.defaultModel;
  const currentDefaultKey = resolveStoredApiKey(currentDefaultModel, existing);
  if (!currentDefaultKey) {
    // Current default model has no key; pick the first newly-configured model
    if (newDeepSeekKey) updateData.defaultModel = "deepseek";
    else if (newKimiKey) updateData.defaultModel = "kimi";
    else if (newOpenAIKey) updateData.defaultModel = "openai";
    else if (newClaudeKey) updateData.defaultModel = "claude";
  }

  return updateData;
}

function getApiKey(model: string, settings?: UserSettings): string {
  if (model === "kimi" && settings?.kimiApiKey) return decrypt(settings.kimiApiKey);
  if (model === "openai" && settings?.openaiApiKey) return decrypt(settings.openaiApiKey);
  if (model === "claude" && settings?.claudeApiKey) return decrypt(settings.claudeApiKey);
  if (model === "deepseek" && settings?.deepseekApiKey) return decrypt(settings.deepseekApiKey);
  return "";
}

/** Get all available models sorted by: preferred model first, then remaining by priority */
export function getAvailableModels(settings?: UserSettings): { model: string; apiKey: string }[] {
  const result: { model: string; apiKey: string }[] = [];
  const preferred = settings?.defaultModel || "kimi";

  // Try preferred model first
  const preferredKey = getApiKey(preferred, settings) || process.env[`${preferred.toUpperCase()}_API_KEY`] || "";
  if (preferredKey) {
    result.push({ model: preferred, apiKey: preferredKey });
  }

  // Then try remaining models in priority order (deepseek first for domestic optimization)
  const remainingOrder = ["deepseek", "kimi", "openai", "claude"];
  for (const model of remainingOrder) {
    if (model === preferred) continue; // already tried
    const key = getApiKey(model, settings) || process.env[`${model.toUpperCase()}_API_KEY`] || "";
    if (key) {
      result.push({ model, apiKey: key });
    }
  }

  return result;
}

export function resolveStoredApiKey(model: string, settings?: UserSettings): string {
  return getApiKey(model, settings) || process.env[`${model.toUpperCase()}_API_KEY`] || "";
}

export async function getPromptForgeSettingsRecord(userId: number): Promise<UserSettings | undefined> {
  const [settings] = await getDb()
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId));

  return settings;
}

export async function getPromptForgeSettings(userId: number): Promise<PromptForgeSettingsResponse> {
  const settings = await getPromptForgeSettingsRecord(userId);
  if (settings) {
    return mapSettingsResponse(settings);
  }

  // New user: infer default model from env keys (no DB keys yet)
  const inferredModel = inferDefaultModel();
  await getDb().insert(userSettings).values({
    userId,
    ...DEFAULT_SETTINGS,
    defaultModel: inferredModel,
  });

  return mapSettingsResponse({
    ...DEFAULT_SETTINGS,
    defaultModel: inferredModel,
  } as unknown as UserSettings);
}

export async function updatePromptForgeSettings(
  userId: number,
  input: UpdatePromptForgeSettingsInput,
): Promise<{ success: true }> {
  const existing = await getPromptForgeSettingsRecord(userId);
  const updateData = buildSettingsUpdateData(input, existing);

  if (existing) {
    await getDb()
      .update(userSettings)
      .set(updateData)
      .where(eq(userSettings.userId, userId));
  } else {
    await getDb().insert(userSettings).values({
      userId,
      ...updateData,
    });
  }

  return { success: true };
}

export async function resolvePromptForgeModelApiKey(
  userId: number,
  requestedModel?: string,
): Promise<{ settings?: UserSettings; model: string; apiKey: string }> {
  const settings = await getPromptForgeSettingsRecord(userId);

  // Pick model: requested > inferred from keys (always prefer first available)
  let model = requestedModel || inferDefaultModel(settings);

  // Final fallback: if still no key, use first available model
  let apiKey = resolveStoredApiKey(model, settings);
  if (!apiKey) {
    const available = getAvailableModels(settings);
    if (available.length > 0) {
      model = available[0].model;
      apiKey = available[0].apiKey;
    }
  }

  return {
    settings,
    model,
    apiKey,
  };
}
