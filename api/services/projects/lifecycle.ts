/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * F7: Prompt Lifecycle Service
 * Manages steps across the full prompt development lifecycle.
 */

import { STAGE_TRANSITIONS } from "@contracts/lifecycle";
import type { LifecycleStage, PipelineSummary } from "@contracts/lifecycle";
import type { DecodeStrategy } from "../ai/decoding-strategies";

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

function mapNativeStep(entry: any) {
  const ds = entry.decodeStrategy ?? entry.decode_strategy;
  return {
    id: entry.id,
    projectId: entry.projectId ?? entry.project_id,
    title: entry.title,
    description: entry.description,
    prompt: entry.prompt,
    stage: entry.stage,
    orderNum: entry.orderNum ?? entry.order_num,
    status: entry.status,
    output: entry.output,
    parentStepId: entry.parentStepId ?? entry.parent_step_id,
    model: entry.model,
    temperature: entry.temperature,
    decodeStrategy: ds ? safeJsonParse<Record<string, unknown>>(typeof ds === "string" ? ds : JSON.stringify(ds)) : undefined,
    createdAt: entry.createdAt ? new Date(entry.createdAt) : entry.created_at ? new Date(entry.created_at) : new Date(),
    updatedAt: entry.updatedAt ? new Date(entry.updatedAt) : entry.updated_at ? new Date(entry.updated_at) : new Date(),
  };
}

export async function getProjectPipeline(userId: number, projectId: number): Promise<PipelineSummary> {
  // Ownership validation
  const project = native.projectGetById(projectId, userId);
  if (!project) throw new Error("Project not found or access denied");

  const allSteps = (native.stepList(projectId) || []).map(mapNativeStep);

  const stages = {} as PipelineSummary["stages"];

  const stageKeys: LifecycleStage[] = ["clarify", "design", "implement", "test", "deploy", "maintain"];
  for (const s of stageKeys) {
    const stageSteps = allSteps.filter((st: any) => st.stage === s);
    stages[s] = {
      total: stageSteps.length,
      completed: stageSteps.filter((st: any) => st.status === "completed").length,
      steps: stageSteps.map((st: any) => ({
        id: st.id,
        title: st.title,
        status: st.status,
      })),
    };
  }

  return { projectId, stages };
}

export async function moveStepStage(userId: number, stepId: number, toStage: LifecycleStage): Promise<void> {
  const step = native.stepGetById(stepId);
  if (!step) throw new Error("Step not found");

  // Ownership validation
  const project = native.projectGetById((step.projectId ?? step.project_id), userId);
  if (!project) throw new Error("Project not found or access denied");

  const fromStage = step.stage as LifecycleStage;
  const allowed = STAGE_TRANSITIONS[fromStage];
  if (!allowed.includes(toStage)) {
    throw new Error(`Cannot move from ${fromStage} to ${toStage}. Allowed: ${allowed.join(", ")}`);
  }

  native.stepUpdate(stepId, { stage: toStage });
}

export async function linkParentStep(userId: number, stepId: number, parentStepId: number): Promise<void> {
  const child = native.stepGetById(stepId);
  const parent = native.stepGetById(parentStepId);

  if (!child || !parent) throw new Error("Step not found");

  // Ownership validation
  const childProject = native.projectGetById((child.projectId ?? child.project_id), userId);
  if (!childProject) throw new Error("Project not found or access denied");

  const stageOrder = ["clarify", "design", "implement", "test", "deploy", "maintain"];
  if (stageOrder.indexOf(parent.stage) >= stageOrder.indexOf(child.stage)) {
    throw new Error("Parent step must be in an earlier stage than child step");
  }

  native.stepUpdate(stepId, { parentStepId });
}

export async function getChildSteps(userId: number, stepId: number) {
  const parent = native.stepGetById(stepId);
  if (!parent) return [];

  // Ownership validation
  const project = native.projectGetById((parent.projectId ?? parent.project_id), userId);
  if (!project) return [];
  const children = (native.stepList((parent.projectId ?? parent.project_id)) || [])
    .filter((s: any) => (s.parentStepId ?? s.parent_step_id) === stepId)
    .sort((a: any, b: any) => (a.order_num || 0) - (b.order_num || 0))
    .map(mapNativeStep);
  return children;
}

export async function createLifecycleStep(
  userId: number,
  input: {
    projectId: number;
    title: string;
    description?: string;
    prompt: string;
    stage: LifecycleStage;
    parentStepId?: number;
    model?: string;
    temperature?: number;
    decodeStrategy?: DecodeStrategy;
  }
) {
  // Ownership validation
  const project = native.projectGetById(input.projectId, userId);
  if (!project) throw new Error("Project not found or access denied");

  const allSteps = (native.stepList(input.projectId) || []);
  const stageSteps = allSteps.filter((s: any) => s.stage === input.stage);
  const nextOrder = (stageSteps.length > 0
    ? Math.max(...stageSteps.map((s: any) => (s.orderNum ?? s.order_num ?? 0)))
    : 0) + 1;

  const inserted = native.stepCreate({
    projectId: input.projectId,
    title: input.title,
    description: input.description || undefined,
    prompt: input.prompt,
    stage: input.stage,
    orderNum: nextOrder,
    parentStepId: input.parentStepId || undefined,
    model: input.model || "kimi",
    temperature: input.temperature ?? 0.7,
    decodeStrategy: input.decodeStrategy ? JSON.stringify(input.decodeStrategy) : undefined,
  });

  return mapNativeStep(inserted);
}
