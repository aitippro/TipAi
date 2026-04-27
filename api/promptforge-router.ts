import { createRouter, publicQuery, authedQuery } from "./middleware";
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
});
