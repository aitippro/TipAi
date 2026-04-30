import { describe, it, expect } from "vitest";
import {
  resolveDecodeStrategy,
  recommendStrategyForTask,
  estimateCost,
  calculateConfidence,
  strategyToLabel,
  STRATEGY_METAS,
  DEFAULT_STRATEGY_CONFIG,
  TASK_STRATEGY_RECOMMENDATIONS,
} from "./decoding-strategies";

describe("Decode Strategies", () => {
  describe("resolveDecodeStrategy", () => {
    it("defaults to sampling when no strategy provided", () => {
      const s = resolveDecodeStrategy();
      expect(s.type).toBe("sampling");
      expect(s.temperature).toBe(0.7);
      expect(s.sampleCount).toBe(1);
    });

    it("forces temperature to 0 for greedy strategy", () => {
      const s = resolveDecodeStrategy({ type: "greedy", temperature: 0.5 });
      expect(s.type).toBe("greedy");
      expect(s.temperature).toBe(0);
      expect(s.sampleCount).toBe(1);
    });

    it("allows custom temperature for sampling", () => {
      const s = resolveDecodeStrategy({ type: "sampling", temperature: 0.9 });
      expect(s.temperature).toBe(0.9);
      expect(s.sampleCount).toBe(1);
    });

    it("enforces sampleCount between 3 and 10 for self-consistency", () => {
      const s1 = resolveDecodeStrategy({ type: "self-consistency", sampleCount: 2 });
      expect(s1.sampleCount).toBe(3);

      const s2 = resolveDecodeStrategy({ type: "self-consistency", sampleCount: 15 });
      expect(s2.sampleCount).toBe(10);

      const s3 = resolveDecodeStrategy({ type: "self-consistency", sampleCount: 7 });
      expect(s3.sampleCount).toBe(7);
    });

    it("preserves user maxTokens", () => {
      const s = resolveDecodeStrategy({ type: "sampling", maxTokens: 2048 });
      expect(s.maxTokens).toBe(2048);
    });
  });

  describe("recommendStrategyForTask", () => {
    it("recommends self-consistency for analysis", () => {
      expect(recommendStrategyForTask("analysis")).toBe("self-consistency");
    });

    it("recommends self-consistency for code", () => {
      expect(recommendStrategyForTask("code")).toBe("self-consistency");
    });

    it("recommends sampling for creative", () => {
      expect(recommendStrategyForTask("creative")).toBe("sampling");
    });

    it("recommends sampling for chat", () => {
      expect(recommendStrategyForTask("chat")).toBe("sampling");
    });

    it("falls back to sampling for unknown task types", () => {
      expect(recommendStrategyForTask("unknown-task")).toBe("sampling");
    });
  });

  describe("estimateCost", () => {
    it("calculates cost for greedy strategy (1 path)", () => {
      const cost = estimateCost("Hello world", "gpt-4o-mini", {
        type: "greedy",
        temperature: 0,
        sampleCount: 1,
      });
      expect(cost.pathCount).toBe(1);
      expect(cost.estimatedCostUsd).toBeGreaterThan(0);
      expect(cost.pricingModel).toBe("gpt-4o-mini");
    });

    it("calculates higher cost for self-consistency (5 paths)", () => {
      const greedy = estimateCost("Explain quantum computing", "gpt-4o-mini", {
        type: "greedy",
        temperature: 0,
        sampleCount: 1,
      });

      const sc = estimateCost("Explain quantum computing", "gpt-4o-mini", {
        type: "self-consistency",
        temperature: 0.7,
        sampleCount: 5,
      });

      expect(sc.pathCount).toBe(5);
      expect(sc.totalTokens).toBe(greedy.totalTokens * 5);
      expect(sc.estimatedCostUsd).toBeCloseTo(greedy.estimatedCostUsd * 5, 4);
    });

    it("returns zero cost for Ollama models", () => {
      const cost = estimateCost("Hello", "llama3.2", {
        type: "self-consistency",
        temperature: 0.7,
        sampleCount: 5,
      });
      expect(cost.estimatedCostUsd).toBe(0);
      expect(cost.pricingModel).toBe("llama3.2");
    });

    it("falls back to gpt-4o-mini pricing for unknown models", () => {
      const cost = estimateCost("Hello", "some-unknown-model", {
        type: "sampling",
        temperature: 0.5,
      });
      expect(cost.pricingModel).toBe("gpt-4o-mini");
    });

    it("accepts custom expectedOutputLen", () => {
      const short = estimateCost("Hello", "gpt-4o-mini", { type: "greedy" }, 100);
      const long = estimateCost("Hello", "gpt-4o-mini", { type: "greedy" }, 4000);
      expect(long.completionTokensPerPath).toBeGreaterThan(short.completionTokensPerPath);
    });
  });

  describe("calculateConfidence", () => {
    it("returns 1.0 for unanimous votes", () => {
      const votes = new Map([["answer-a", 5]]);
      expect(calculateConfidence(votes, 5)).toBe(1.0);
    });

    it("returns 0.6 for 3/5 majority", () => {
      const votes = new Map([
        ["answer-a", 3],
        ["answer-b", 2],
      ]);
      expect(calculateConfidence(votes, 5)).toBe(0.6);
    });

    it("returns 0 for empty votes", () => {
      expect(calculateConfidence(new Map(), 0)).toBe(0);
    });

    it("handles tie correctly (returns highest / total)", () => {
      const votes = new Map([
        ["answer-a", 2],
        ["answer-b", 2],
        ["answer-c", 1],
      ]);
      expect(calculateConfidence(votes, 5)).toBe(0.4);
    });
  });

  describe("strategyToLabel", () => {
    it("labels greedy correctly", () => {
      expect(strategyToLabel({ type: "greedy", temperature: 0 })).toContain("贪心解码");
    });

    it("labels sampling with temperature", () => {
      expect(strategyToLabel({ type: "sampling", temperature: 0.8 })).toContain("T=0.8");
    });

    it("labels self-consistency with path count", () => {
      expect(strategyToLabel({ type: "self-consistency", sampleCount: 7 })).toContain("7 条路径");
    });
  });

  describe("STRATEGY_METAS", () => {
    it("has exactly 3 strategy metas", () => {
      expect(STRATEGY_METAS).toHaveLength(3);
    });

    it("covers all strategy types", () => {
      const types = STRATEGY_METAS.map((m) => m.type);
      expect(types).toContain("greedy");
      expect(types).toContain("sampling");
      expect(types).toContain("self-consistency");
    });
  });

  describe("DEFAULT_STRATEGY_CONFIG", () => {
    it("greedy has temperature 0", () => {
      expect(DEFAULT_STRATEGY_CONFIG.greedy.temperature).toBe(0);
    });

    it("self-consistency has sampleCount 5", () => {
      expect(DEFAULT_STRATEGY_CONFIG["self-consistency"].sampleCount).toBe(5);
    });
  });

  describe("TASK_STRATEGY_RECOMMENDATIONS", () => {
    it("maps all task types to a strategy", () => {
      const tasks = ["chat", "analysis", "code", "creative", "optimization", "classification", "default"];
      for (const task of tasks) {
        expect(TASK_STRATEGY_RECOMMENDATIONS[task]).toBeDefined();
      }
    });
  });
});
