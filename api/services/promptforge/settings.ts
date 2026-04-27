import { eq } from "drizzle-orm";

import { userSettings, type UserSettings } from "@db/schema";

import { decrypt, encrypt } from "../../lib/crypto";
import { getDb } from "../../queries/connection";
import type { UpdatePromptForgeSettingsInput } from "./schemas";

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

  return {
    defaultModel: settings.defaultModel,
    defaultFramework: settings.defaultFramework,
    defaultLanguage: settings.defaultLanguage,
    hasKimiKey: !!settings.kimiApiKey,
    hasOpenAIKey: !!settings.openaiApiKey,
    hasClaudeKey: !!settings.claudeApiKey,
    hasDeepSeekKey: !!settings.deepseekApiKey,
  };
}

function buildSettingsUpdateData(input: UpdatePromptForgeSettingsInput): Record<string, unknown> {
  const updateData: Record<string, unknown> = {};

  if (input.defaultModel !== undefined) updateData.defaultModel = input.defaultModel;
  if (input.defaultFramework !== undefined) updateData.defaultFramework = input.defaultFramework;
  if (input.defaultLanguage !== undefined) updateData.defaultLanguage = input.defaultLanguage;
  if (input.kimiApiKey && input.kimiApiKey.trim().length > 0 && input.kimiApiKey !== "***") updateData.kimiApiKey = encrypt(input.kimiApiKey.trim());
  if (input.openaiApiKey && input.openaiApiKey.trim().length > 0 && input.openaiApiKey !== "***") updateData.openaiApiKey = encrypt(input.openaiApiKey.trim());
  if (input.claudeApiKey && input.claudeApiKey.trim().length > 0 && input.claudeApiKey !== "***") updateData.claudeApiKey = encrypt(input.claudeApiKey.trim());
  if (input.deepseekApiKey && input.deepseekApiKey.trim().length > 0 && input.deepseekApiKey !== "***") updateData.deepseekApiKey = encrypt(input.deepseekApiKey.trim());

  return updateData;
}

function resolveStoredApiKey(model: string, settings?: UserSettings): string {
  if (model === "kimi" && settings?.kimiApiKey) return decrypt(settings.kimiApiKey);
  if (model === "openai" && settings?.openaiApiKey) return decrypt(settings.openaiApiKey);
  if (model === "claude" && settings?.claudeApiKey) return decrypt(settings.claudeApiKey);
  if (model === "deepseek" && settings?.deepseekApiKey) return decrypt(settings.deepseekApiKey);
  return "";
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

  await getDb().insert(userSettings).values({
    userId,
    ...DEFAULT_SETTINGS,
  });

  return mapSettingsResponse();
}

export async function updatePromptForgeSettings(
  userId: number,
  input: UpdatePromptForgeSettingsInput,
): Promise<{ success: true }> {
  const existing = await getPromptForgeSettingsRecord(userId);
  const updateData = buildSettingsUpdateData(input);

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
  const model = requestedModel || settings?.defaultModel || DEFAULT_SETTINGS.defaultModel;

  return {
    settings,
    model,
    apiKey: resolveStoredApiKey(model, settings),
  };
}
