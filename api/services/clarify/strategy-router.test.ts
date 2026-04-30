import { describe, it, expect } from "vitest";
import {
  generateClarifyStrategy,
  evaluateQuestionQuality,
  getAllFrameworkRecommendations,
} from "./strategy-router";

describe("strategy-router", () => {
  describe("generateClarifyStrategy", () => {
    it("should generate strategy for programming intent", () => {
      const strategy = generateClarifyStrategy("帮我写一个Python爬虫，抓取淘宝商品信息");
      expect(strategy.followUpQuestions.length).toBeGreaterThanOrEqual(2);
      expect(strategy.followUpQuestions.length).toBeLessThanOrEqual(4);
      expect(strategy.completenessScore).toBeGreaterThanOrEqual(0);
      expect(strategy.completenessScore).toBeLessThanOrEqual(100);
      expect(strategy.suggestedRounds).toBeGreaterThanOrEqual(1);
      expect(strategy.suggestedRounds).toBeLessThanOrEqual(3);
      expect(strategy.frameworkRecommendation.framework).toBeTruthy();
      expect(strategy.frameworkRecommendation.score).toBeGreaterThan(0);
      expect(strategy.frameworkRecommendation.reason).toBeTruthy();
      expect(strategy.frameworkRecommendation.alternatives.length).toBe(3);
      expect(strategy.strategyDescription).toContain("programming");
    });

    it("should generate strategy for content-marketing intent", () => {
      const strategy = generateClarifyStrategy("帮我写一个小红书文案推广防晒霜");
      expect(strategy.followUpQuestions.length).toBeGreaterThanOrEqual(2);
      expect(strategy.frameworkRecommendation.framework).toBeTruthy();
      expect(strategy.strategyDescription).toContain("content-marketing");
    });

    it("should generate strategy for creative-writing intent", () => {
      const strategy = generateClarifyStrategy("写一个科幻小说，关于AI觉醒");
      expect(strategy.followUpQuestions.length).toBeGreaterThanOrEqual(2);
      expect(strategy.frameworkRecommendation.alternatives.length).toBe(3);
    });

    it("should increase completeness score when answers provided", () => {
      const withoutAnswers = generateClarifyStrategy("帮我写一个Python爬虫");
      const withAnswers = generateClarifyStrategy("帮我写一个Python爬虫", {
        技术栈: "Python 3.11",
        运行环境: "Linux服务器",
        性能约束: "每秒100请求",
        输入输出: "JSON",
      });
      expect(withAnswers.completenessScore).toBeGreaterThanOrEqual(withoutAnswers.completenessScore);
    });

    it("should suggest fewer rounds when info is complete", () => {
      const strategy = generateClarifyStrategy("写代码", {
        技术栈: "Python",
        运行环境: "Linux",
        性能约束: "低延迟",
        输入输出: "API",
        代码规范: "PEP8",
      });
      expect(strategy.suggestedRounds).toBe(1);
      expect(strategy.completenessScore).toBeGreaterThanOrEqual(80);
    });

    it("should limit questions to max 4", () => {
      const strategy = generateClarifyStrategy("帮我做点什么");
      expect(strategy.followUpQuestions.length).toBeLessThanOrEqual(4);
    });

    it("should include domain-specific questions", () => {
      const strategy = generateClarifyStrategy("帮我写一个小红书文案");
      // Should contain at least one question about platform/audience/goal
      const hasDomainQuestion = strategy.followUpQuestions.some((q) =>
        q.includes("平台") || q.includes("受众") || q.includes("目标") || q.includes("品牌"),
      );
      expect(hasDomainQuestion).toBe(true);
    });
  });

  describe("framework recommendation", () => {
    it("should recommend risen for programming tasks", () => {
      const strategy = generateClarifyStrategy("写一个API接口，用Node.js");
      expect(strategy.frameworkRecommendation.framework).toBe("risen");
      expect(strategy.frameworkRecommendation.score).toBeGreaterThanOrEqual(70);
    });

    it("should recommend co-star for product-management", () => {
      const strategy = generateClarifyStrategy("写一个PRD，设计新功能");
      expect(strategy.frameworkRecommendation.framework).toBe("co-star");
    });

    it("should provide meaningful reason", () => {
      const strategy = generateClarifyStrategy("分析销售数据");
      expect(strategy.frameworkRecommendation.reason).toContain("匹配度");
      expect(strategy.frameworkRecommendation.reason.length).toBeGreaterThan(10);
    });

    it("should provide 3 alternatives", () => {
      const strategy = generateClarifyStrategy("写教案");
      expect(strategy.frameworkRecommendation.alternatives).toHaveLength(3);
      for (const alt of strategy.frameworkRecommendation.alternatives) {
        expect(alt.framework).toBeTruthy();
        expect(alt.score).toBeGreaterThan(0);
        expect(alt.reason).toBeTruthy();
      }
    });
  });

  describe("evaluateQuestionQuality", () => {
    it("should score high for good questions", () => {
      const result = evaluateQuestionQuality(
        [
          "使用什么编程语言和技术栈？",
          "目标运行环境是什么？",
          "输入数据的格式和范围是什么？",
        ],
        { domain: "programming", subDomain: "web-dev", taskType: "code-generation", confidence: 0.8, matchedKeywords: [], suggestedFrameworks: [] },
      );
      expect(result.score).toBeGreaterThan(70);
      expect(result.feedback).toContain("追问覆盖了部分关键信息点");
    });

    it("should score low for too few questions", () => {
      const result = evaluateQuestionQuality(
        ["使用什么语言？"],
        { domain: "programming", subDomain: "web-dev", taskType: "code-generation", confidence: 0.8, matchedKeywords: [], suggestedFrameworks: [] },
      );
      expect(result.score).toBeLessThan(70);
      expect(result.feedback).toContain("追问数量过少");
    });

    it("should score low for too many questions", () => {
      const result = evaluateQuestionQuality(
        ["Q1?", "Q2?", "Q3?", "Q4?", "Q5?", "Q6?"],
        { domain: "programming", subDomain: "web-dev", taskType: "code-generation", confidence: 0.8, matchedKeywords: [], suggestedFrameworks: [] },
      );
      expect(result.score).toBeLessThan(80);
      expect(result.feedback).toContain("追问数量过多");
    });
  });

  describe("getAllFrameworkRecommendations", () => {
    it("should return ranked framework list", () => {
      const recs = getAllFrameworkRecommendations("programming");
      expect(recs.length).toBeGreaterThanOrEqual(4);
      expect(recs[0].score).toBeGreaterThanOrEqual(recs[1].score);
      expect(recs[1].score).toBeGreaterThanOrEqual(recs[2].score);
    });
  });
});
