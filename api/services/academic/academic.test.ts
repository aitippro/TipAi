import { describe, it, expect } from "vitest";
import {
  extractKeywords,
  generateReproducibilityReport,
  reportToMarkdown,
  getCitationFormats,
} from "./academic";

describe("academic tools", () => {
  describe("extractKeywords", () => {
    it("should extract keywords from Chinese text", () => {
      const result = extractKeywords("提示词工程的大型语言模型优化方法研究");
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain("提示");
    });

    it("should extract keywords from English text", () => {
      const result = extractKeywords("prompt engineering optimization for large language models");
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain("prompt");
    });

    it("should limit to 8 keywords", () => {
      const longText = "optimization model data analysis framework prompt llm ai generation".repeat(10);
      const result = extractKeywords(longText);
      expect(result.length).toBeLessThanOrEqual(8);
    });
  });

  describe("generateReproducibilityReport", () => {
    it("should create report with steps", () => {
      const report = generateReproducibilityReport("测试实验", [
        {
          step: 1,
          description: "第一步",
          prompt: "请分析数据",
          output: "分析结果",
          parameters: { temperature: 0.5 },
        },
      ]);

      expect(report.title).toBe("测试实验");
      expect(report.steps.length).toBe(1);
      expect(report.environment.platform).toContain("TipAi");
    });

    it("should include date", () => {
      const report = generateReproducibilityReport("测试", []);
      expect(report.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("reportToMarkdown", () => {
    it("should convert report to markdown", () => {
      const report = generateReproducibilityReport("MD测试", [
        {
          step: 1,
          description: "步骤一",
          prompt: "test prompt",
          output: "test output",
          parameters: { key: "value" },
        },
      ]);

      const md = reportToMarkdown(report);
      expect(md).toContain("# MD测试");
      expect(md).toContain("## 实验步骤");
      expect(md).toContain("test prompt");
      expect(md).toContain("test output");
    });
  });

  describe("getCitationFormats", () => {
    it("should return 5 formats", () => {
      const formats = getCitationFormats();
      expect(formats.length).toBe(5);
      expect(formats.map((f) => f.value)).toContain("apa");
      expect(formats.map((f) => f.value)).toContain("gb7714");
    });
  });
});
