import { vi } from "vitest";

export const evaluationCreate = vi.fn((opts: Record<string, unknown>) => ({ id: Math.floor(Math.random() * 100000), ...opts }));
export const evaluationStats = vi.fn(() => ({
  total_count: 2,
  avg_scores: { clarity: 7.5, relevance: 7, completeness: 8, actionability: 7.5, overall: 7.5 },
  trends: { clarity: "stable", relevance: "stable", completeness: "stable", actionability: "stable", overall: "stable" },
  top_issues: [],
  evolution_suggestion: "Continue monitoring feedback trends",
}));
export const evaluationList = vi.fn((_projectId: number | null, _limit: number) => [
  {
    id: 1,
    project_id: 1,
    step_id: null,
    user_id: 1,
    dimension: "clarity",
    score: 8,
    feedback: "Very clear prompt",
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    project_id: 1,
    step_id: null,
    user_id: 1,
    dimension: "overall",
    score: 8,
    feedback: null,
    created_at: new Date().toISOString(),
  },
]);
