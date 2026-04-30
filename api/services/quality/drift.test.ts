import { describe, it, expect } from "vitest";
import {
  textToVector,
  cosineSimilarity,
  detectDrift,
  compareVersions,
} from "./drift";

describe("drift detection", () => {
  describe("textToVector", () => {
    it("should tokenize and weight text", () => {
      const vec = textToVector("hello world hello");
      expect(vec.tokens).toContain("hello");
      expect(vec.tokens).toContain("world");
      expect(vec.weights.get("hello")).toBeGreaterThan(vec.weights.get("world") || 0);
    });

    it("should reduce stopword weights", () => {
      const vec = textToVector("the quick brown fox");
      expect(vec.weights.get("the") || 0).toBeLessThan(vec.weights.get("quick") || 1);
    });
  });

  describe("cosineSimilarity", () => {
    it("should return 1 for identical texts", () => {
      const a = textToVector("identical text here");
      const b = textToVector("identical text here");
      expect(cosineSimilarity(a, b)).toBeCloseTo(1, 3);
    });

    it("should return 0 for completely different texts", () => {
      const a = textToVector("abc xyz");
      const b = textToVector("123 456");
      expect(cosineSimilarity(a, b)).toBe(0);
    });

    it("should return intermediate value for partial overlap", () => {
      const a = textToVector("hello world foo");
      const b = textToVector("hello world bar");
      const sim = cosineSimilarity(a, b);
      expect(sim).toBeGreaterThan(0);
      expect(sim).toBeLessThan(1);
    });
  });

  describe("detectDrift", () => {
    it("should detect no drift for stable versions", () => {
      const versions = [
        { version: "v1", text: "分析用户行为数据，生成周报" },
        { version: "v2", text: "分析用户行为数据，生成周报，包含转化率" },
        { version: "v3", text: "分析用户行为数据，生成周报，包含转化率和留存率" },
      ];

      const result = detectDrift(versions);
      expect(result.hasDrift).toBe(false);
      expect(result.trend).toBe("stable");
    });

    it("should detect drift for diverging versions", () => {
      const versions = [
        { version: "v1", text: "分析用户行为数据，生成周报" },
        { version: "v2", text: "完全不同的内容，关于天气预测和气象分析" },
        { version: "v3", text: "又变成了另一个主题，关于股票市场和投资策略" },
      ];

      const result = detectDrift(versions);
      expect(result.hasDrift).toBe(true);
      expect(result.driftScore).toBeGreaterThan(0.3);
    });

    it("should detect degrading trend", () => {
      const versions = [
        { version: "v1", text: "Python 数据分析脚本，使用 pandas 处理 CSV" },
        { version: "v2", text: "Python 脚本，做一些数据处理" },
        { version: "v3", text: "写个程序处理数据" },
        { version: "v4", text: "程序" },
      ];

      const result = detectDrift(versions);
      expect(result.trend).toBe("degrading");
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should require at least 2 versions", () => {
      const result = detectDrift([{ version: "v1", text: "only one" }]);
      expect(result.hasDrift).toBe(false);
      expect(result.warnings[0]).toContain("至少 2 个版本");
    });

    it("should detect continuous decline", () => {
      const versions = [
        { version: "v1", text: "A B C D E F G H I J" },
        { version: "v2", text: "A B C D E F G H" },
        { version: "v3", text: "A B C D E F" },
        { version: "v4", text: "A B C D" },
        { version: "v5", text: "A B" },
      ];

      const result = detectDrift(versions);
      expect(result.hasDrift).toBe(true);
      const declineWarning = result.warnings.find((w) => w.includes("连续下降"));
      expect(declineWarning).toBeDefined();
    });
  });

  describe("compareVersions", () => {
    it("should compare two versions", () => {
      const result = compareVersions(
        "使用 Python pandas 分析数据",
        "使用 Python numpy 处理数据"
      );

      expect(result.similarity).toBeGreaterThan(0);
      expect(result.similarity).toBeLessThan(1);
      expect(result.commonTokens.length).toBeGreaterThan(0);
      expect(result.uniqueToA.length).toBeGreaterThanOrEqual(0);
      expect(result.uniqueToB.length).toBeGreaterThanOrEqual(0);
    });

    it("should identify common tokens", () => {
      const result = compareVersions("hello world", "hello universe");
      expect(result.commonTokens).toContain("hello");
      expect(result.uniqueToA).toContain("world");
      expect(result.uniqueToB).toContain("universe");
    });
  });
});
