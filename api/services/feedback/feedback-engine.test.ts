import { describe, it, expect } from "vitest";
import {
  submitFeedback,
  getFeedbackStats,
  getFeedbackHistory,
  quickRate,
  type FeedbackSubmission,
} from "./feedback-engine";

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
  });

  it("should get feedback history", async () => {
    const history = await getFeedbackHistory(1);
    expect(Array.isArray(history)).toBe(true);
  });

  it("should quick rate", async () => {
    const result = await quickRate(1, 1, "clarity", 5);
    expect(typeof result).toBe("number");
  });
});
