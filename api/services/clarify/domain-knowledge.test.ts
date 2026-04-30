import { describe, it, expect } from "vitest";
import {
  getDomainKnowledge,
  findMissingInfo,
  getKnowledgeStats,
} from "./domain-knowledge";

describe("domain-knowledge", () => {
  describe("getDomainKnowledge", () => {
    it("should return knowledge for all 11 domains", () => {
      const domains = [
        "content-marketing",
        "programming",
        "education",
        "data-analysis",
        "legal",
        "image-gen",
        "video-gen",
        "creative-writing",
        "product-management",
        "research",
        "customer-service",
      ];

      for (const domain of domains) {
        const knowledge = getDomainKnowledge(domain);
        expect(knowledge.bestPractices.length).toBeGreaterThanOrEqual(5);
        expect(knowledge.commonQuestions.length).toBeGreaterThanOrEqual(5);
        expect(knowledge.keyInformation.length).toBeGreaterThanOrEqual(4);
        expect(knowledge.defaultFramework).toBeTruthy();
        expect(knowledge.outputFormats.length).toBeGreaterThan(0);
      }
    });

    it("should return general knowledge for unknown domains", () => {
      const knowledge = getDomainKnowledge("unknown");
      expect(knowledge.bestPractices.length).toBeGreaterThan(0);
      expect(knowledge.defaultFramework).toBe("co-star");
    });
  });

  describe("findMissingInfo", () => {
    it("should identify missing key information", () => {
      const missing = findMissingInfo("programming", {
        技术栈: "Python",
      });
      expect(missing).toContain("运行环境");
      expect(missing).toContain("性能约束");
      expect(missing).toContain("输入输出");
    });

    it("should return empty when all info present", () => {
      const missing = findMissingInfo("programming", {
        技术栈: "Python",
        运行环境: "Linux",
        性能约束: "低延迟",
        输入输出: "JSON API",
        代码规范: "PEP8",
      });
      expect(missing.length).toBe(0);
    });

    it("should work for content-marketing domain", () => {
      const missing = findMissingInfo("content-marketing", {
        目标受众: "年轻女性",
      });
      expect(missing.length).toBeGreaterThan(0);
      expect(missing).toContain("发布平台");
    });
  });

  describe("getKnowledgeStats", () => {
    it("should count all domain knowledge entries", () => {
      const stats = getKnowledgeStats();
      expect(stats.domains).toBe(11);
      expect(stats.totalPractices).toBeGreaterThanOrEqual(55); // 11 * 5
      expect(stats.totalQuestions).toBeGreaterThanOrEqual(55);
    });
  });
});
