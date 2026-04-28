import { and, eq, desc } from "drizzle-orm";

import { projects, projectConversations, projectSummaries, type Project } from "@db/schema";
import { getDb } from "../../queries/connection";
import type {
  CreateProjectInput,
  UpdateProjectInput,
  SaveConversationTurnInput,
} from "./schemas";

export async function createProject(
  userId: number,
  input: CreateProjectInput,
): Promise<Project> {
  const [project] = await getDb()
    .insert(projects)
    .values({
      userId,
      title: input.title,
      description: input.description,
      intent: input.intent,
      domain: input.domain || "general",
      status: "draft",
      clarificationStatus: "pending",
      turnCount: 0,
    })
    .returning();

  return project;
}

export async function listUserProjects(userId: number) {
  return getDb()
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.updatedAt));
}

export async function getProjectById(userId: number, id: number) {
  const [project] = await getDb()
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)));

  return project || null;
}

export async function updateProject(
  userId: number,
  input: UpdateProjectInput,
): Promise<Project | null> {
  const existing = await getProjectById(userId, input.id);
  if (!existing) return null;

  const updateData: Record<string, unknown> = {};
  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.clarificationStatus !== undefined) updateData.clarificationStatus = input.clarificationStatus;
  if (input.turnCount !== undefined) updateData.turnCount = input.turnCount;
  updateData.updatedAt = new Date();

  const [project] = await getDb()
    .update(projects)
    .set(updateData)
    .where(and(eq(projects.id, input.id), eq(projects.userId, userId)))
    .returning();

  return project || null;
}

export async function deleteProject(userId: number, id: number): Promise<boolean> {
  const existing = await getProjectById(userId, id);
  if (!existing) return false;

  await getDb()
    .delete(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, userId)));

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

  const [turn] = await getDb()
    .insert(projectConversations)
    .values({
      projectId: input.projectId,
      userId,
      role: input.role,
      content: input.content,
      questionId: input.questionId ?? null,
      questionData: input.questionData ? JSON.stringify(input.questionData) : null,
      answerData: input.answerData ? JSON.stringify(input.answerData) : null,
      turnNumber: input.turnNumber ?? 0,
    })
    .returning();

  // Update project turn count
  await getDb()
    .update(projects)
    .set({
      turnCount: (project.turnCount || 0) + 1,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, input.projectId));

  return turn;
}

export async function getProjectConversation(projectId: number, userId: number) {
  const project = await getProjectById(userId, projectId);
  if (!project) return null;

  const turns = await getDb()
    .select()
    .from(projectConversations)
    .where(eq(projectConversations.projectId, projectId))
    .orderBy(projectConversations.turnNumber);

  return turns.map((turn) => ({
    ...turn,
    questionData: turn.questionData ? JSON.parse(turn.questionData) : null,
    answerData: turn.answerData ? JSON.parse(turn.answerData) : null,
  }));
}

export async function getProjectSummary(projectId: number, userId: number) {
  const project = await getProjectById(userId, projectId);
  if (!project) return null;

  const [summary] = await getDb()
    .select()
    .from(projectSummaries)
    .where(eq(projectSummaries.projectId, projectId));

  if (!summary) return null;

  return {
    ...summary,
    requirements: summary.requirements ? JSON.parse(summary.requirements) : [],
    constraints: summary.constraints ? JSON.parse(summary.constraints) : [],
    suggestedFrameworks: summary.suggestedFrameworks
      ? JSON.parse(summary.suggestedFrameworks)
      : [],
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

  const existing = await getDb()
    .select()
    .from(projectSummaries)
    .where(eq(projectSummaries.projectId, projectId));

  const data = {
    userId,
    projectId,
    summary,
    requirements: requirements ? JSON.stringify(requirements) : null,
    constraints: constraints ? JSON.stringify(constraints) : null,
    suggestedFrameworks: suggestedFrameworks ? JSON.stringify(suggestedFrameworks) : null,
    rawContext: rawContext ?? null,
    isFinalized: 1,
    updatedAt: new Date(),
  };

  if (existing.length > 0) {
    const [updated] = await getDb()
      .update(projectSummaries)
      .set(data)
      .where(eq(projectSummaries.projectId, projectId))
      .returning();
    return updated;
  }

  const [created] = await getDb()
    .insert(projectSummaries)
    .values({
      ...data,
      createdAt: new Date(),
    })
    .returning();

  return created;
}
