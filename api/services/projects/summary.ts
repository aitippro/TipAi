/**
 * B4: Project Summary Service (Native-only, no Drizzle fallback)
 */

import { TRPCError } from "@trpc/server";
import { createHash } from "crypto";

import {
  analyzeIntent,
  parseAIJsonResponse,
  toStringArray,
  toStringValue,
} from "../../lib/ai-service-v3";
import type { IntentAnalysis } from "../../lib/ai-service-v3/types";
import { getPromptForgeSettingsRecord, getAvailableModels } from "../promptforge/settings";
import type { DecodeStrategy } from "../ai/decoding-strategies";

// ── Native Addon ────────────────────────────────────────────
let native: any = null;
try {
  native = require("../../../../native");
} catch {
  throw new Error("Native addon is required. Browser mode fallback removed in P5.");
}

interface ConversationTurn {
  role: string;
  content: string;
  questionData?: Record<string, unknown> | null;
  answerData?: Record<string, unknown> | null;
}

interface RequirementSummary {
  summary: string;
  requirements: string[];
  constraints: string[];
  suggestedFrameworks: string[];
  intentAnalysis: IntentAnalysis;
}

function buildConversationContext(turns: ConversationTurn[]): string {
  return turns
    .map((turn, idx) => {
      const roleLabel = turn.role === "assistant" ? "AI" : "用户";
      let ctx = `[${idx + 1}] ${roleLabel}: ${turn.content}`;
      if (turn.questionData && typeof turn.questionData === "object") {
        const q = turn.questionData;
        if (q.question) ctx += `\n  问题: ${q.question}`;
        if (q.why) ctx += `\n  原因: ${q.why}`;
      }
      if (turn.answerData && typeof turn.answerData === "object") {
        const a = turn.answerData;
        if (a.value) ctx += `\n  回答: ${a.value}`;
        if (a.selectedOptions && Array.isArray(a.selectedOptions)) {
          ctx += `\n  选择: ${a.selectedOptions.join(", ")}`;
        }
      }
      return ctx;
    })
    .join("\n\n");
}

export async function getProjectConversations(projectId: number): Promise<
  {
    id: number;
    userId: number;
    role: string;
    content: string;
    questionId?: string;
    questionData?: Record<string, string>;
    answerData?: Record<string, string>;
    turnNumber: number;
    createdAt: Date;
  }[]
> {
  const rows = native.conversationListByProject(projectId) || [];
  return rows.map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    role: r.role,
    content: r.content,
    questionId: r.question_id || undefined,
    questionData: r.question_data ? JSON.parse(r.question_data) : undefined,
    answerData: r.answer_data ? JSON.parse(r.answer_data) : undefined,
    turnNumber: r.turn_number,
    createdAt: r.created_at ? new Date(r.created_at) : new Date(),
  }));
}

export async function getProjectSummary(projectId: number): Promise<
  | {
      id: number;
      summary: string;
      requirements?: string;
      constraints?: string;
      suggestedFrameworks?: string;
      rawContext?: string;
      isFinalized: boolean;
      createdAt: Date;
      updatedAt: Date;
    }
  | undefined
> {
  const row = native.summaryGetByProject(projectId);
  if (!row) return undefined;
  return {
    id: row.id,
    summary: row.summary,
    requirements: row.requirements || undefined,
    constraints: row.constraints || undefined,
    suggestedFrameworks: row.suggested_frameworks || undefined,
    rawContext: row.raw_context || undefined,
    isFinalized: row.is_finalized === 1,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  };
}

export async function generateProjectSummary(
  _projectId: number,
  _userId: number,
): Promise<{
  summary: string;
  requirements: string[];
  constraints: string[];
  suggestedFrameworks: string[];
}> {
  // This is a simplified placeholder - in production, call the AI service
  const placeholderResponse = {
    summary: "Placeholder summary",
    requirements: ["Requirement 1", "Requirement 2"],
    constraints: ["Constraint 1"],
    suggestedFrameworks: ["Chain-of-Thought", "Tree-of-Thought"],
  };

  return placeholderResponse;
}

export async function upsertProjectSummary(
  projectId: number,
  userId: number,
  data: {
    summary: string;
    requirements?: string[];
    constraints?: string[];
    suggestedFrameworks?: string[];
    rawContext?: string;
    isFinalized?: boolean;
  },
): Promise<{ id: number; summary: string; createdAt: Date; updatedAt: Date }> {
  const row = native.summaryUpsert({
    project_id: projectId,
    user_id: userId,
    summary: data.summary,
    requirements: data.requirements ? JSON.stringify(data.requirements) : undefined,
    constraints: data.constraints ? JSON.stringify(data.constraints) : undefined,
    suggested_frameworks: data.suggestedFrameworks ? JSON.stringify(data.suggestedFrameworks) : undefined,
    raw_context: data.rawContext || undefined,
    is_finalized: data.isFinalized ? 1 : 0,
  });

  return {
    id: row.id,
    summary: row.summary,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  };
}

export async function summarizeConversationContext(
  conversations: {
    role: string;
    content: string;
  }[],
): Promise<string> {
  const hash = createHash("sha256")
    .update(JSON.stringify(conversations))
    .digest("hex");

  // Placeholder - in production, call AI service
  return `Conversation summary (hash: ${hash.slice(0, 8)}...): Placeholder summary of ${conversations.length} messages.`;
}

export async function generateRequirementSummary(
  userId: number,
  projectId: number,
  originalIntent: string,
  decodeStrategy?: DecodeStrategy,
): Promise<RequirementSummary> {
  const settings = await getPromptForgeSettingsRecord(userId);
  const models = getAvailableModels(settings);

  if (models.length === 0) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "未配置任何 AI 模型 API Key，请先在设置中配置",
    });
  }

  // Fetch conversation turns via native
  const rawTurns = await getProjectConversations(projectId);

  const turns: ConversationTurn[] = rawTurns.map((t) => ({
    role: t.role,
    content: t.content,
    questionData: t.questionData ?? null,
    answerData: t.answerData ?? null,
  }));

  // Analyze intent
  let analysis: Awaited<ReturnType<typeof analyzeIntent>> | null = null;
  for (const { model, apiKey } of models) {
    analysis = await analyzeIntent(originalIntent, model, apiKey, decodeStrategy);
    if (analysis) break;
  }
  if (!analysis) {
    const fallback: IntentAnalysis = { goal: originalIntent, domain: "general", subDomain: "general", audience: "", tone: "专业", style: "简洁", outputFormat: "详细文字说明", complexity: "simple", constraints: [], language: "zh" };
    return {
      summary: originalIntent,
      requirements: [originalIntent],
      constraints: [],
      suggestedFrameworks: [],
      intentAnalysis: fallback,
    };
  }

  // If no conversation turns, return basic analysis
  if (turns.length === 0) {
    return {
      summary: analysis.goal,
      requirements: [analysis.goal],
      constraints: analysis.constraints,
      suggestedFrameworks: [],
      intentAnalysis: analysis,
    };
  }

  const conversationContext = buildConversationContext(turns);

  const systemPrompt = `你是一位需求分析专家。基于用户与AI的多轮澄清对话，生成一份结构化的需求摘要。

你的任务：
1. 从对话中提取用户真正的核心需求
2. 识别所有明确和隐含的需求点
3. 列出约束条件
4. 推荐最适合的提示词框架

返回JSON格式：
{
  "summary": "用一段话总结用户的完整需求（2-3句，精炼准确）",
  "requirements": ["需求1", "需求2", "需求3"],
  "constraints": ["约束1", "约束2"],
  "suggestedFrameworks": ["框架1", "框架2"],
  "confidence": "high|medium|low",
  "remainingQuestions": ["如果还有信息缺口，列出需要进一步确认的问题"]
}

注意：
- summary 必须是自然语言段落，不是列表
- requirements 是具体、可验证的需求点
- constraints 是限制条件（预算、时间、格式、风格等）
- suggestedFrameworks 从以下框架中选择最适合的：CO-STAR、RISEN、RTF、CRISPE、APE、Chain-of-Thought、ReAct
- 只返回JSON，不要其他内容`;

  const userMessage = `用户原始需求：${originalIntent}

意图分析：
- 目标：${analysis.goal}
- 领域：${analysis.domain}
- 复杂度：${analysis.complexity}
- 受众：${analysis.audience || "未指定"}
- 语气：${analysis.tone}
- 风格：${analysis.style}
- 约束：${analysis.constraints.join(", ") || "无"}

多轮澄清对话：
${conversationContext}

请生成需求摘要。`;

  const { callAI } = await import("../../lib/ai-service-v3/client");
  let result: string | null = null;
  for (const { model, apiKey } of models) {
    result = await callAI(model, apiKey, systemPrompt, userMessage, 0.4, decodeStrategy);
    if (result) break;
  }

  if (!result) {
    return {
      summary: analysis.goal,
      requirements: [analysis.goal],
      constraints: analysis.constraints,
      suggestedFrameworks: [],
      intentAnalysis: analysis,
    };
  }

  const parsed = parseAIJsonResponse<Record<string, unknown>>(result);
  if (!parsed) {
    return {
      summary: analysis.goal,
      requirements: [analysis.goal],
      constraints: analysis.constraints,
      suggestedFrameworks: [],
      intentAnalysis: analysis,
    };
  }

  return {
    summary: toStringValue(parsed.summary, analysis.goal),
    requirements: toStringArray(parsed.requirements),
    constraints: toStringArray(parsed.constraints),
    suggestedFrameworks: toStringArray(parsed.suggestedFrameworks),
    intentAnalysis: analysis,
  };
}

export async function generateNextClarificationQuestion(
  userId: number,
  originalIntent: string,
  previousTurns: ConversationTurn[],
  decodeStrategy?: DecodeStrategy,
): Promise<{
  needsMoreClarification: boolean;
  question?: {
    id: string;
    question: string;
    type: "choice" | "text" | "multichoice";
    options?: string[];
    why: string;
    required: boolean;
  };
  summary?: string;
}> {
  const settings = await getPromptForgeSettingsRecord(userId);
  const models = getAvailableModels(settings);

  if (models.length === 0) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "未配置任何 AI 模型 API Key，请先在设置中配置（支持 DeepSeek/Kimi/OpenAI/Claude）",
    });
  }

  let analysis: Awaited<ReturnType<typeof analyzeIntent>> | null = null;
  for (const { model, apiKey } of models) {
    analysis = await analyzeIntent(originalIntent, model, apiKey, decodeStrategy);
    if (analysis) break;
  }
  if (!analysis) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI 意图分析失败，请检查网络和 API Key 配置" });
  }

  if (analysis.complexity === "simple" && previousTurns.length >= 2) {
    return { needsMoreClarification: false };
  }

  if (previousTurns.length >= 6) {
    return { needsMoreClarification: false };
  }

  const context = buildConversationContext(previousTurns);

  const systemPrompt = `你是一位需求澄清专家。基于用户的原始需求和已进行的澄清对话，判断是否需要继续提问，如果需要，生成下一个最关键的问题。

规则：
1. 如果信息已经足够生成精准提示词，返回 needsMoreClarification: false
2. 如果需要继续提问，每次只问一个最关键的问题
3. 尽可能提供选项（选择题），降低用户回答成本
4. 问题要具体、可回答
5. 最多6轮对话，当前是第${previousTurns.length + 1}轮

返回JSON格式：
{
  "needsMoreClarification": true/false,
  "question": {
    "id": "q${previousTurns.length + 1}",
    "question": "问题文本",
    "type": "choice|text|multichoice",
    "options": ["选项A", "选项B"],
    "why": "为什么问这个问题",
    "required": true/false
  },
  "summary": "基于当前对话，对需求的简要判断"
}

只返回JSON，不要其他内容。`;

  const userMessage = `用户原始需求：${originalIntent}

意图分析：
- 目标：${analysis.goal}
- 领域：${analysis.domain}
- 复杂度：${analysis.complexity}
- 受众：${analysis.audience || "未指定"}

已进行的对话：
${context || "（刚开始对话）"}

请判断是否需要继续提问。如果需要，只生成一个问题。`;

  const { callAI } = await import("../../lib/ai-service-v3/client");
  let result: string | null = null;
  for (const { model, apiKey } of models) {
    result = await callAI(model, apiKey, systemPrompt, userMessage, 0.4, decodeStrategy);
    if (result) break;
  }

  if (!result) {
    return { needsMoreClarification: false };
  }

  const parsed = parseAIJsonResponse<Record<string, unknown>>(result);
  if (!parsed) {
    return { needsMoreClarification: false };
  }

  const needsMore = !!parsed.needsMoreClarification;
  if (!needsMore) {
    return { needsMoreClarification: false };
  }

  const q = parsed.question as Record<string, unknown> | undefined;
  if (!q || !q.question) {
    return { needsMoreClarification: false };
  }

  return {
    needsMoreClarification: true,
    question: {
      id: toStringValue(q.id, `q${previousTurns.length + 1}`),
      question: toStringValue(q.question, ""),
      type: (toStringValue(q.type, "text") as "choice" | "text" | "multichoice"),
      options: toStringArray(q.options),
      why: toStringValue(q.why, "澄清需求以生成更精准的提示词"),
      required: !!q.required,
    },
    summary: toStringValue(parsed.summary, ""),
  };
}
