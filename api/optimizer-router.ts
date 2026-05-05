/* eslint-disable @typescript-eslint/no-explicit-any */
import { safeJsonParse } from "./lib/json-utils";

import { native } from "./lib/native";
import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { optimizePrompt, evaluatePrompt } from "./lib/ai-service-v2";
import { runOPRO } from "./services/promptforge/opro-engine";
import { judgePrompt } from "./services/promptforge/llm-judge";
import { getPromptForgeSettingsRecord, getAvailableModels } from "./services/promptforge/settings";

export const optimizerRouter = createRouter({
  // ---- 传统优化：单轮静态策略 ----
  optimize: authedQuery
    .input(
      z.object({
        prompt: z.string().min(1).max(5000),
        domain: z.string().default("general"),
        strategy: z.enum(["general", "structured", "concise"]).default("general"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const result = await optimizePrompt(input.prompt, input.domain, input.strategy);

      native.optimizerRunCreate({
        userId: ctx.user.id,
        originalPrompt: input.prompt,
        optimizedPrompt: result.optimizedPrompt,
        improvements: JSON.stringify(result.improvements),
        domain: input.domain,
        model: "kimi",
      });

      return result;
    }),

  // ---- 传统评估：单维度评分 ----
  evaluate: authedQuery
    .input(
      z.object({
        prompt: z.string().min(1),
        output: z.string().min(1),
        domain: z.string().default("general"),
      }),
    )
    .mutation(async ({ input }) => {
      return evaluatePrompt(input.prompt, input.output, input.domain);
    }),

  // ---- OPRO 自动优化引擎：多轮迭代 ----
  optimizeOPRO: authedQuery
    .input(
      z.object({
        prompt: z.string().min(1).max(5000),
        domain: z.string().default("general"),
        maxIterations: z.number().min(1).max(5).default(3),
        candidatesPerIteration: z.number().min(3).max(8).default(5),
        targetScore: z.number().min(1).max(10).default(9),
        decodeStrategy: z
          .object({
            type: z.enum(["greedy", "sampling", "self-consistency"]),
            temperature: z.number().optional(),
            topP: z.number().optional(),
            sampleCount: z.number().optional(),
            maxTokens: z.number().optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const settings = await getPromptForgeSettingsRecord(ctx.user.id);
      const models = getAvailableModels(settings);

      if (models.length === 0) {
        throw new Error("未配置任何 AI 模型 API Key，请先在设置中配置");
      }

      // 使用第一个可用模型作为 judge 和 optimizer
      // 如果可用模型 ≥2，用第二个模型做 optimizer（避免自评估偏差）
      const judgeModel = models[0];
      const optimizerModel = models.length >= 2 ? models[1] : models[0];

      const result = await runOPRO(input.prompt, {
        maxIterations: input.maxIterations,
        candidatesPerIteration: input.candidatesPerIteration,
        topKHistory: 3,
        targetScore: input.targetScore,
        earlyStopPatience: 1,
        judgeProvider: judgeModel.model,
        judgeApiKey: judgeModel.apiKey,
        optimizerProvider: optimizerModel.model,
        optimizerApiKey: optimizerModel.apiKey,
        domain: input.domain,
        decodeStrategy: input.decodeStrategy,
      });

      // 保存到历史
      native.optimizerRunCreate({
        userId: ctx.user.id,
        originalPrompt: input.prompt,
        optimizedPrompt: result.finalPrompt,
        improvements: JSON.stringify({
          opro: true,
          iterations: result.actualIterations,
          finalScore: result.finalScore,
          originalScore: result.originalScore,
          improvementPercent: result.improvementPercent,
          stopReason: result.stopReason,
        }),
        domain: input.domain,
        model: `${optimizerModel.model}+${judgeModel.model}`,
      });

      return result;
    }),

  // ---- LLM-as-Judge 单条评估 ----
  judge: authedQuery
    .input(
      z.object({
        prompt: z.string().min(1),
        output: z.string().optional(),
        domain: z.string().default("general"),
        decodeStrategy: z
          .object({
            type: z.enum(["greedy", "sampling", "self-consistency"]),
            temperature: z.number().optional(),
            topP: z.number().optional(),
            sampleCount: z.number().optional(),
            maxTokens: z.number().optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const settings = await getPromptForgeSettingsRecord(ctx.user.id);
      const models = getAvailableModels(settings);

      if (models.length === 0) {
        throw new Error("未配置任何 AI 模型 API Key");
      }

      const { model, apiKey } = models[0];
      return judgePrompt(
        model,
        apiKey,
        { id: "single", prompt: input.prompt, output: input.output, domain: input.domain },
        input.decodeStrategy,
      );
    }),

  // ---- 优化历史 ----
  history: authedQuery.query(async ({ ctx }) => {
    const rows = native.optimizerRunList(ctx.user.id, 50) || [];
    return rows.map((r: any) => ({
      id: r.id,
      userId: r.userId ?? r.user_id,
      originalPrompt: r.originalPrompt ?? r.original_prompt,
      optimizedPrompt: r.optimizedPrompt ?? r.optimized_prompt,
      improvements: r.improvements ? safeJsonParse(r.improvements) : null,
      domain: r.domain,
      model: r.model,
      createdAt: (r.createdAt ?? r.created_at) ? new Date(r.createdAt ?? r.created_at) : new Date(),
    }));
  }),
});
