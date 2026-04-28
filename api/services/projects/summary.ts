import { TRPCError } from "@trpc/server";

import {
  analyzeIntent,
  parseAIJsonResponse,
  toStringArray,
  toStringValue,
} from "../../lib/ai-service-v3";
import type { IntentAnalysis } from "../../lib/ai-service-v3/types";
import { getPromptForgeSettingsRecord, resolveStoredApiKey } from "../promptforge/settings";

import { getDb } from "../../queries/connection";
import { projectConversations } from "@db/schema";
import { eq } from "drizzle-orm";

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

export async function generateRequirementSummary(
  userId: number,
  projectId: number,
  originalIntent: string,
): Promise<RequirementSummary> {
  const settings = await getPromptForgeSettingsRecord(userId);
  const model = settings?.defaultModel || "kimi";
  const apiKey = resolveStoredApiKey(model, settings);

  if (!apiKey) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "未配置API Key，请先在设置中配置",
    });
  }

  // Fetch conversation turns
  const rawTurns = await getDb()
    .select()
    .from(projectConversations)
    .where(eq(projectConversations.projectId, projectId))
    .orderBy(projectConversations.turnNumber);

  const turns: ConversationTurn[] = rawTurns.map((t) => ({
    role: t.role,
    content: t.content,
    questionData: t.questionData ? JSON.parse(t.questionData) : null,
    answerData: t.answerData ? JSON.parse(t.answerData) : null,
  }));

  // Analyze intent first
  const analysis = await analyzeIntent(originalIntent, model, apiKey);

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

  // Build context and call AI for summary
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

  // Use the AI client directly since we need a structured response
  const { callAI } = await import("../../lib/ai-service-v3/client");
  const result = await callAI(model, apiKey, systemPrompt, userMessage, 0.4);

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
  const model = settings?.defaultModel || "kimi";
  const apiKey = resolveStoredApiKey(model, settings);

  if (!apiKey) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "未配置API Key",
    });
  }

  // First analyze intent
  const analysis = await analyzeIntent(originalIntent, model, apiKey);

  // If already simple and enough info, skip
  if (analysis.complexity === "simple" && previousTurns.length >= 2) {
    return { needsMoreClarification: false };
  }

  // If too many turns, stop
  if (previousTurns.length >= 6) {
    return { needsMoreClarification: false };
  }

  // Build context
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
  const result = await callAI(model, apiKey, systemPrompt, userMessage, 0.4);

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
