/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */

import type {
  CreateProjectInput,
  UpdateProjectInput,
  SaveConversationTurnInput,
} from "./schemas";
import type { ProjectEntry as Project } from "@db/schema";

// ── Native Addon (Electron/Node main process) ─────────────
let native: any = null;
try {
  native = require("../../../native");
} catch {
  throw new Error("Native addon is required. Browser mode fallback removed in P5.");
}

/** Map native snake_case ProjectEntry → Drizzle-compatible camelCase */
function mapNativeProject(entry: any): Project | null {
  if (!entry) return null;
  return {
    id: entry.id,
    userId: entry.user_id,
    title: entry.title,
    description: entry.description,
    domain: entry.domain,
    status: entry.status,
    intent: entry.intent,
    clarificationStatus: entry.clarification_status,
    turnCount: entry.turn_count,
    createdAt: entry.created_at ? new Date(entry.created_at) : new Date(),
    updatedAt: entry.updated_at ? new Date(entry.updated_at) : new Date(),
  } as unknown as Project;
}

export async function createProject(
  userId: number,
  input: CreateProjectInput,
): Promise<Project> {
  const result = native.projectCreate({
    user_id: userId,
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
    clarification_status: input.clarificationStatus,
    turn_count: input.turnCount,
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
    project_id: input.projectId,
    user_id: userId,
    role: input.role,
    content: input.content,
    question_id: input.questionId || undefined,
    question_data: input.questionData ? JSON.stringify(input.questionData) : undefined,
    answer_data: input.answerData ? JSON.stringify(input.answerData) : undefined,
    turn_number: input.turnNumber ?? 0,
  });

  // Update project turn count
  native.projectUpdate(input.projectId, userId, {
    turn_count: (project.turnCount || 0) + 1,
  });

  return {
    id: turn.id,
    projectId: turn.project_id,
    userId: turn.user_id,
    role: turn.role,
    content: turn.content,
    questionId: turn.question_id,
    questionData: turn.question_data ? JSON.parse(turn.question_data) : null,
    answerData: turn.answer_data ? JSON.parse(turn.answer_data) : null,
    turnNumber: turn.turn_number,
    createdAt: turn.created_at ? new Date(turn.created_at) : new Date(),
  };
}

export async function getProjectConversation(projectId: number, userId: number) {
  const project = await getProjectById(userId, projectId);
  if (!project) return null;

  const turns = native.conversationListByProject(projectId) || [];

  return turns.map((turn: any) => ({
    id: turn.id,
    projectId: turn.project_id,
    userId: turn.user_id,
    role: turn.role,
    content: turn.content,
    questionId: turn.question_id,
    questionData: turn.question_data ? JSON.parse(turn.question_data) : null,
    answerData: turn.answer_data ? JSON.parse(turn.answer_data) : null,
    turnNumber: turn.turn_number,
    createdAt: turn.created_at ? new Date(turn.created_at) : new Date(),
  }));
}

export async function getProjectSummary(projectId: number, userId: number) {
  const project = await getProjectById(userId, projectId);
  if (!project) return null;

  const summary = native.summaryGetByProject(projectId);
  if (!summary) return null;

  return {
    id: summary.id,
    projectId: summary.project_id,
    userId: summary.user_id,
    summary: summary.summary,
    requirements: summary.requirements ? JSON.parse(summary.requirements) : [],
    constraints: summary.constraints ? JSON.parse(summary.constraints) : [],
    suggestedFrameworks: summary.suggested_frameworks
      ? JSON.parse(summary.suggested_frameworks)
      : [],
    rawContext: summary.raw_context,
    isFinalized: summary.is_finalized === 1,
    createdAt: summary.created_at ? new Date(summary.created_at) : new Date(),
    updatedAt: summary.updated_at ? new Date(summary.updated_at) : new Date(),
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
    project_id: projectId,
    user_id: userId,
    summary,
    requirements: requirements ? JSON.stringify(requirements) : undefined,
    constraints: constraints ? JSON.stringify(constraints) : undefined,
    suggested_frameworks: suggestedFrameworks ? JSON.stringify(suggestedFrameworks) : undefined,
    raw_context: rawContext || undefined,
    is_finalized: 1,
  });

  return {
    id: result.id,
    projectId: result.project_id,
    userId: result.user_id,
    summary: result.summary,
    requirements: result.requirements ? JSON.parse(result.requirements) : [],
    constraints: result.constraints ? JSON.parse(result.constraints) : [],
    suggestedFrameworks: result.suggested_frameworks
      ? JSON.parse(result.suggested_frameworks)
      : [],
    rawContext: result.raw_context,
    isFinalized: result.is_finalized === 1,
    createdAt: result.created_at ? new Date(result.created_at) : new Date(),
    updatedAt: result.updated_at ? new Date(result.updated_at) : new Date(),
  };
}
