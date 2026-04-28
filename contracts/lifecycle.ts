/**
 * F7: Prompt Development Lifecycle (PDLC)
 * Models prompts as assets across the full development lifecycle.
 */

/** Six standard lifecycle stages */
export const LIFECYCLE_STAGES = [
  { id: "clarify", label: "需求澄清", icon: "Search", color: "violet", order: 0 },
  { id: "design", label: "架构设计", icon: "PenTool", color: "blue", order: 1 },
  { id: "implement", label: "代码实现", icon: "Code", color: "emerald", order: 2 },
  { id: "test", label: "测试验证", icon: "FlaskConical", color: "amber", order: 3 },
  { id: "deploy", label: "部署交付", icon: "Rocket", color: "orange", order: 4 },
  { id: "maintain", label: "持续维护", icon: "RefreshCw", color: "slate", order: 5 },
] as const;

export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number]["id"];

/** Stage transition rules: which stages can follow which */
export const STAGE_TRANSITIONS: Record<LifecycleStage, LifecycleStage[]> = {
  clarify: ["design", "implement"],
  design: ["implement", "test"],
  implement: ["test", "deploy"],
  test: ["implement", "deploy"],
  deploy: ["maintain"],
  maintain: ["implement", "test", "deploy"],
};

/** Step with lifecycle context */
export interface LifecycleStep {
  id: number;
  projectId: number;
  title: string;
  description?: string | null;
  prompt: string;
  stage: LifecycleStage;
  orderNum: number;
  status: "pending" | "ready" | "executing" | "completed" | "skipped" | "error";
  output?: string | null;
  parentStepId?: number | null;
  model: string;
  temperature: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

/** Project pipeline summary */
export interface PipelineSummary {
  projectId: number;
  stages: Record<LifecycleStage, {
    total: number;
    completed: number;
    steps: Array<{ id: number; title: string; status: string }>;
  }>;
}
