import { describe, it, expect, vi } from "vitest";
import {
  submitFeedback,
  getFeedbackHistory,
  quickRate,
  type FeedbackSubmission,
} from "./feedback-engine";

// Mock native addon for test environment (no Rust binary in CI)
// NOTE: vi.mock factory cannot use vi.fn() because factory runs before imports are resolved
vi.mock("../../../native", () => ({
  evaluationCreate: (opts: Record<string, unknown>) => ({ id: Math.floor(Math.random() * 100000), ...opts }),
  evaluationStats: () => ({
    total_count: 2,
    avg_scores: { clarity: 7.5, relevance: 7, completeness: 8, actionability: 7.5, overall: 7.5 },
    trends: { clarity: "stable", relevance: "stable", completeness: "stable", actionability: "stable", overall: "stable" },
    top_issues: [],
    evolution_suggestion: "Continue monitoring feedback trends",
  }),
  evaluationList: (_projectId: number | null, _limit: number) => [
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
  ],
}));

describe("feedback-engine", () => {
  it("should submit feedback", async () => {
    const submission: FeedbackSubmission = {
      projectId: 1,
      userId: 1,
      scores: {
        clarity: 8,
        relevance: 7,
        completeness: 9,
        actionability: 8,
        overall: 8,
      },
      comment: "Very clear prompt",
    };

    const result = await submitFeedback(submission);
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(5); // 5 dimensions
  });

  it("should get feedback history", async () => {
    const history = await getFeedbackHistory(1);
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThan(0);
  });

  it("should quick rate", async () => {
    const result = await quickRate(1, 1, "clarity", 5);
    expect(typeof result).toBe("number");
  });
});
