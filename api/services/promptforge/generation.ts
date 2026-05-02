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
import {
  generateClarifyStrategy,
  type ClarifyStrategy,
} from "../clarify/strategy-router";
import type {
  ClarifyIntentInput,
  DecomposeIntentInput,
  GeneratePromptInput,
  QuickGenerateInput,
} from "./schemas";
import { resolvePromptForgeModelApiKey } from "./settings";

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
  // console.log("[PF] generate start", { userId, intent: input.intent.slice(0, 40), hasAnswers: !!input.answers, model: input.model })
  const { settings, model, apiKey } = await resolvePromptForgeModelApiKey(userId, input.model);
  const userLanguage = input.language || settings?.defaultLanguage || "zh";
  // console.log("[PF] resolved key", { model, hasKey: !!apiKey })

  const { command: slashCmd, cleanIntent } = parseSlashCommand(input.intent);
  // analyzeIntent handles missing apiKey gracefully (local keyword fallback)
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
  if (apiKey && (input.stepMode || analysis.complexity === "complex")) {
    stepDecomposition = await decomposeSteps(finalIntent, analysis, model, apiKey);
  }

  let results: Awaited<ReturnType<typeof generateMultipleVersions>>;
  if (apiKey) {
    try {
      // Use top-1 framework by default for speed; user can regenerate for more variants
      const frameworks = recommendations.slice(0, 1).map((recommendation) => recommendation.framework);
      results = await generateMultipleVersions(finalIntent, analysis, frameworks, model, apiKey, undefined, userLanguage);
    } catch (error) {
      console.error("AI generation failed, using fallback:", error);
      try {
        const prompt = await generatePrompt(finalIntent, analysis, selectedFramework, model, apiKey, undefined, userLanguage);
        results = [prompt];
      } catch (fallbackError) {
        console.error("Fallback generation also failed:", fallbackError);
        results = [{
          title: "生成失败",
          framework: selectedFramework,
          prompt: `【生成失败】\n无法为您的请求生成提示词。请检查 API Key 是否有效，或稍后重试。\n\n原始需求：${finalIntent.slice(0, 200)}`,
          explanation: "AI 服务调用失败，已返回降级提示。",
          tips: ["检查 API Key 配置", "稍后重试", "尝试简化需求"],
          usageExample: "",
        }];
      }
    }
  } else {
    // No API Key: use local fallback template generation
    const prompt = await generatePrompt(finalIntent, analysis, selectedFramework, model, apiKey, undefined, userLanguage);
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

  const { cleanIntent } = parseSlashCommand(input.intent);
  const analysis = await analyzeIntent(cleanIntent, model, apiKey);

  // P0-2: 并行运行策略路由（本地即时）和 AI 追问生成
  const [questions, strategy] = await Promise.all([
    apiKey ? generateClarification(cleanIntent, analysis, model, apiKey) : Promise.resolve([]),
    Promise.resolve(generateClarifyStrategy(cleanIntent, input.answers || {})),
  ]);

  // P0-2: 将策略路由追问作为 AI 追问的补充（不覆盖 AI 的 null 判断）
  const mergedQuestions = mergeClarificationQuestions(
    questions || [],
    strategy,
    analysis.domain,
  );

  return {
    needsClarification: mergedQuestions.length > 0,
    questions: mergedQuestions,
    analysis,
    // P0-2: 新增策略路由信息
    strategy: {
      completenessScore: strategy.completenessScore,
      suggestedRounds: strategy.suggestedRounds,
      frameworkRecommendation: strategy.frameworkRecommendation,
      strategyDescription: strategy.strategyDescription,
    },
  };
}

/**
 * 合并 AI 生成的追问和策略路由生成的追问，去重并优先保留 AI 生成的。
 */
function mergeClarificationQuestions(
  aiQuestions: { id: string; question: string; type: string; options?: string[]; why: string; required: boolean }[],
  strategy: ClarifyStrategy,
  _domain: string,
): { id: string; question: string; type: string; options?: string[]; why: string; required: boolean }[] {
  // AI 未生成追问时，尊重 AI 判断（不强制注入策略路由追问）
  if (aiQuestions.length === 0) {
    return [];
  }

  // AI 追问不足时，用策略路由补充
  if (aiQuestions.length >= 3) {
    return aiQuestions.slice(0, 5);
  }

  const merged = [...aiQuestions];
  const existingTexts = new Set(aiQuestions.map((q) => q.question));

  for (const routerQuestion of strategy.followUpQuestions) {
    if (existingTexts.has(routerQuestion)) continue;
    const isDuplicate = aiQuestions.some((q) =>
      q.question.includes(routerQuestion.slice(0, 8)) ||
      routerQuestion.includes(q.question.slice(0, 8)),
    );
    if (isDuplicate) continue;

    merged.push({
      id: `router-${merged.length + 1}`,
      question: routerQuestion,
      type: "text",
      why: "基于领域知识，补充此信息可显著提升生成质量",
      required: false,
    });
  }

  return merged.slice(0, 5);
}

export async function generatePromptForgeDecomposition(
  userId: number,
  input: DecomposeIntentInput,
) {
  const { model, apiKey } = await resolvePromptForgeModelApiKey(userId);

  const { cleanIntent } = parseSlashCommand(input.intent);
  const analysis = await analyzeIntent(cleanIntent, model, apiKey);
  const decomposition = apiKey
    ? await decomposeSteps(cleanIntent, analysis, model, apiKey)
    : { steps: [], reasoning: "需要配置 API Key 才能使用任务拆解功能" };

  return {
    analysis,
    decomposition,
  };
}

export async function quickGeneratePromptForgeResult(
  userId: number,
  input: QuickGenerateInput,
) {
  const { settings, model, apiKey } = await resolvePromptForgeModelApiKey(userId);
  const userLanguage = input.language || settings?.defaultLanguage || "zh";

  const { command: slashCmd, cleanIntent } = parseSlashCommand(input.intent);
  const analysis = await analyzeIntent(cleanIntent, model, apiKey);
  const recommendations = recommendFramework(
    analysis.domain,
    analysis.complexity,
    cleanIntent,
    slashCmd,
  );
  const framework = recommendations[0]?.framework || DEFAULT_FRAMEWORK_KEY;
  const result = await generatePrompt(cleanIntent, analysis, framework, model, apiKey, undefined, userLanguage);

  return {
    analysis,
    framework,
    result,
  };
}
