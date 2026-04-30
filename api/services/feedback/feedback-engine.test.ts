import { describe, it, expect, beforeEach } from "vitest";
import {
  submitFeedback,
  getFeedbackStats,
  getFeedbackHistory,
  quickRate,
  type FeedbackSubmission,
} from "./feedback-engine";
import { getDb } from "../../queries/connection";
import { evaluations } from "@db/schema";

describe("feedback-engine", () => {
  beforeEach(async () => {
    const db = getDb();
    await db.delete(evaluations);
  });

  it("should submit multi-dimension feedback", async () => {
    const input: FeedbackSubmission = {
      projectId: 1,
      userId: 1,
      scores: {
        clarity: 8,
        relevance: 7,
        completeness: 9,
        actionability: 6,
        overall: 7,
      },
      comment: "整体不错，但可操作性有待提升",
    };

    const ids = await submitFeedback(input);
    expect(ids.length).toBe(5);
  });

  it("should clamp scores to 1-10", async () => {
    const input: FeedbackSubmission = {
      projectId: 1,
      userId: 1,
      scores: {
        clarity: 15,
        relevance: 0,
        completeness: 5,
        actionability: 5,
        overall: 5,
      },
    };

    await submitFeedback(input);
    const stats = await getFeedbackStats(1);
    expect(stats.avgScores.clarity).toBe(10);
    expect(stats.avgScores.relevance).toBe(1);
  });

  it("should calculate stats correctly", async () => {
    await submitFeedback({
      projectId: 1,
      userId: 1,
      scores: { clarity: 8, relevance: 7, completeness: 9, actionability: 6, overall: 7 },
    });

    await submitFeedback({
      projectId: 1,
      userId: 2,
      scores: { clarity: 6, relevance: 8, completeness: 7, actionability: 7, overall: 7 },
    });

    const stats = await getFeedbackStats(1);
    expect(stats.totalCount).toBe(2);
    expect(stats.avgScores.clarity).toBe(7);
    expect(stats.avgScores.relevance).toBe(7.5);
    expect(stats.avgScores.overall).toBe(7);
  });

  it("should return empty stats for no data", async () => {
    const stats = await getFeedbackStats(999);
    expect(stats.totalCount).toBe(0);
    expect(stats.avgScores.clarity).toBeNull();
    expect(stats.evolutionSuggestion).toContain("暂无反馈");
  });

  it("should detect trends", async () => {
    // Submit 5 batches to have enough data for trend analysis
    for (let i = 0; i < 5; i++) {
      await submitFeedback({
        projectId: 2,
        userId: 1,
        scores: {
          clarity: 5 + i, // improving: 5, 6, 7, 8, 9
          relevance: 5,
          completeness: 5,
          actionability: 5,
          overall: 5 + i,
        },
      });
    }

    const stats = await getFeedbackStats(2);
    expect(stats.trends.clarity).toBe("up");
    expect(stats.trends.relevance).toBe("stable");
  });

  it("should identify top issues", async () => {
    await submitFeedback({
      projectId: 3,
      userId: 1,
      scores: { clarity: 9, relevance: 9, completeness: 9, actionability: 4, overall: 7 },
    });

    const stats = await getFeedbackStats(3);
    expect(stats.topIssues.length).toBeGreaterThanOrEqual(1);
    expect(stats.topIssues[0].dimension).toBe("actionability");
  });

  it("should get feedback history", async () => {
    await submitFeedback({
      projectId: 4,
      userId: 1,
      scores: { clarity: 8, relevance: 7, completeness: 9, actionability: 6, overall: 7 },
    });

    const history = await getFeedbackHistory(4);
    expect(history.length).toBe(5);
    expect(history[0]).toHaveProperty("dimension");
    expect(history[0]).toHaveProperty("score");
  });

  it("should support quick rate", async () => {
    const id = await quickRate(5, 1, "overall", 8, "Good!");
    expect(id).toBeGreaterThan(0);

    const history = await getFeedbackHistory(5);
    expect(history.length).toBe(1);
    expect(history[0].dimension).toBe("overall");
    expect(history[0].score).toBe(8);
  });
});
