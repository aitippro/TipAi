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

  // Use stored defaultModel if it has a valid key; otherwise fall back to inference.
  // This respects the user's explicit choice while still auto-correcting when
  // the stored model no longer has a configured key.
  const storedDefault = settings.defaultModel;
  const storedHasKey = storedDefault ? !!resolveStoredApiKey(storedDefault, settings) : false;
  const defaultModel = storedHasKey ? storedDefault : inferDefaultModel(settings);

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

  const setOrClearKey = (key: string | undefined): string | null | undefined => {
    if (key === undefined || key === API_KEY_UNCHANGED) return undefined; // not included
    const trimmed = key.trim();
    return trimmed.length > 0 ? trimmed : null; // null = clear existing key
  };

  if (input.kimiApiKey !== undefined) {
    const val = setOrClearKey(input.kimiApiKey);
    if (val !== undefined) { newKimiKey = val ?? undefined; updateData.kimiApiKey = val; }
  }
  if (input.openaiApiKey !== undefined) {
    const val = setOrClearKey(input.openaiApiKey);
    if (val !== undefined) { newOpenAIKey = val ?? undefined; updateData.openaiApiKey = val; }
  }
  if (input.claudeApiKey !== undefined) {
    const val = setOrClearKey(input.claudeApiKey);
    if (val !== undefined) { newClaudeKey = val ?? undefined; updateData.claudeApiKey = val; }
  }
  if (input.deepseekApiKey !== undefined) {
    const val = setOrClearKey(input.deepseekApiKey);
    if (val !== undefined) { newDeepSeekKey = val ?? undefined; updateData.deepseekApiKey = val; }
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
  // NAPI-RS converts Rust snake_case to JS camelCase (s.userId, s.defaultModel, ...)
  // Polyfill may return either snake_case or camelCase — handle both
  const get = (camel: string, snake: string) => s[camel] ?? s[snake];
  return {
    userId: get("userId", "user_id") ?? userId,
    defaultModel: get("defaultModel", "default_model") ?? "",
    defaultFramework: get("defaultFramework", "default_framework") ?? "auto",
    defaultLanguage: get("defaultLanguage", "default_language") ?? "zh",
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
  } catch (e) {
    console.error("[settings] Failed to get settings record:", e);
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

  // NAPI-RS expects camelCase (rust struct snake_case → JS camelCase auto-convert)
  // Polyfill handles both camelCase and snake_case via SNAKE_TO_CAMEL mapping
  const nativeUpdate: Record<string, any> = {};
  if (updateData.defaultModel !== undefined) nativeUpdate.defaultModel = updateData.defaultModel;
  if (updateData.defaultFramework !== undefined) nativeUpdate.defaultFramework = updateData.defaultFramework;
  if (updateData.defaultLanguage !== undefined) nativeUpdate.defaultLanguage = updateData.defaultLanguage;
  if (updateData.kimiApiKey !== undefined) nativeUpdate.kimiApiKey = String(updateData.kimiApiKey);
  if (updateData.openaiApiKey !== undefined) nativeUpdate.openaiApiKey = String(updateData.openaiApiKey);
  if (updateData.claudeApiKey !== undefined) nativeUpdate.claudeApiKey = String(updateData.claudeApiKey);
  if (updateData.deepseekApiKey !== undefined) nativeUpdate.deepseekApiKey = String(updateData.deepseekApiKey);

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
