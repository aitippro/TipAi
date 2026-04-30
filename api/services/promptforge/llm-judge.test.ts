import { describe, it, expect, vi } from "vitest";
import {
  judgePrompt,
  judgeBatch,
  calculateImprovement,
  type JudgeCandidate,
} from "./llm-judge";

// Mock callAI
vi.mock("../../lib/ai-service-v3/client", () => ({
  callAI: vi.fn(),
}));

import { callAI } from "../../lib/ai-service-v3/client";

function mockJudgeResponse(score: number) {
  return JSON.stringify({
    dimensions: {
      clarity: score,
      specificity: score - 1,
      completeness: score,
      actionability: score - 1,
      creativity: score,
      overall: score,
    },
    reasoning: `Score: ${score}`,
    suggestions: ["建议1", "建议2"],
  });
}

describe("LLM-as-Judge", () => {
  describe("judgePrompt", () => {
    it("returns parsed judge result", async () => {
      vi.mocked(callAI).mockResolvedValue(mockJudgeResponse(8));

      const result = await judgePrompt("kimi", "test-key", {
        id: "c1",
        prompt: "Write a poem",
        domain: "creative",
      });

      expect(result.dimensions.overall).toBe(8);
      expect(result.dimensions.clarity).toBe(8);
      expect(result.reasoning).toBe("Score: 8");
      expect(result.suggestions).toHaveLength(2);
    });

    it("clamps scores to 1-10 range", async () => {
      vi.mocked(callAI).mockResolvedValue(
        JSON.stringify({
          dimensions: { clarity: 15, specificity: -3, completeness: 5, actionability: 5, creativity: 5, overall: 20 },
          reasoning: "out of range",
          suggestions: [],
        }),
      );

      const result = await judgePrompt("kimi", "test-key", { id: "c1", prompt: "test" });
      expect(result.dimensions.clarity).toBe(10);
      expect(result.dimensions.specificity).toBe(1);
      expect(result.dimensions.overall).toBe(10);
    });

    it("returns fallback on parse error", async () => {
      vi.mocked(callAI).mockResolvedValue("invalid json");

      const result = await judgePrompt("kimi", "test-key", { id: "c1", prompt: "test" });
      expect(result.dimensions.overall).toBe(7);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it("returns fallback on null response", async () => {
      vi.mocked(callAI).mockResolvedValue(null);

      const result = await judgePrompt("kimi", "test-key", { id: "c1", prompt: "test" });
      expect(result.dimensions.overall).toBe(7);
    });
  });

  describe("judgeBatch", () => {
    it("evaluates multiple candidates and ranks them", async () => {
      let callCount = 0;
      vi.mocked(callAI).mockImplementation(async () => {
        callCount++;
        return mockJudgeResponse(5 + callCount); // 6, 7, 8
      });

      const candidates: JudgeCandidate[] = [
        { id: "c1", prompt: "A" },
        { id: "c2", prompt: "B" },
        { id: "c3", prompt: "C" },
      ];

      const result = await judgeBatch("kimi", "test-key", candidates);

      expect(result.ranked).toHaveLength(3);
      expect(result.ranked[0].id).toBe("c3"); // score 8
      expect(result.ranked[2].id).toBe("c1"); // score 6
      expect(result.topCandidate?.id).toBe("c3");
      expect(result.bottomCandidate?.id).toBe("c1");
      expect(result.avgScore).toBe(7);
      expect(result.results.size).toBe(3);
    });

    it("handles empty candidates", async () => {
      const result = await judgeBatch("kimi", "test-key", []);
      expect(result.ranked).toHaveLength(0);
      expect(result.topCandidate).toBeNull();
      expect(result.avgScore).toBe(0);
    });

    it("generates top-bottom analysis", async () => {
      let callCount = 0;
      vi.mocked(callAI).mockImplementation(async () => {
        callCount++;
        return mockJudgeResponse(callCount === 1 ? 9 : 5);
      });

      const candidates: JudgeCandidate[] = [
        { id: "c1", prompt: "A" },
        { id: "c2", prompt: "B" },
      ];

      const result = await judgeBatch("kimi", "test-key", candidates);
      expect(result.topBottomAnalysis).toContain("差距");
    });
  });

  describe("calculateImprovement", () => {
    it("calculates positive improvement", () => {
      expect(calculateImprovement(7, 9)).toBeCloseTo(28.6, 1);
    });

    it("calculates negative improvement", () => {
      expect(calculateImprovement(8, 6)).toBe(-25);
    });

    it("returns 0 for zero original score", () => {
      expect(calculateImprovement(0, 5)).toBe(0);
    });

    it("returns 0 for same score", () => {
      expect(calculateImprovement(7, 7)).toBe(0);
    });
  });
});
