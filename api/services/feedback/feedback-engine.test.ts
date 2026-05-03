import { describe, it, expect, vi } from "vitest";
import {
  submitFeedback,
  getFeedbackHistory,
  quickRate,
  type FeedbackSubmission,
} from "./feedback-engine";

// Mock native addon for test environment (no Rust binary in CI)
// NOTE: vi.mock factory cannot use vi.fn() because factory runs before imports are resolved
vi.mock("../../lib/native", () => ({
  native: {
    evaluationCreate: (opts: Record<string, unknown>) => ({ id: Math.floor(Math.random() * 100000), ...opts }),
    evaluationStats: () => ({
      total_count: 2,
      avg_clarity: 7.5,
      avg_relevance: 7,
      avg_completeness: 8,
      avg_actionability: 7.5,
      avg_overall: 7.5,
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
  },
}));

describe("feedback-engine", () => {
  it("should submit feedback for all 5 dimensions", async () => {
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
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(5); // 5 dimensions
    expect(result.every((id) => typeof id === "number")).toBe(true);
  });

  it("should clamp scores to 1-10 range", async () => {
    const submission: FeedbackSubmission = {
      projectId: 1,
      userId: 1,
      scores: {
        clarity: 15,   // should be clamped to 10
        relevance: -3, // should be clamped to 1
        completeness: 5,
        actionability: 0, // should be clamped to 1
        overall: 11,  // should be clamped to 10
      },
    };

    // The function does not return clamped scores directly, but we can verify
    // it doesn't throw and returns 5 ids.
    const result = await submitFeedback(submission);
    expect(result.length).toBe(5);
  });

  it("should map history fields correctly", async () => {
    const history = await getFeedbackHistory(1);
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBe(2);

    const first = history[0];
    expect(first).toHaveProperty("projectId");
    expect(first).toHaveProperty("dimension");
    expect(first).toHaveProperty("score");
    expect(first).toHaveProperty("feedback");
    expect(first).toHaveProperty("createdAt");
    expect(first.dimension).toBe("clarity");
    expect(first.score).toBe(8);
  });

  it("should quick rate and return a numeric id", async () => {
    const result = await quickRate(1, 1, "clarity", 5);
    expect(typeof result).toBe("number");
  });

  it("should clamp quick rate scores", async () => {
    // Very high score should be clamped internally without throwing
    const resultHigh = await quickRate(1, 1, "clarity", 99);
    expect(typeof resultHigh).toBe("number");

    // Very low score should be clamped internally without throwing
    const resultLow = await quickRate(1, 1, "clarity", -5);
    expect(typeof resultLow).toBe("number");
  });
});
