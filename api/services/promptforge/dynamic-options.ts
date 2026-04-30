/**
 * F6: Dynamic Prompt Options Generator
 * Analyzes user intent → generates prompt control options
 * Two-layer system: response-level (per-request) + session-level (persistent)
 */

import { nanoid } from "nanoid";
import type {
  PromptControl,
  DynamicPromptOptions,
  RegenerationInput,
  RegenerationResult,
} from "@contracts/dynamic-prompt";
import { resolvePromptForgeModelApiKey } from "./settings";
import { callAI } from "../../lib/ai-service-v3/client";
import type { DecodeStrategy } from "../ai/decoding-strategies";

// === Default Session-Level Controls ===

const DEFAULT_SESSION_CONTROLS: PromptControl[] = [
  {
    id: "responseFormat",
    type: "select",
    label: "输出格式",
    description: "提示词的输出结构风格",
    options: [
      { value: "list", label: "列表式", description: "分条列出，结构清晰" },
      { value: "paragraph", label: "段落式", description: "连贯叙述，适合正式场景" },
      { value: "steps", label: "步骤式", description: "按步骤编号，适合操作指南" },
      { value: "markdown", label: "Markdown", description: "支持标题、代码块、表格" },
    ],
    default: "list",
    layer: "session",
    affects: "output_format",
  },
  {
    id: "detailLevel",
    type: "select",
    label: "详细程度",
    options: [
      { value: "concise", label: "精简", description: "核心要点，一句话说清" },
      { value: "balanced", label: "适中", description: "要点 + 简要说明" },
      { value: "detailed", label: "详尽", description: "完整覆盖，包含示例" },
    ],
    default: "balanced",
    layer: "session",
    affects: "prompt_length",
  },
  {
    id: "tone",
    type: "select",
    label: "语气风格",
    options: [
      { value: "formal", label: "正式", description: "专业书面语" },
      { value: "casual", label: "亲切", description: "口语化、友好自然" },
      { value: "technical", label: "技术", description: "术语精确，面向专业人员" },
    ],
    default: "formal",
    layer: "session",
    affects: "tone_style",
  },
];

// === Intent Analysis → Response-Level Controls ===

const CONTROL_GENERATION_SYSTEM_PROMPT = `你是一个提示词工程专家。分析用户意图，生成用于微调提示词的 UI 控件选项。

规则:
1. 最多生成 4 个响应级控件
2. 控件类型: select(单选), multi-select(多选), slider(范围), toggle(开关), text(文本)
3. 每个控件必须有 label, description, 2-5个 options
4. 控件应覆盖: 领域/场景、目标受众、约束条件、变量参数

返回严格 JSON 格式（不要 markdown 标记）:
{
  "responseControls": [
    {
      "id": "domain",
      "type": "select",
      "label": "领域/场景",
      "description": "提示词的应用领域",
      "options": [
        {"value": "marketing", "label": "营销文案", "description": "电商、广告、社媒"},
        {"value": "technical", "label": "技术文档"},
        {"value": "education", "label": "教育/培训"}
      ],
      "default": "marketing",
      "affects": "domain_context"
    }
  ],
  "initialPrompt": "基于你的需求生成的初始提示词..."
}`;

export async function generateDynamicOptions(
  userId: number,
  intent: string,
  sessionPreferences?: Record<string, unknown>,
  decodeStrategy?: DecodeStrategy,
): Promise<DynamicPromptOptions> {
  const { model, apiKey } = await resolvePromptForgeModelApiKey(userId);

  if (!apiKey) {
    throw new Error("请先配置至少一个 API Key");
  }

  const userMessage = `用户需求: ${intent}\n用户偏好: ${JSON.stringify(sessionPreferences || {})}`;

  const result = await callAI(
    model,
    apiKey,
    CONTROL_GENERATION_SYSTEM_PROMPT,
    userMessage,
    0.7,
    decodeStrategy,
  );

  if (!result) {
    throw new Error("生成选项失败，请重试");
  }

  // Parse JSON from AI response (strip markdown code blocks if present)
  const jsonStr = result.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim();
  const parsed = JSON.parse(jsonStr) as {
    responseControls?: PromptControl[];
    initialPrompt?: string;
  };

  const controls = parsed.responseControls || [];
  const initialPrompt = parsed.initialPrompt || "请详细描述你的需求...";

  return {
    sessionId: nanoid(12),
    intent,
    responseControls: controls.map((c) => ({ ...c, layer: "response" })),
    sessionControls: DEFAULT_SESSION_CONTROLS.map((c) => ({
      ...c,
      default: sessionPreferences?.[c.id] ?? c.default,
    })),
    initialPrompt,
    controlValues: {},
  };
}

// === Regeneration ===

const REGENERATION_SYSTEM_PROMPT = `你是一个提示词优化专家。根据用户调整的参数，重新生成更精准的提示词。

返回严格 JSON:
{
  "prompt": "重新生成的提示词...",
  "reasoning": "你为什么这样调整..."
}`;

export async function regeneratePrompt(
  userId: number,
  input: RegenerationInput,
  decodeStrategy?: DecodeStrategy,
): Promise<RegenerationResult> {
  const { model, apiKey } = await resolvePromptForgeModelApiKey(userId);

  if (!apiKey) {
    throw new Error("请先配置至少一个 API Key");
  }

  const userMessage = [
    `原始需求: ${input.intent}`,
    `调整的参数: ${JSON.stringify(input.controlValues, null, 2)}`,
    "请根据调整后的参数重新生成提示词。",
  ].join("\n");

  const result = await callAI(
    model,
    apiKey,
    REGENERATION_SYSTEM_PROMPT,
    userMessage,
    0.6,
    decodeStrategy,
  );

  if (!result) {
    throw new Error("重新生成失败，请重试");
  }

  const jsonStr = result.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim();
  const parsed = JSON.parse(jsonStr) as { prompt?: string; reasoning?: string };

  const changedControls = Object.keys(input.controlValues);

  return {
    prompt: parsed.prompt || initialPrompt(input.intent, input.controlValues),
    reasoning: parsed.reasoning || "已根据你的调整重新生成",
    changedControls,
  };
}

// === Fallback: template-based prompt generation ===

function initialPrompt(intent: string, values: Record<string, unknown>): string {
  const parts: string[] = [];

  const tone = values.tone || "正式";
  const format = values.responseFormat || "list";
  const detail = values.detailLevel || "balanced";

  parts.push(`你是一个${tone === "technical" ? "技术专家" : tone === "casual" ? "友好的助手" : "专业的顾问"}。`);
  parts.push("");
  parts.push(`## 任务\n${intent}`);
  parts.push("");

  if (format === "steps") {
    parts.push("## 步骤\n1. \n2. \n3. ");
  } else if (format === "markdown") {
    parts.push("## 要求\n- \n- \n- ");
  }

  if (detail === "detailed") {
    parts.push("\n请提供详细的说明和示例。");
  } else if (detail === "concise") {
    parts.push("\n请保持简洁，直击要点。");
  }

  return parts.join("\n");
}
