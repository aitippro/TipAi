/* eslint-disable @typescript-eslint/no-explicit-any */

import type {
  CreateProjectInput,
  UpdateProjectInput,
  SaveConversationTurnInput,
} from "./schemas";
import type { ProjectEntry as Project } from "@db/schema";

// ── Native Addon (Electron/Node main process) ─────────────
import { native } from "../../lib/native";

function safeJsonParse<T>(value: string | undefined | null, fallback?: T): T | undefined {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/** Map native ProjectEntry (Rust camelCase or polyfill snake_case) → Project */
function mapNativeProject(entry: any): Project | null {
  if (!entry) return null;
  return {
    id: entry.id,
    userId: entry.userId ?? entry.user_id,
    title: entry.title,
    description: entry.description,
    domain: entry.domain,
    status: entry.status,
    intent: entry.intent,
    clarificationStatus: entry.clarificationStatus ?? entry.clarification_status,
    turnCount: entry.turnCount ?? entry.turn_count,
    createdAt: entry.createdAt ? new Date(entry.createdAt) : entry.created_at ? new Date(entry.created_at) : new Date(),
    updatedAt: entry.updatedAt ? new Date(entry.updatedAt) : entry.updated_at ? new Date(entry.updated_at) : new Date(),
  } as unknown as Project;
}

export async function createProject(
  userId: number,
  input: CreateProjectInput,
): Promise<Project> {
  const result = native.projectCreate({
    userId,
    title: input.title,
    description: input.description,
    intent: input.intent,
    domain: input.domain || "general",
    status: "draft",
  });
  return mapNativeProject(result)!;
}

export async function listUserProjects(userId: number) {
  const results = native.projectList(userId);
  return (results || []).map(mapNativeProject).filter(Boolean) as Project[];
}

export async function getProjectById(userId: number, id: number) {
  const result = native.projectGetById(id, userId);
  return mapNativeProject(result);
}

export async function updateProject(
  userId: number,
  input: UpdateProjectInput,
): Promise<Project | null> {
  const existing = native.projectGetById(input.id, userId);
  if (!existing) return null;

  const result = native.projectUpdate(input.id, userId, {
    title: input.title,
    description: input.description,
    status: input.status,
    intent: input.intent,
    clarificationStatus: input.clarificationStatus,
    turnCount: input.turnCount,
  });
  return mapNativeProject(result);
}

export async function deleteProject(userId: number, id: number): Promise<boolean> {
  const existing = native.projectGetById(id, userId);
  if (!existing) return false;
  native.projectDelete(id, userId);
  return true;
}

export async function saveConversationTurn(
  userId: number,
  input: SaveConversationTurnInput,
) {
  const project = await getProjectById(userId, input.projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  const turn = native.conversationCreate({
    projectId: input.projectId,
    userId,
    role: input.role,
    content: input.content,
    questionId: input.questionId || undefined,
    questionData: input.questionData ? JSON.stringify(input.questionData) : undefined,
    answerData: input.answerData ? JSON.stringify(input.answerData) : undefined,
    turnNumber: input.turnNumber ?? 0,
  });

  // Update project turn count
  native.projectUpdate(input.projectId, userId, {
    turnCount: (project.turnCount || 0) + 1,
  });

  return {
    id: turn.id,
    projectId: turn.projectId ?? turn.project_id,
    userId: turn.userId ?? turn.user_id,
    role: turn.role,
    content: turn.content,
    questionId: turn.questionId ?? turn.question_id,
    questionData: turn.questionData ? safeJsonParse(turn.questionData) : turn.question_data ? safeJsonParse(turn.question_data) : null,
    answerData: turn.answerData ? safeJsonParse(turn.answerData) : turn.answer_data ? safeJsonParse(turn.answer_data) : null,
    turnNumber: turn.turnNumber ?? turn.turn_number,
    createdAt: turn.createdAt ? new Date(turn.createdAt) : turn.created_at ? new Date(turn.created_at) : new Date(),
  };
}

export async function getProjectConversation(projectId: number, userId: number) {
  const project = await getProjectById(userId, projectId);
  if (!project) return null;

  const turns = native.conversationListByProject(projectId) || [];

  return turns.map((turn: any) => ({
    id: turn.id,
    projectId: turn.projectId ?? turn.project_id,
    userId: turn.userId ?? turn.user_id,
    role: turn.role,
    content: turn.content,
    questionId: turn.questionId ?? turn.question_id,
    questionData: turn.questionData ? safeJsonParse(turn.questionData) : turn.question_data ? safeJsonParse(turn.question_data) : null,
    answerData: turn.answerData ? safeJsonParse(turn.answerData) : turn.answer_data ? safeJsonParse(turn.answer_data) : null,
    turnNumber: turn.turnNumber ?? turn.turn_number,
    createdAt: turn.createdAt ? new Date(turn.createdAt) : turn.created_at ? new Date(turn.created_at) : new Date(),
  }));
}

export async function getProjectSummary(projectId: number, userId: number) {
  const project = await getProjectById(userId, projectId);
  if (!project) return null;

  const summary = native.summaryGetByProject(projectId);
  if (!summary) return null;

  return {
    id: summary.id,
    projectId: summary.projectId ?? summary.project_id,
    userId: summary.userId ?? summary.user_id,
    summary: summary.summary,
    requirements: summary.requirements ? safeJsonParse(summary.requirements, []) : [],
    constraints: summary.constraints ? safeJsonParse(summary.constraints, []) : [],
    suggestedFrameworks: (summary.suggestedFrameworks ?? summary.suggested_frameworks)
      ? safeJsonParse((summary.suggestedFrameworks ?? summary.suggested_frameworks), [])
      : [],
    rawContext: (summary.rawContext ?? summary.raw_context),
    isFinalized: (summary.isFinalized ?? summary.is_finalized) === 1,
    createdAt: (summary.createdAt ?? summary.created_at) ? new Date(summary.createdAt ?? summary.created_at) : new Date(),
    updatedAt: (summary.updatedAt ?? summary.updated_at) ? new Date(summary.updatedAt ?? summary.updated_at) : new Date(),
  };
}

/**
 * getFullDetail — single query that returns project + conversation + summary.
 * Merges 3 network/DB queries into 1 for the ProjectDetail page.
 */
export async function getFullDetail(userId: number, id: number) {
  const project = await getProjectById(userId, id);
  if (!project) return null;

  const [conversation, summary] = await Promise.all([
    getProjectConversation(id, userId),
    getProjectSummary(id, userId),
  ]);

  return {
    project,
    conversation,
    summary,
  };
}

export async function saveProjectSummary(
  userId: number,
  projectId: number,
  summary: string,
  requirements?: string[],
  constraints?: string[],
  suggestedFrameworks?: string[],
  rawContext?: string,
) {
  const project = await getProjectById(userId, projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  const result = native.summaryUpsert({
    projectId,
    userId,
    summary,
    requirements: requirements ? JSON.stringify(requirements) : undefined,
    constraints: constraints ? JSON.stringify(constraints) : undefined,
    suggestedFrameworks: suggestedFrameworks ? JSON.stringify(suggestedFrameworks) : undefined,
    rawContext: rawContext || undefined,
    isFinalized: 1,
  });

  return {
    id: result.id,
    projectId: result.projectId ?? result.project_id,
    userId: result.userId ?? result.user_id,
    summary: result.summary,
    requirements: result.requirements ? safeJsonParse(result.requirements, []) : [],
    constraints: result.constraints ? safeJsonParse(result.constraints, []) : [],
    suggestedFrameworks: (result.suggestedFrameworks ?? result.suggested_frameworks)
      ? safeJsonParse((result.suggestedFrameworks ?? result.suggested_frameworks), [])
      : [],
    rawContext: result.rawContext ?? result.raw_context,
    isFinalized: (result.isFinalized ?? result.is_finalized) === 1,
    createdAt: (result.createdAt ?? result.created_at) ? new Date(result.createdAt ?? result.created_at) : new Date(),
    updatedAt: (result.updatedAt ?? result.updated_at) ? new Date(result.updatedAt ?? result.updated_at) : new Date(),
  };
}
