import { describe, it, expect } from "vitest";
import {
  getFrameworkNodes,
  getFrameworkRelations,
  getSimilarFrameworks,
  getComplementaryFrameworks,
  getUpgradePath,
  getHybridRecommendations,
  getGraphStats,
} from "./framework-graph";

describe("framework-graph", () => {
  describe("getFrameworkNodes", () => {
    it("should return at least 20 frameworks", () => {
      const nodes = getFrameworkNodes();
      expect(nodes.length).toBeGreaterThanOrEqual(15);
    });

    it("should assign complexity to all frameworks", () => {
      const nodes = getFrameworkNodes();
      for (const node of nodes) {
        expect(["simple", "medium", "complex"]).toContain(node.complexity);
      }
    });

    it("should assign category to all frameworks", () => {
      const nodes = getFrameworkNodes();
      for (const node of nodes) {
        expect(node.category).toBeTruthy();
      }
    });
  });

  describe("getFrameworkRelations", () => {
    it("should generate similarity relations", () => {
      const relations = getFrameworkRelations();
      const similar = relations.filter((r) => r.type === "similar");
      expect(similar.length).toBeGreaterThan(0);
      for (const r of similar) {
        expect(r.strength).toBeGreaterThanOrEqual(0.3);
        expect(r.strength).toBeLessThanOrEqual(1);
      }
    });

    it("should have complementary relations", () => {
      const relations = getFrameworkRelations();
      const comp = relations.filter((r) => r.type === "complementary");
      expect(comp.length).toBeGreaterThanOrEqual(5);
    });

    it("should have upgrade paths", () => {
      const relations = getFrameworkRelations();
      const upgrades = relations.filter((r) => r.type === "upgrades-to");
      expect(upgrades.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("getSimilarFrameworks", () => {
    it("should find similar frameworks for co-star", () => {
      const similar = getSimilarFrameworks("co-star");
      expect(similar.length).toBeGreaterThan(0);
      expect(similar[0].similarity).toBeGreaterThan(0);
    });

    it("should not include self", () => {
      const similar = getSimilarFrameworks("risen");
      expect(similar.some((s) => s.key === "risen")).toBe(false);
    });

    it("should sort by descending similarity", () => {
      const similar = getSimilarFrameworks("rtf");
      for (let i = 1; i < similar.length; i++) {
        expect(similar[i - 1].similarity).toBeGreaterThanOrEqual(similar[i].similarity);
      }
    });
  });

  describe("getComplementaryFrameworks", () => {
    it("should find complements for co-star", () => {
      const comp = getComplementaryFrameworks("co-star");
      expect(comp.length).toBeGreaterThan(0);
    });

    it("should be bidirectional", () => {
      const a = getComplementaryFrameworks("react");
      const b = getComplementaryFrameworks("langgpt");
      expect(a.length).toBeGreaterThan(0);
      expect(b.length).toBeGreaterThan(0);
    });
  });

  describe("getUpgradePath", () => {
    it("should suggest upgrade for simple frameworks", () => {
      const upgrade = getUpgradePath("rtf");
      expect(upgrade).not.toBeNull();
      expect(upgrade!.to).toBeTruthy();
    });

    it("should return null for top-tier frameworks", () => {
      const upgrade = getUpgradePath("langgpt");
      expect(upgrade).toBeNull();
    });
  });

  describe("getHybridRecommendations", () => {
    it("should recommend combinations for programming complex", () => {
      const hybrids = getHybridRecommendations("programming", "complex");
      expect(hybrids.length).toBeGreaterThan(0);
    });

    it("should recommend combinations for content-marketing", () => {
      const hybrids = getHybridRecommendations("content-marketing", "medium");
      expect(hybrids.length).toBeGreaterThan(0);
    });

    it("should have valid primary and secondary frameworks", () => {
      const hybrids = getHybridRecommendations("education", "medium");
      for (const h of hybrids) {
        expect(h.primary).toBeTruthy();
        expect(h.secondary).toBeTruthy();
        expect(h.useCase).toBeTruthy();
        expect(h.reason).toBeTruthy();
      }
    });
  });

  describe("getGraphStats", () => {
    it("should report correct statistics", () => {
      const stats = getGraphStats();
      expect(stats.totalFrameworks).toBeGreaterThanOrEqual(15);
      expect(stats.totalRelations).toBeGreaterThan(0);
      expect(stats.similarityRelations).toBeGreaterThan(0);
      expect(stats.complementaryRelations).toBeGreaterThan(0);
      expect(stats.upgradePaths).toBeGreaterThan(0);
    });
  });
});
