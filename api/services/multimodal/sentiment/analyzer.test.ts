import { describe, it, expect } from "vitest";
import { tokenize, analyzeSentiment, computeTotalIntensity } from "./analyzer";

describe("sentiment analyzer", () => {
  describe("tokenize", () => {
    it("should split English text by non-alphanumeric separators", () => {
      expect(tokenize("This is amazing!")).toEqual(["this", "is", "amazing"]);
    });

    it("should perform greedy longest-match for Chinese", () => {
      const tokens = tokenize("这个产品太棒了");
      expect(tokens).toContain("太棒了");
      // "产品" is not in the lexicon, so it falls back to single chars
      expect(tokens).toContain("产");
      expect(tokens).toContain("品");
    });

    it("should fallback to single characters for unmatched CJK", () => {
      const tokens = tokenize("今天是星期一");
      expect(tokens).toContain("星期一");
      expect(tokens).toContain("今天");
      // "是" is not in the lexicon, so it falls back to a single char
      expect(tokens).toContain("是");
    });
  });

  describe("analyzeSentiment", () => {
    it("should return > 0.5 for strongly positive Chinese", () => {
      const score = analyzeSentiment("这个产品太好了，完美！");
      expect(score).toBeGreaterThan(0.5);
    });

    it("should return < -0.5 for strongly negative Chinese", () => {
      const score = analyzeSentiment("这个服务太差了，失望。");
      expect(score).toBeLessThan(-0.5);
    });

    it("should return ≈ 0 for neutral Chinese", () => {
      const score = analyzeSentiment("今天是星期一。");
      expect(score).toBeCloseTo(0, 1);
    });

    it("should return ≈ 0 for mixed positive/negative Chinese", () => {
      const score = analyzeSentiment("虽然不好，但是还可以。");
      expect(score).toBeCloseTo(0, 1);
    });

    it("should return > 0.5 for strongly positive English", () => {
      const score = analyzeSentiment("This is absolutely amazing!");
      expect(score).toBeGreaterThan(0.5);
    });

    it("should return 0 when no lexicon entries are hit", () => {
      const score = analyzeSentiment("the and is but");
      expect(score).toBe(0);
    });
  });

  describe("computeTotalIntensity", () => {
    it("should return 0 for zero inputs", () => {
      expect(computeTotalIntensity(0, 0)).toBe(0);
    });

    it("should clamp at 1.0", () => {
      expect(computeTotalIntensity(1.0, 1.0)).toBe(1.0);
    });

    it("should blend punctuation and sentiment correctly", () => {
      expect(computeTotalIntensity(0.5, 1.0)).toBe(0.8);
      expect(computeTotalIntensity(0.8, -1.0)).toBe(0.5);
    });

    it("should handle negative sentiment reducing intensity", () => {
      expect(computeTotalIntensity(0.2, -1.0)).toBeCloseTo(-0.1, 5);
    });
  });
});
