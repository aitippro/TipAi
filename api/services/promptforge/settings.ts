/* eslint-disable @typescript-eslint/no-explicit-any */

import type { UpdatePromptForgeSettingsInput } from "./schemas";
import { API_KEY_UNCHANGED } from "@contracts/constants";

// ── Native Addon ─────────────────────────────────────────
import { native } from "../../lib/native";

// Local UserSettings type (matches DB schema, camelCase)
interface UserSettings {
  userId: number;
  defaultModel: string;
  defaultFramework: string;
  defaultLanguage: string;
  kimiApiKey?: string | null;
  openaiApiKey?: string | null;
  claudeApiKey?: string | null;
  deepseekApiKey?: string | null;
}

/**
 * Infer the best default model based on user's configured API keys.
 * Priority: deepseek > kimi > openai > claude
 */
function inferDefaultModel(settings?: UserSettings): string {
  const order = ["deepseek", "kimi", "openai", "claude"];
  for (const model of order) {
    const key = resolveStoredApiKey(model, settings) || process.env[`${model.toUpperCase()}_API_KEY`] || "";
    if (key) return model;
  }
  return ""; // no key configured — caller must handle
}

const DEFAULT_SETTINGS = {
  defaultModel: "",
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

  if (input.kimiApiKey && input.kimiApiKey.trim().length > 0 && input.kimiApiKey !== API_KEY_UNCHANGED) {
    newKimiKey = input.kimiApiKey.trim();
    updateData.kimiApiKey = newKimiKey;
  }
  if (input.openaiApiKey && input.openaiApiKey.trim().length > 0 && input.openaiApiKey !== API_KEY_UNCHANGED) {
    newOpenAIKey = input.openaiApiKey.trim();
    updateData.openaiApiKey = newOpenAIKey;
  }
  if (input.claudeApiKey && input.claudeApiKey.trim().length > 0 && input.claudeApiKey !== API_KEY_UNCHANGED) {
    newClaudeKey = input.claudeApiKey.trim();
    updateData.claudeApiKey = newClaudeKey;
  }
  if (input.deepseekApiKey && input.deepseekApiKey.trim().length > 0 && input.deepseekApiKey !== API_KEY_UNCHANGED) {
    newDeepSeekKey = input.deepseekApiKey.trim();
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

/** Get all available models sorted by: preferred model first, then remaining by priority */
export function getAvailableModels(settings?: UserSettings): { model: string; apiKey: string }[] {
  const result: { model: string; apiKey: string }[] = [];
  const preferred = settings?.defaultModel || "";

  // Try preferred model first (only if it has a key configured)
  if (preferred) {
    const preferredKey = resolveStoredApiKey(preferred, settings) || process.env[`${preferred.toUpperCase()}_API_KEY`] || "";
    if (preferredKey) {
      result.push({ model: preferred, apiKey: preferredKey });
    }
  }

  // Then try remaining models in priority order (deepseek first for domestic optimization)
  const remainingOrder = ["deepseek", "kimi", "openai", "claude"];
  for (const model of remainingOrder) {
    if (model === preferred) continue;
    const key = resolveStoredApiKey(model, settings) || process.env[`${model.toUpperCase()}_API_KEY`] || "";
    if (key) {
      result.push({ model, apiKey: key });
    }
  }

  return result;
}

export function resolveStoredApiKey(model: string, settings?: UserSettings): string {
  if (model === "kimi" && settings?.kimiApiKey) return settings.kimiApiKey;
  if (model === "openai" && settings?.openaiApiKey) return settings.openaiApiKey;
  if (model === "claude" && settings?.claudeApiKey) return settings.claudeApiKey;
  if (model === "deepseek" && settings?.deepseekApiKey) return settings.deepseekApiKey;
  return "";
}

function mapNativeSettings(userId: number, s: any): UserSettings {
  return {
    userId: s.user_id,
    defaultModel: s.default_model,
    defaultFramework: s.default_framework,
    defaultLanguage: s.default_language,
    kimiApiKey: native.settingsGetApiKey(userId, "kimi"),
    openaiApiKey: native.settingsGetApiKey(userId, "openai"),
    claudeApiKey: native.settingsGetApiKey(userId, "claude"),
    deepseekApiKey: native.settingsGetApiKey(userId, "deepseek"),
  };
}

export async function getPromptForgeSettingsRecord(userId: number): Promise<UserSettings | undefined> {
  try {
    const s = native.settingsGet(userId);
    return mapNativeSettings(userId, s);
  } catch {
    return undefined;
  }
}

export async function getPromptForgeSettings(userId: number): Promise<PromptForgeSettingsResponse> {
  const settings = await getPromptForgeSettingsRecord(userId);
  if (settings) {
    return mapSettingsResponse(settings);
  }

  // New user: infer default model from env keys (no DB keys yet)
  const inferredModel = inferDefaultModel();
  native.settingsUpdate(userId, {
    default_model: inferredModel,
    default_framework: "auto",
    default_language: "zh",
  });

  return mapSettingsResponse({
    userId,
    defaultModel: inferredModel,
    defaultFramework: "auto",
    defaultLanguage: "zh",
  });
}

export async function updatePromptForgeSettings(
  userId: number,
  input: UpdatePromptForgeSettingsInput,
): Promise<{ success: true }> {
  const existing = await getPromptForgeSettingsRecord(userId);
  const updateData = buildSettingsUpdateData(input, existing);

  // Convert camelCase to snake_case for native
  const nativeUpdate: Record<string, any> = {};
  if (updateData.defaultModel !== undefined) nativeUpdate.default_model = updateData.defaultModel;
  if (updateData.defaultFramework !== undefined) nativeUpdate.default_framework = updateData.defaultFramework;
  if (updateData.defaultLanguage !== undefined) nativeUpdate.default_language = updateData.defaultLanguage;
  if (updateData.kimiApiKey !== undefined) nativeUpdate.kimi_api_key = String(updateData.kimiApiKey);
  if (updateData.openaiApiKey !== undefined) nativeUpdate.openai_api_key = String(updateData.openaiApiKey);
  if (updateData.claudeApiKey !== undefined) nativeUpdate.claude_api_key = String(updateData.claudeApiKey);
  if (updateData.deepseekApiKey !== undefined) nativeUpdate.deepseek_api_key = String(updateData.deepseekApiKey);

  native.settingsUpdate(userId, nativeUpdate);
  return { success: true };
}

export async function resolvePromptForgeModelApiKey(
  userId: number,
  requestedModel?: string,
): Promise<{ settings?: UserSettings; model: string; apiKey: string }> {
  const settings = await getPromptForgeSettingsRecord(userId);

  // Pick model: requested > inferred from keys (always prefer first available)
  let model = requestedModel || inferDefaultModel(settings);

  // If the chosen model has no key, try to find an available one
  let apiKey = model ? resolveStoredApiKey(model, settings) : "";
  if (!apiKey) {
    const available = getAvailableModels(settings);
    if (available.length > 0) {
      model = available[0].model;
      apiKey = available[0].apiKey;
    } else {
      model = "";
      apiKey = "";
    }
  }

  return {
    settings,
    model,
    apiKey,
  };
}
