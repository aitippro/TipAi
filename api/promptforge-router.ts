import { createRouter, publicQuery, authedQuery } from "./middleware";
import { z } from "zod";
import {
  getAllFrameworks,
  getFrameworkCount,
} from "./lib/ai-service-v3";
import {
  deletePromptForgeLibraryItem,
  listPromptForgeLibraryItems,
  savePromptForgeLibraryItem,
} from "./services/promptforge/library";
import {
  generatePromptForgeClarification,
  generatePromptForgeDecomposition,
  generatePromptForgeResult,
  quickGeneratePromptForgeResult,
} from "./services/promptforge/generation";
import {
  clarifyIntentSchema,
  decomposeIntentSchema,
  deleteLibraryItemSchema,
  generatePromptSchema,
  quickGenerateSchema,
  saveLibraryItemSchema,
  updatePromptForgeSettingsSchema,
} from "./services/promptforge/schemas";
import {
  getPromptForgeSettings,
  updatePromptForgeSettings,
} from "./services/promptforge/settings";
import {
  generateDynamicOptions,
  regeneratePrompt as regenerateDynamicPrompt,
} from "./services/promptforge/dynamic-options";

export const promptForgeRouter = createRouter({
  getSettings: authedQuery.query(({ ctx }) => getPromptForgeSettings(ctx.user.id)),

  updateSettings: authedQuery
    .input(updatePromptForgeSettingsSchema)
    .mutation(({ input, ctx }) => updatePromptForgeSettings(ctx.user.id, input)),

  generate: authedQuery
    .input(generatePromptSchema)
    .mutation(({ input, ctx }) => generatePromptForgeResult(ctx.user.id, input)),

  clarify: authedQuery
    .input(clarifyIntentSchema)
    .mutation(({ input, ctx }) => generatePromptForgeClarification(ctx.user.id, input)),

  decompose: authedQuery
    .input(decomposeIntentSchema)
    .mutation(({ input, ctx }) => generatePromptForgeDecomposition(ctx.user.id, input)),

  quickGenerate: authedQuery
    .input(quickGenerateSchema)
    .mutation(({ input, ctx }) => quickGeneratePromptForgeResult(ctx.user.id, input)),

  saveToLibrary: authedQuery
    .input(saveLibraryItemSchema)
    .mutation(({ input, ctx }) => savePromptForgeLibraryItem(ctx.user.id, input)),

  getLibrary: authedQuery.query(({ ctx }) => listPromptForgeLibraryItems(ctx.user.id)),

  deleteFromLibrary: authedQuery
    .input(deleteLibraryItemSchema)
    .mutation(({ input, ctx }) => deletePromptForgeLibraryItem(ctx.user.id, input.id)),

  listFrameworks: publicQuery.query(() => getAllFrameworks()),
  getFrameworkCount: publicQuery.query(() => getFrameworkCount()),

  // F6: Dynamic Prompt Generation
  generateDynamicOptions: authedQuery
    .input(
      z.object({
        intent: z.string().min(1).max(5000),
        sessionPreferences: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(({ input, ctx }) =>
      generateDynamicOptions(ctx.user.id, input.intent, input.sessionPreferences)
    ),

  regeneratePrompt: authedQuery
    .input(
      z.object({
        sessionId: z.string(),
        intent: z.string(),
        controlValues: z.record(z.string(), z.unknown()),
      })
    )
    .mutation(({ input, ctx }) =>
      regenerateDynamicPrompt(ctx.user.id, {
        sessionId: input.sessionId,
        intent: input.intent,
        controlValues: input.controlValues,
      })
    ),
});
