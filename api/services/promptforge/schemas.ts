import { z } from "zod";

export const updatePromptForgeSettingsSchema = z.object({
  kimiApiKey: z.string().optional(),
  openaiApiKey: z.string().optional(),
  claudeApiKey: z.string().optional(),
  deepseekApiKey: z.string().optional(),
  defaultModel: z.string().optional(),
  defaultFramework: z.string().optional(),
  defaultLanguage: z.string().optional(),
});

export const generatePromptSchema = z.object({
  intent: z.string().min(1).max(5000),
  model: z.string().optional(),
  framework: z.string().optional(),
  answers: z.record(z.string(), z.string()).optional(),
  stepMode: z.boolean().optional(),
});

export const clarifyIntentSchema = z.object({
  intent: z.string().min(1).max(3000),
});

export const decomposeIntentSchema = z.object({
  intent: z.string().min(1).max(3000),
});

export const quickGenerateSchema = z.object({
  intent: z.string().min(1).max(2000),
});

export const saveLibraryItemSchema = z.object({
  title: z.string(),
  originalIntent: z.string().optional(),
  generatedPrompt: z.string(),
  framework: z.string().optional(),
  domain: z.string().optional(),
  model: z.string().optional(),
  tags: z.string().optional(),
});

export const deleteLibraryItemSchema = z.object({
  id: z.number(),
});

export type UpdatePromptForgeSettingsInput = z.infer<typeof updatePromptForgeSettingsSchema>;
export type GeneratePromptInput = z.infer<typeof generatePromptSchema>;
export type ClarifyIntentInput = z.infer<typeof clarifyIntentSchema>;
export type DecomposeIntentInput = z.infer<typeof decomposeIntentSchema>;
export type QuickGenerateInput = z.infer<typeof quickGenerateSchema>;
export type SaveLibraryItemInput = z.infer<typeof saveLibraryItemSchema>;
