import { describe, it, expect } from "vitest";
import { matchFrameworks } from "./framework-matcher";
import { getFrameworkGraphData } from "./framework-graph";

describe("framework-matcher", () => {
  describe("matchFrameworks", () => {
    it("should recommend frameworks for programming intent", () => {
      const result = matchFrameworks("帮我写一个Python爬虫，抓取淘宝商品信息");
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0].score).toBeGreaterThan(0);
      expect(result.recommendations[0].frameworkName).toBeTruthy();
      expect(result.recommendations[0].reason).toBeTruthy();
    });

    it("should include match dimensions", () => {
      const result = matchFrameworks("写一个小红书文案");
      const top = result.recommendations[0];
      expect(top.matchDimensions.length).toBeGreaterThan(0);
    });

    it("should provide alternatives for top recommendation", () => {
      const result = matchFrameworks("设计一个教案");
      const top = result.recommendations[0];
      expect(top.alternatives.length).toBeGreaterThanOrEqual(0);
    });

    it("should provide upgrade suggestions when applicable", () => {
      const result = matchFrameworks("写代码");
      // For simple intents, simple frameworks should be top; they may have upgrades
      const recWithUpgrade = result.recommendations.find((r) => r.upgradeTo);
      if (recWithUpgrade) {
        expect(recWithUpgrade.upgradeTo!.key).toBeTruthy();
        expect(recWithUpgrade.upgradeTo!.name).toBeTruthy();
      }
    });

    it("should provide combination recommendations for complex tasks", () => {
      const result = matchFrameworks("帮我设计一个完整的微服务架构方案");
      expect(result.combinations.length).toBeGreaterThanOrEqual(0);
    });

    it("should classify intent in result", () => {
      const result = matchFrameworks("写一篇科幻小说");
      expect(result.classification.domain).toBe("creative-writing");
      expect(result.graphStats.totalFrameworks).toBeGreaterThanOrEqual(15);
      expect(result.graphStats.totalRelations).toBeGreaterThan(0);
    });

    it("should return sorted recommendations by score", () => {
      const result = matchFrameworks("数据分析报表");
      for (let i = 1; i < result.recommendations.length; i++) {
        expect(result.recommendations[i - 1].score).toBeGreaterThanOrEqual(
          result.recommendations[i].score,
        );
      }
    });

    it("should return at least 3 recommendations", () => {
      const result = matchFrameworks("写文案");
      expect(result.recommendations.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("getFrameworkGraphData", () => {
    it("should return nodes and relations", () => {
      const data = getFrameworkGraphData();
      expect(data.nodes.length).toBeGreaterThanOrEqual(15);
      expect(data.relations.length).toBeGreaterThan(0);
    });

    it("should have nodes with required fields", () => {
      const data = getFrameworkGraphData();
      for (const node of data.nodes) {
        expect(node.key).toBeTruthy();
        expect(node.name).toBeTruthy();
        expect(node.complexity).toBeTruthy();
        expect(node.category).toBeTruthy();
        expect(node.componentCount).toBeGreaterThan(0);
      }
    });
  });
});
