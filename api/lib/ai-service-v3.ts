import {
  DEFAULT_FRAMEWORK_KEY,
  getFrameworkByKey,
} from "./ai-service-v3/catalog";
import { callAI } from "./ai-service-v3/client";
import { detectDomain } from "./ai-service-v3/domain";
import {
  parseAIJsonResponse,
  toComplexity,
  toStringArray,
  toStringValue,
} from "./ai-service-v3/response-parser";
import type {
  ClarificationQuestion,
  Framework,
  GeneratedPrompt,
  IntentAnalysis,
  StepDecomposition,
} from "./ai-service-v3/types";

export type {
  ClarificationQuestion,
  Framework,
  FrameworkRecommendation,
  GeneratedPrompt,
  IntentAnalysis,
  SlashCommand,
  StepDecomposition,
} from "./ai-service-v3/types";

export {
  DEFAULT_FRAMEWORK_KEY,
  FRAMEWORKS,
  getAllFrameworks,
  getFrameworkByKey,
  getFrameworkCount,
  parseSlashCommand,
  recommendFramework,
  SLASH_COMMANDS,
} from "./ai-service-v3/catalog";

function getDefaultFramework(): Framework {
  const framework = getFrameworkByKey(DEFAULT_FRAMEWORK_KEY);
  if (!framework) {
    throw new Error(`Missing default framework: ${DEFAULT_FRAMEWORK_KEY}`);
  }

  return framework;
}

function resolveFramework(key: string): Framework {
  return getFrameworkByKey(key) ?? getDefaultFramework();
}

function toDecompositionSteps(value: unknown): StepDecomposition["steps"] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item, index) => ({
      stepNumber:
        typeof item.stepNumber === "number" ? item.stepNumber : index + 1,
      title: toStringValue(item.title),
      description: toStringValue(item.description),
      inputNeeded: toStringValue(item.inputNeeded),
      estimatedComplexity: toStringValue(item.estimatedComplexity, "medium"),
    }));
}

export async function analyzeIntent(
  intent: string,
  provider: string,
  apiKey: string,
): Promise<IntentAnalysis> {
  const systemPrompt = `你是意图分析专家。分析用户的模糊需求描述，提取结构化信息。

返回JSON格式：
{
  "goal": "核心目标（一句话）",
  "domain": "领域分类：content-marketing/programming/education/data-analysis/legal/image-gen/video-gen/general",
  "subDomain": "子领域",
  "audience": "目标受众描述",
  "tone": "语气风格：专业/友好/幽默/严肃/激励/温暖",
  "style": "写作风格：正式/口语/简洁/详细/故事化",
  "constraints": ["约束1", "约束2"],
  "outputFormat": "期望的输出格式",
  "complexity": "simple|medium|complex",
  "language": "语言：zh|en"
}

complexity判断标准：
- simple: 单一明确任务，如"写一条推文"，涉及1-2个维度
- medium: 多维度任务，如"写一套营销方案"，涉及3-5个维度
- complex: 系统性工程，如"设计一个完整的电商平台"，涉及多个模块和长期规划

只返回JSON，不要其他内容。`;

  const result = await callAI(provider, apiKey, systemPrompt, intent, 0.3);
  if (result) {
    const parsed = parseAIJsonResponse<Record<string, unknown>>(result);
    if (parsed) {
      return {
        goal: toStringValue(parsed.goal, intent),
        domain: toStringValue(parsed.domain, "general"),
        subDomain: toStringValue(parsed.subDomain, "general"),
        audience: toStringValue(parsed.audience),
        tone: toStringValue(parsed.tone, "专业"),
        style: toStringValue(parsed.style, "简洁"),
        constraints: toStringArray(parsed.constraints),
        outputFormat: toStringValue(parsed.outputFormat, "详细文字说明"),
        complexity: toComplexity(parsed.complexity),
        language: toStringValue(parsed.language, "zh"),
      };
    }

    console.error("Intent parse failed");
  }

  const detected = detectDomain(intent);
  return {
    goal: intent.length > 60 ? intent.substring(0, 60) + "..." : intent,
    domain: detected.domain,
    subDomain: detected.subDomain,
    audience: "",
    tone: "专业",
    style: "简洁",
    constraints: [],
    outputFormat: "详细文字说明",
    complexity:
      intent.length > 300 ? "complex" : intent.length > 100 ? "medium" : "simple",
    language: "zh",
  };
}

export async function generateClarification(
  intent: string,
  analysis: IntentAnalysis,
  provider: string,
  apiKey: string,
): Promise<ClarificationQuestion[] | null> {
  if (analysis.complexity === "simple" && intent.length > 50) return null;

  const systemPrompt = `你是一位需求澄清专家。用户描述了一个模糊或不够具体的需求，你需要提出2-4个关键问题来帮助用户澄清需求，使后续AI能生成更精准的提示词。

规则：
1. 问题要具体、可回答，不要开放式问题
2. 尽可能提供选项（选择题），降低用户回答成本
3. 每个问题要说明"为什么问这个问题"
4. 最多4个问题，聚焦最关键的信息缺口

返回JSON格式：
[
  {
    "id": "q1",
    "question": "问题文本",
    "type": "choice|text|multichoice",
    "options": ["选项A", "选项B", "选项C"],
    "why": "为什么这个问题重要",
    "required": true
  }
]

required 规则：
- 只有最关键、缺失会严重影响生成质量的信息才标记 required: true
- 最多2个必填项，其余都是选填（required: false）
- 用户"跳过"时，允许跳过所有选填项，但必填项必须回答`;

  const userMessage = `用户原始需求：${intent}

意图分析：
- 目标：${analysis.goal}
- 领域：${analysis.domain}
- 复杂度：${analysis.complexity}
- 受众：${analysis.audience || "未指定"}
- 约束：${analysis.constraints.join(", ") || "无"}

请生成澄清问题。`;

  const result = await callAI(provider, apiKey, systemPrompt, userMessage, 0.4);
  if (!result) return null;

  const parsed = parseAIJsonResponse<ClarificationQuestion[]>(result);
  if (Array.isArray(parsed) && parsed.length > 0) return parsed;

  console.error("Clarification parse failed");
  return null;
}

export async function decomposeSteps(
  intent: string,
  analysis: IntentAnalysis,
  provider: string,
  apiKey: string,
): Promise<StepDecomposition | null> {
  if (analysis.complexity !== "complex") return null;

  const systemPrompt = `你是一位项目拆解专家。面对一个复杂的需求，你需要判断是否值得分步骤执行，如果是，给出合理的步骤拆解。

返回JSON格式：
{
  "shouldDecompose": true/false,
  "reason": "为什么建议/不建议分步骤",
  "steps": [
    {
      "stepNumber": 1,
      "title": "步骤标题",
      "description": "步骤描述",
      "inputNeeded": "用户需要提供的输入",
      "estimatedComplexity": "simple|medium|complex"
    }
  ]
}

规则：
1. 只有真正复杂、涉及多个模块或长期的项目才建议分步骤
2. 步骤之间要有逻辑依赖关系
3. 每个步骤要有明确的输入和输出
4. 最多5个步骤`;

  const result = await callAI(
    provider,
    apiKey,
    systemPrompt,
    `需求：${intent}\n复杂度：${analysis.complexity}\n目标：${analysis.goal}`,
    0.3,
  );
  if (!result) return null;

  const parsed = parseAIJsonResponse<Record<string, unknown>>(result);
  if (parsed) {
    return {
      shouldDecompose: !!parsed.shouldDecompose,
      reason: toStringValue(parsed.reason),
      steps: toDecompositionSteps(parsed.steps),
    };
  }

  console.error("Step decomposition parse failed");
  return null;
}

export async function generatePrompt(
  intent: string,
  analysis: IntentAnalysis,
  framework: string,
  provider: string,
  apiKey: string,
): Promise<GeneratedPrompt> {
  const frameworkConfig = resolveFramework(framework);

  const systemPrompt = `你是一位顶级提示词工程师（Prompt Engineer）。你的任务是根据用户的模糊需求和意图分析，使用指定的框架生成一条完美的、可直接使用的提示词。

## 生成原则
1. 提示词必须是完整、可直接复制粘贴到AI对话中使用的
2. 每个框架字段必须被充分填充，内容具体、不模糊
3. 融入领域最佳实践
4. 输出格式使用Markdown
5. 如果适用，添加Few-shot示例
6. 中文需求生成中文提示词，英文需求生成英文提示词

## 输出格式
{
  "title": "提示词标题",
  "prompt": "完整的提示词内容",
  "explanation": "为什么这个提示词有效（2-3句话）",
  "tips": ["使用技巧1", "使用技巧2", "使用技巧3"],
  "usageExample": "这个提示词的预期使用方式"
}`;

  const userMessage = `## 用户原始需求
${intent}

## 意图分析
- 核心目标：${analysis.goal}
- 领域：${analysis.domain}
- 子领域：${analysis.subDomain}
- 受众：${analysis.audience || "未指定"}
- 语气：${analysis.tone}
- 风格：${analysis.style}
- 约束：${analysis.constraints.join(", ") || "无"}
- 输出格式：${analysis.outputFormat}
- 复杂度：${analysis.complexity}

## 指定框架
框架名称：${frameworkConfig.name}
框架说明：${frameworkConfig.description}
框架组件：${frameworkConfig.components.join(", ")}

## 框架模板
${frameworkConfig.template}

## 框架示例
${frameworkConfig.example}

请基于以上信息，使用${frameworkConfig.name}框架生成一条完美的提示词。确保每个组件都被充分填充，输出可直接使用。`;

  const result = await callAI(provider, apiKey, systemPrompt, userMessage, 0.5);
  if (result) {
    const parsed = parseAIJsonResponse<Record<string, unknown>>(result);
    if (parsed) {
      const tips = toStringArray(parsed.tips);

      return {
        title: toStringValue(parsed.title, analysis.goal),
        framework: frameworkConfig.name,
        prompt: toStringValue(parsed.prompt, result),
        explanation: toStringValue(
          parsed.explanation,
          `基于${frameworkConfig.name}框架生成的提示词，适用于${analysis.domain}领域`,
        ),
        tips:
          tips.length > 0
            ? tips
            : ["直接复制粘贴使用", "根据实际需要微调具体字段内容"],
        usageExample: toStringValue(
          parsed.usageExample,
          "复制提示词粘贴到AI对话框中使用",
        ),
      };
    }

    console.error("Generate parse failed");
  }

  return constructFallbackPrompt(intent, analysis, frameworkConfig);
}

function constructFallbackPrompt(
  intent: string,
  analysis: IntentAnalysis,
  framework: Framework,
): GeneratedPrompt {
  const constraints = analysis.constraints;
  const audience = analysis.audience || "目标受众";
  const tone = analysis.tone;
  const style = analysis.style;
  let prompt = "";

  switch (framework.nameEn) {
    case "CO-STAR":
      prompt = `Context: 我需要完成以下任务：${intent}
Objective: ${analysis.goal}
Style: ${style}风格
Tone: ${tone}语气
Audience: ${audience}
Response: ${analysis.outputFormat}${constraints.length > 0 ? "\nConstraints: " + constraints.join("; ") : ""}`;
      break;
    case "RISEN":
      prompt = `Role: 你是一位${analysis.domain}领域的资深专家
Instructions: ${intent}
Steps: ${analysis.complexity === "simple" ? "1. 分析需求\n2. 提供解决方案" : analysis.complexity === "medium" ? "1. 分析需求\n2. 制定策略\n3. 提供详细方案\n4. 给出实施建议" : "1. 深入分析需求\n2. 制定全面策略\n3. 设计详细方案\n4. 提供实施路线图\n5. 给出风险应对措施"}
End goal: ${analysis.goal}
Narrowing: ${constraints.length > 0 ? constraints.join("; ") : "确保内容专业、准确、可执行"}`;
      break;
    case "RTF":
      prompt = `Role: ${analysis.domain}专家
Task: ${intent}
Format: ${analysis.outputFormat}${constraints.length > 0 ? "\nConstraints: " + constraints.join("; ") : ""}`;
      break;
    case "CRISPE":
      prompt = `Capacity+Role: 你是一位擅长${analysis.domain}的AI助手，具备${analysis.subDomain}方面的专业知识
Insight: 用户需要完成${analysis.goal}，目标受众是${audience}
Instruction: ${intent}
Personality: ${tone}、专业、善于用清晰的语言解释复杂概念
Experiment: 如果一次回答不够完善，请主动询问需要补充的信息`;
      break;
    case "APE":
      prompt = `Action: ${intent}
Purpose: ${analysis.goal}
Expectation: ${analysis.outputFormat}，${tone}风格${constraints.length > 0 ? "，同时满足：" + constraints.join("; ") : ""}`;
      break;
    default:
      prompt = `你是一位${analysis.domain}专家。\n\n任务：${intent}\n\n要求：\n1. ${tone}风格\n2. ${style}表达\n3. 目标受众：${audience}\n4. 输出格式：${analysis.outputFormat}${constraints.length > 0 ? "\n5. " + constraints.join("\n6. ") : ""}`;
  }

  return {
    title: analysis.goal,
    framework: framework.name,
    prompt,
    explanation: `基于${framework.name}框架生成的提示词，该框架${framework.description}。框架包含${framework.components.length}个组件，确保提示词结构完整、可直接使用。`,
    tips: [
      "直接复制粘贴到AI对话中使用",
      `适合${framework.bestFor.slice(0, 3).join("、")}等场景`,
      "如果输出不满意，可以调整具体组件内容",
    ],
    usageExample: "复制以上提示词，粘贴到AI对话框中即可获得高质量输出",
  };
}

export async function generateMultipleVersions(
  intent: string,
  analysis: IntentAnalysis,
  frameworks: string[],
  provider: string,
  apiKey: string,
): Promise<GeneratedPrompt[]> {
  const results: GeneratedPrompt[] = [];

  for (const framework of frameworks.slice(0, 3)) {
    try {
      const prompt = await generatePrompt(
        intent,
        analysis,
        framework,
        provider,
        apiKey,
      );
      results.push(prompt);
    } catch (error) {
      console.error(`Framework ${framework} failed:`, error);
    }
  }

  return results.length > 0
    ? results
    : [constructFallbackPrompt(intent, analysis, getDefaultFramework())];
}
