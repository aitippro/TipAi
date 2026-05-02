/**
 * F7: Prompt Lifecycle Service
 * Manages steps across the full prompt development lifecycle.
 */

import { STAGE_TRANSITIONS } from "@contracts/lifecycle";
import type { LifecycleStage, PipelineSummary } from "@contracts/lifecycle";
import type { DecodeStrategy } from "../ai/decoding-strategies";

// ── Native Addon (Electron/Node main process) ─────────────
let native: any = null;
try {
  native = require("../../../../native");
} catch {
  throw new Error("Native addon is required. Browser mode fallback removed in P5.");
}

function mapNativeStep(entry: any) {
  return {
    id: entry.id,
    projectId: entry.project_id,
    title: entry.title,
    description: entry.description,
    prompt: entry.prompt,
    stage: entry.stage,
    orderNum: entry.order_num,
    status: entry.status,
    output: entry.output,
    parentStepId: entry.parent_step_id,
    model: entry.model,
    temperature: entry.temperature,
    decodeStrategy: entry.decode_strategy ? JSON.parse(entry.decode_strategy) : undefined,
    createdAt: entry.created_at ? new Date(entry.created_at) : new Date(),
    updatedAt: entry.updated_at ? new Date(entry.updated_at) : new Date(),
  };
}

export async function getProjectPipeline(projectId: number): Promise<PipelineSummary> {
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

export async function moveStepStage(stepId: number, toStage: LifecycleStage): Promise<void> {
  const step = native.stepGetById(stepId);
  if (!step) throw new Error("Step not found");

  const fromStage = step.stage as LifecycleStage;
  const allowed = STAGE_TRANSITIONS[fromStage];
  if (!allowed.includes(toStage)) {
    throw new Error(`Cannot move from ${fromStage} to ${toStage}. Allowed: ${allowed.join(", ")}`);
  }

  native.stepUpdate(stepId, { stage: toStage });
}

export async function linkParentStep(stepId: number, parentStepId: number): Promise<void> {
  const child = native.stepGetById(stepId);
  const parent = native.stepGetById(parentStepId);

  if (!child || !parent) throw new Error("Step not found");

  const stageOrder = ["clarify", "design", "implement", "test", "deploy", "maintain"];
  if (stageOrder.indexOf(parent.stage) >= stageOrder.indexOf(child.stage)) {
    throw new Error("Parent step must be in an earlier stage than child step");
  }

  native.stepUpdate(stepId, { parent_step_id: parentStepId });
}

export async function getChildSteps(stepId: number) {
  const parent = native.stepGetById(stepId);
  if (!parent) return [];
  const children = (native.stepList(parent.project_id) || [])
    .filter((s: any) => s.parent_step_id === stepId)
    .sort((a: any, b: any) => (a.order_num || 0) - (b.order_num || 0))
    .map(mapNativeStep);
  return children;
}

export async function createLifecycleStep(input: {
  projectId: number;
  title: string;
  description?: string;
  prompt: string;
  stage: LifecycleStage;
  parentStepId?: number;
  model?: string;
  temperature?: number;
  decodeStrategy?: DecodeStrategy;
}) {
  const allSteps = (native.stepList(input.projectId) || []);
  const stageSteps = allSteps.filter((s: any) => s.stage === input.stage);
  const nextOrder = (stageSteps.length > 0
    ? Math.max(...stageSteps.map((s: any) => s.order_num || 0))
    : 0) + 1;

  const inserted = native.stepCreate({
    project_id: input.projectId,
    title: input.title,
    description: input.description || undefined,
    prompt: input.prompt,
    stage: input.stage,
    order_num: nextOrder,
    parent_step_id: input.parentStepId || undefined,
    model: input.model || "kimi",
    temperature: input.temperature ?? 0.7,
    decode_strategy: input.decodeStrategy ? JSON.stringify(input.decodeStrategy) : undefined,
  });

  return mapNativeStep(inserted);
}
