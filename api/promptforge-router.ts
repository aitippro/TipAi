import { createRouter, publicQuery, authedQuery } from "./middleware";
import { z } from "zod";
import {
  getAllFrameworks,
  getFrameworkCount,
  analyzeIntent,
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
  resolvePromptForgeModelApiKey,
} from "./services/promptforge/settings";
import {
  generateDynamicOptions,
  regeneratePrompt as regenerateDynamicPrompt,
} from "./services/promptforge/dynamic-options";
import {
  classifyIntent,
  getAllDomains,
  getDomainKnowledge,
} from "./services/clarify";
import { generateClarifyStrategy } from "./services/clarify/strategy-router";
import {
  matchFrameworks,
  getFrameworkGraphData,
} from "./services/framework";

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

  // P0-2: Clarify 策略路由 — 实时分析（无需 AI 调用）
  clarifyPreview: publicQuery
    .input(z.object({ intent: z.string().min(1).max(3000) }))
    .query(({ input }) => {
      const classification = classifyIntent(input.intent);
      const strategy = generateClarifyStrategy(input.intent);
      const knowledge = getDomainKnowledge(classification.domain);
      return {
        classification,
        strategy: {
          completenessScore: strategy.completenessScore,
          suggestedRounds: strategy.suggestedRounds,
          frameworkRecommendation: strategy.frameworkRecommendation,
          strategyDescription: strategy.strategyDescription,
        },
        domainKnowledge: {
          bestPractices: knowledge.bestPractices,
          keyInformation: knowledge.keyInformation,
          defaultFramework: knowledge.defaultFramework,
          outputFormats: knowledge.outputFormats,
        },
      };
    }),

  // P0-2: 获取所有支持领域
  listDomains: publicQuery.query(() => getAllDomains()),

  // P1-2: 智能框架匹配引擎
  matchFrameworks: publicQuery
    .input(z.object({ intent: z.string().min(1).max(3000) }))
    .query(({ input }) => matchFrameworks(input.intent)),

  // P1-2: 框架知识图谱数据（用于可视化）
  frameworkGraph: publicQuery.query(() => getFrameworkGraphData()),

  /** AI 分析用户意图复杂度 — 用于自动判断单步骤/分步骤 */
  analyze: authedQuery
    .input(z.object({ intent: z.string().min(1).max(3000) }))
    .mutation(async ({ input, ctx }) => {
      const { model, apiKey } = await resolvePromptForgeModelApiKey(ctx.user.id);
      const analysis = await analyzeIntent(input.intent, model, apiKey);
      return {
        complexity: analysis.complexity,
        domain: analysis.domain,
        goal: analysis.goal,
      };
    }),

  /** 检查是否有 API Key 配置（环境变量或用户设置）——用于启动引导判断 */
  apiKeyStatus: publicQuery.query(() => {
    const envKeys = ["KIMI_API_KEY", "OPENAI_API_KEY", "CLAUDE_API_KEY", "DEEPSEEK_API_KEY"];
    const hasEnvKey = envKeys.some((k) => !!process.env[k]);
    return {
      configured: hasEnvKey,
      sources: envKeys.filter((k) => !!process.env[k]).map((k) => k.replace("_API_KEY", "").toLowerCase()),
    };
  }),
});
