/**
 * F7: Prompt Lifecycle Service
 * Manages steps across the full prompt development lifecycle.
 */

import { eq, and, asc } from "drizzle-orm";
import { steps } from "@db/schema";
import { getDb } from "../../queries/connection";
import { STAGE_TRANSITIONS } from "@contracts/lifecycle";
import type { LifecycleStage, PipelineSummary } from "@contracts/lifecycle";
import type { DecodeStrategy } from "../ai/decoding-strategies";

export async function getProjectPipeline(projectId: number): Promise<PipelineSummary> {
  const allSteps = await getDb()
    .select()
    .from(steps)
    .where(eq(steps.projectId, projectId))
    .orderBy(asc(steps.stage), asc(steps.orderNum));

  const stages = {} as PipelineSummary["stages"];

  const stageKeys: LifecycleStage[] = ["clarify", "design", "implement", "test", "deploy", "maintain"];
  for (const s of stageKeys) {
    const stageSteps = allSteps.filter((st) => st.stage === s);
    stages[s] = {
      total: stageSteps.length,
      completed: stageSteps.filter((st) => st.status === "completed").length,
      steps: stageSteps.map((st) => ({
        id: st.id,
        title: st.title,
        status: st.status,
      })),
    };
  }

  return { projectId, stages };
}

export async function moveStepStage(stepId: number, toStage: LifecycleStage): Promise<void> {
  const [step] = await getDb()
    .select()
    .from(steps)
    .where(eq(steps.id, stepId));

  if (!step) throw new Error("Step not found");

  const fromStage = step.stage as LifecycleStage;
  const allowed = STAGE_TRANSITIONS[fromStage];
  if (!allowed.includes(toStage)) {
    throw new Error(`Cannot move from ${fromStage} to ${toStage}. Allowed: ${allowed.join(", ")}`);
  }

  await getDb()
    .update(steps)
    .set({ stage: toStage, updatedAt: new Date() })
    .where(eq(steps.id, stepId));
}

export async function linkParentStep(stepId: number, parentStepId: number): Promise<void> {
  // Verify parent is in an earlier stage
  const [child] = await getDb().select().from(steps).where(eq(steps.id, stepId));
  const [parent] = await getDb().select().from(steps).where(eq(steps.id, parentStepId));

  if (!child || !parent) throw new Error("Step not found");

  const stageOrder = ["clarify", "design", "implement", "test", "deploy", "maintain"];
  if (stageOrder.indexOf(parent.stage) >= stageOrder.indexOf(child.stage)) {
    throw new Error("Parent step must be in an earlier stage than child step");
  }

  await getDb()
    .update(steps)
    .set({ parentStepId, updatedAt: new Date() })
    .where(eq(steps.id, stepId));
}

export async function getChildSteps(stepId: number) {
  return getDb()
    .select()
    .from(steps)
    .where(eq(steps.parentStepId, stepId))
    .orderBy(asc(steps.stage), asc(steps.orderNum));
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
  const maxOrder = await getDb()
    .select({ orderNum: steps.orderNum })
    .from(steps)
    .where(and(eq(steps.projectId, input.projectId), eq(steps.stage, input.stage)))
    .orderBy(asc(steps.orderNum))
    .all();

  const nextOrder = (maxOrder.length > 0 ? Math.max(...maxOrder.map((s) => s.orderNum)) : 0) + 1;

  const [inserted] = await getDb()
    .insert(steps)
    .values({
      projectId: input.projectId,
      title: input.title,
      description: input.description || null,
      prompt: input.prompt,
      stage: input.stage,
      orderNum: nextOrder,
      parentStepId: input.parentStepId || null,
      model: input.model || "kimi",
      temperature: input.temperature ?? 0.7,
      decodeStrategy: input.decodeStrategy ? JSON.stringify(input.decodeStrategy) : null,
    })
    .returning();

  return inserted;
}
