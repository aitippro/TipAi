import { TRPCError } from "@trpc/server";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("./settings", () => ({
  resolvePromptForgeModelApiKey: vi.fn(),
}));

vi.mock("../../lib/ai-service-v3", () => ({
  DEFAULT_FRAMEWORK_KEY: "co-star",
  analyzeIntent: vi.fn(),
  decomposeSteps: vi.fn(),
  generateClarification: vi.fn(),
  generateMultipleVersions: vi.fn(),
  generatePrompt: vi.fn(),
  parseSlashCommand: vi.fn(),
  recommendFramework: vi.fn(),
}));

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
  generatePromptForgeClarification,
  generatePromptForgeDecomposition,
  generatePromptForgeResult,
  quickGeneratePromptForgeResult,
} from "./generation";
import { resolvePromptForgeModelApiKey } from "./settings";

const baseAnalysis = {
  goal: "构建一个 AI Agent",
  domain: "programming",
  subDomain: "agent",
  audience: "开发团队",
  tone: "专业",
  style: "简洁",
  constraints: ["使用 TypeScript"],
  outputFormat: "Markdown",
  complexity: "complex" as const,
  language: "zh",
};

const basePrompt = {
  title: "Agent Prompt",
  framework: "ReAct",
  prompt: "prompt content",
  explanation: "why it works",
  tips: ["tip 1"],
  usageExample: "paste into model",
};

function buildRecommendation(framework: string) {
  return {
    framework,
    frameworkName: framework,
    confidence: 0.8,
    reason: `${framework} reason`,
  };
}

describe("promptForge generation service", () => {
  const originalKimiApiKey = process.env.KIMI_API_KEY;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();

    if (originalKimiApiKey === undefined) {
      delete process.env.KIMI_API_KEY;
    } else {
      process.env.KIMI_API_KEY = originalKimiApiKey;
    }
  });

  it("orchestrates complex prompt generation with appended clarification answers", async () => {
    const finalIntent =
      "build an agent\n\n补充信息：\naudience: CTO\nplatform: Web";
    const slashCommand = {
      command: "/agent",
      name: "AI Agent",
      icon: "agent",
      description: "agent workflow",
      targetModel: "text",
      defaultFramework: "react",
    };
    const recommendations = [
      buildRecommendation("react"),
      buildRecommendation("ape-optimized"),
      buildRecommendation("langgpt"),
      buildRecommendation(DEFAULT_FRAMEWORK_KEY),
    ];
    const decomposition = {
      shouldDecompose: true,
      reason: "任务复杂",
      steps: [],
    };
    const batchResults = [{ ...basePrompt, framework: "ReAct" }];

    vi.mocked(resolvePromptForgeModelApiKey).mockResolvedValue({
      model: "kimi",
      apiKey: "secret",
    });
    vi.mocked(parseSlashCommand).mockReturnValue({
      command: slashCommand,
      cleanIntent: "build an agent",
    });
    vi.mocked(analyzeIntent).mockResolvedValue(baseAnalysis);
    vi.mocked(recommendFramework).mockReturnValue(recommendations);
    vi.mocked(decomposeSteps).mockResolvedValue(decomposition);
    vi.mocked(generateMultipleVersions).mockResolvedValue(batchResults);

    const result = await generatePromptForgeResult(7, {
      intent: "/agent build an agent",
      framework: undefined,
      model: "kimi",
      stepMode: false,
      answers: {
        audience: "CTO",
        platform: "Web",
      },
    });

    expect(recommendFramework).toHaveBeenCalledWith(
      baseAnalysis.domain,
      baseAnalysis.complexity,
      finalIntent,
      slashCommand,
    );
    expect(decomposeSteps).toHaveBeenCalledWith(
      finalIntent,
      baseAnalysis,
      "kimi",
      "secret",
    );
    expect(generateMultipleVersions).toHaveBeenCalledWith(
      finalIntent,
      baseAnalysis,
      ["react", "ape-optimized", "langgpt"],
      "kimi",
      "secret",
    );
    expect(result).toMatchObject({
      analysis: baseAnalysis,
      recommendations,
      results: batchResults,
      model: "kimi",
      slashCmd: {
        command: "/agent",
        name: "AI Agent",
        targetModel: "text",
      },
      stepDecomposition: decomposition,
    });
  });

  it("falls back to single prompt generation when batch generation fails", async () => {
    const fallbackPrompt = { ...basePrompt, framework: "CRISPE" };

    vi.mocked(resolvePromptForgeModelApiKey).mockResolvedValue({
      model: "deepseek",
      apiKey: "secret",
    });
    vi.mocked(parseSlashCommand).mockReturnValue({
      command: null,
      cleanIntent: "write onboarding docs",
    });
    vi.mocked(analyzeIntent).mockResolvedValue({
      ...baseAnalysis,
      complexity: "simple",
    });
    vi.mocked(recommendFramework).mockReturnValue([
      buildRecommendation("risen"),
    ]);
    vi.mocked(generateMultipleVersions).mockRejectedValue(
      new Error("provider timeout"),
    );
    vi.mocked(generatePrompt).mockResolvedValue(fallbackPrompt);

    const result = await generatePromptForgeResult(9, {
      intent: "write onboarding docs",
      framework: "crispe",
      model: "deepseek",
      stepMode: false,
      answers: undefined,
    });

    expect(decomposeSteps).not.toHaveBeenCalled();
    expect(generatePrompt).toHaveBeenCalledWith(
      "write onboarding docs",
      { ...baseAnalysis, complexity: "simple" },
      "crispe",
      "deepseek",
      "secret",
    );
    expect(result.results).toEqual([fallbackPrompt]);
  });

  it("normalizes empty clarification results", async () => {
    vi.mocked(resolvePromptForgeModelApiKey).mockResolvedValue({
      model: "kimi",
      apiKey: "secret",
    });
    vi.mocked(parseSlashCommand).mockReturnValue({
      command: null,
      cleanIntent: "draft a launch plan",
    });
    vi.mocked(analyzeIntent).mockResolvedValue(baseAnalysis);
    vi.mocked(generateClarification).mockResolvedValue(null);

    const result = await generatePromptForgeClarification(3, {
      intent: "draft a launch plan",
    });

    expect(generateClarification).toHaveBeenCalledWith(
      "draft a launch plan",
      baseAnalysis,
      "kimi",
      "secret",
    );
    expect(result).toMatchObject({
      needsClarification: false,
      questions: [],
      analysis: baseAnalysis,
    });
    expect(result.strategy).toBeDefined();
    expect(result.strategy.completenessScore).toBeGreaterThanOrEqual(0);
  });

  it("returns decomposition for parsed intent", async () => {
    const decomposition = {
      shouldDecompose: true,
      reason: "需要分阶段推进",
      steps: [
        {
          stepNumber: 1,
          title: "调研",
          description: "收集上下文",
          inputNeeded: "目标",
          estimatedComplexity: "medium",
        },
      ],
    };

    vi.mocked(resolvePromptForgeModelApiKey).mockResolvedValue({
      model: "kimi",
      apiKey: "secret",
    });
    vi.mocked(parseSlashCommand).mockReturnValue({
      command: null,
      cleanIntent: "plan a migration",
    });
    vi.mocked(analyzeIntent).mockResolvedValue(baseAnalysis);
    vi.mocked(decomposeSteps).mockResolvedValue(decomposition);

    const result = await generatePromptForgeDecomposition(5, {
      intent: "plan a migration",
    });

    expect(result).toEqual({
      analysis: baseAnalysis,
      decomposition,
    });
  });

  it("uses default framework for quick generation when recommendations are empty", async () => {
    vi.mocked(resolvePromptForgeModelApiKey).mockResolvedValue({
      model: "kimi",
      apiKey: "system-key",
    });
    vi.mocked(parseSlashCommand).mockReturnValue({
      command: null,
      cleanIntent: "summarize this feature",
    });
    vi.mocked(analyzeIntent).mockResolvedValue({
      ...baseAnalysis,
      complexity: "simple",
    });
    vi.mocked(recommendFramework).mockReturnValue([]);
    vi.mocked(generatePrompt).mockResolvedValue(basePrompt);

    const result = await quickGeneratePromptForgeResult(1, {
      intent: "summarize this feature",
    });

    expect(generatePrompt).toHaveBeenCalledWith(
      "summarize this feature",
      { ...baseAnalysis, complexity: "simple" },
      DEFAULT_FRAMEWORK_KEY,
      "kimi",
      "system-key",
    );
    expect(result.framework).toBe(DEFAULT_FRAMEWORK_KEY);
    expect(result.result).toEqual(basePrompt);
  });

  it("handles quick generation when api key is empty (uses local fallback)", async () => {
    vi.mocked(resolvePromptForgeModelApiKey).mockResolvedValue({
      model: "kimi",
      apiKey: "",
    });
    vi.mocked(parseSlashCommand).mockReturnValue({
      command: null,
      cleanIntent: "summarize this feature",
    });
    vi.mocked(analyzeIntent).mockResolvedValue(baseAnalysis);
    vi.mocked(recommendFramework).mockReturnValue([
      buildRecommendation("co-star"),
    ]);
    vi.mocked(generatePrompt).mockResolvedValue(basePrompt);

    const result = await quickGeneratePromptForgeResult(1, {
      intent: "summarize this feature",
    });

    expect(result.analysis).toEqual(baseAnalysis);
    expect(result.framework).toBe("co-star");
    expect(result.result).toEqual(basePrompt);
  });
});
