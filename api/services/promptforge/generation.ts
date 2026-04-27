import { TRPCError } from "@trpc/server";

import {
  DEFAULT_FRAMEWORK_KEY,
  analyzeIntent,
  decomposeSteps,
  generateClarification,
  generateMultipleVersions,
  generatePrompt,
  parseSlashCommand,
  recommendFramework,
} from "../../lib/ai-service-v3";
import type {
  ClarifyIntentInput,
  DecomposeIntentInput,
  GeneratePromptInput,
  QuickGenerateInput,
} from "./schemas";
import { resolvePromptForgeModelApiKey } from "./settings";

function buildApiKeyError(message: string) {
  return new TRPCError({
    code: "PRECONDITION_FAILED",
    message,
  });
}

function appendClarificationAnswers(
  intent: string,
  answers?: Record<string, string>,
): string {
  if (!answers || Object.keys(answers).length === 0) return intent;

  const answerText = Object.entries(answers)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");

  return `${intent}\n\n补充信息：\n${answerText}`;
}

export async function generatePromptForgeResult(
  userId: number,
  input: GeneratePromptInput,
) {
  const { model, apiKey } = await resolvePromptForgeModelApiKey(userId, input.model);
  if (!apiKey) {
    throw buildApiKeyError(`未配置 ${model} 的API Key，请先在设置中配置`);
  }

  const { command: slashCmd, cleanIntent } = parseSlashCommand(input.intent);
  const analysis = await analyzeIntent(cleanIntent, model, apiKey);
  const finalIntent = appendClarificationAnswers(cleanIntent, input.answers);
  const recommendations = recommendFramework(
    analysis.domain,
    analysis.complexity,
    finalIntent,
    slashCmd,
  );
  const selectedFramework =
    input.framework ||
    recommendations[0]?.framework ||
    DEFAULT_FRAMEWORK_KEY;

  let stepDecomposition = null;
  if (input.stepMode || analysis.complexity === "complex") {
    stepDecomposition = await decomposeSteps(finalIntent, analysis, model, apiKey);
  }

  let results: Awaited<ReturnType<typeof generateMultipleVersions>>;
  try {
    const frameworks = recommendations.slice(0, 3).map((recommendation) => recommendation.framework);
    results = await generateMultipleVersions(finalIntent, analysis, frameworks, model, apiKey);
  } catch (error) {
    console.error("AI generation failed, using fallback:", error);
    const prompt = await generatePrompt(finalIntent, analysis, selectedFramework, model, apiKey);
    results = [prompt];
  }

  return {
    analysis,
    recommendations,
    results,
    model,
    slashCmd: slashCmd
      ? {
          command: slashCmd.command,
          name: slashCmd.name,
          targetModel: slashCmd.targetModel,
        }
      : null,
    stepDecomposition,
  };
}

export async function generatePromptForgeClarification(
  userId: number,
  input: ClarifyIntentInput,
) {
  const { model, apiKey } = await resolvePromptForgeModelApiKey(userId);
  if (!apiKey) {
    throw buildApiKeyError("未配置API Key");
  }

  const { cleanIntent } = parseSlashCommand(input.intent);
  const analysis = await analyzeIntent(cleanIntent, model, apiKey);
  const questions = await generateClarification(cleanIntent, analysis, model, apiKey);

  return {
    needsClarification: !!questions && questions.length > 0,
    questions: questions || [],
    analysis,
  };
}

export async function generatePromptForgeDecomposition(
  userId: number,
  input: DecomposeIntentInput,
) {
  const { model, apiKey } = await resolvePromptForgeModelApiKey(userId);
  if (!apiKey) {
    throw buildApiKeyError("未配置API Key");
  }

  const { cleanIntent } = parseSlashCommand(input.intent);
  const analysis = await analyzeIntent(cleanIntent, model, apiKey);
  const decomposition = await decomposeSteps(cleanIntent, analysis, model, apiKey);

  return {
    analysis,
    decomposition,
  };
}

export async function quickGeneratePromptForgeResult(
  userId: number,
  input: QuickGenerateInput,
) {
  const { model, apiKey } = await resolvePromptForgeModelApiKey(userId);
  if (!apiKey) {
    throw buildApiKeyError("未配置API Key，请先在设置中配置");
  }

  const { command: slashCmd, cleanIntent } = parseSlashCommand(input.intent);
  const analysis = await analyzeIntent(cleanIntent, model, apiKey);
  const recommendations = recommendFramework(
    analysis.domain,
    analysis.complexity,
    cleanIntent,
    slashCmd,
  );
  const framework = recommendations[0]?.framework || DEFAULT_FRAMEWORK_KEY;
  const result = await generatePrompt(cleanIntent, analysis, framework, model, apiKey);

  return {
    analysis,
    framework,
    result,
  };
}
