import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  runTreeOfThoughts,
  setTotGenerator,
  setTotEvaluator,
  flattenTreeLevels,
} from "./tree-of-thoughts";

describe("Tree of Thoughts Engine", () => {
  beforeEach(() => {
    setTotGenerator(async (_problem, currentThought, breadth) => {
      // Mock: generate numbered candidates
      const base = currentThought ?? "start";
      return Array.from({ length: breadth }, (_, i) => `${base}-c${i + 1}`);
    });

    setTotEvaluator(async (_problem, thought, _path) => {
      // Mock: score based on content length heuristic
      const len = thought.length;
      const value = Math.min(10, Math.max(1, len % 10));
      return { value, isTerminal: value >= 9, reason: `len=${len}` };
    });
  });

  afterEach(() => {
    setTotGenerator(async () => []);
    setTotEvaluator(async () => ({ value: 0, isTerminal: false, reason: "" }));
  });

  it("should create root node from problem", async () => {
    const result = await runTreeOfThoughts("Solve 24 using 4, 5, 6", {
      strategy: "bfs",
      breadth: 2,
      maxDepth: 1,
      maxNodes: 10,
    });

    expect(result.rootId).toBe("t0");
    expect(result.tree[result.rootId].content).toBe("Solve 24 using 4, 5, 6");
    expect(result.tree[result.rootId].parentId).toBeNull();
  });

  it("should generate candidates and evaluate them", async () => {
    const result = await runTreeOfThoughts("test", {
      strategy: "bfs",
      breadth: 3,
      maxDepth: 2,
      maxNodes: 20,
    });

    // Root + 3 children at depth 1
    const depth1 = Object.values(result.tree).filter((n) => n.depth === 1);
    expect(depth1.length).toBe(3);

    // All children should be evaluated
    for (const node of depth1) {
      expect(node.value).not.toBeNull();
    }
  });

  it("should respect maxDepth in BFS", async () => {
    const result = await runTreeOfThoughts("test", {
      strategy: "bfs",
      breadth: 2,
      maxDepth: 2,
      valueThreshold: 1, // low threshold so all expand
      maxNodes: 50,
    });

    const maxDepth = Math.max(...Object.values(result.tree).map((n) => n.depth));
    expect(maxDepth).toBeLessThanOrEqual(2);
  });

  it("should respect maxNodes limit", async () => {
    const result = await runTreeOfThoughts("test", {
      strategy: "bfs",
      breadth: 5,
      maxDepth: 10,
      valueThreshold: 1,
      maxNodes: 8,
    });

    expect(Object.keys(result.tree).length).toBeLessThanOrEqual(8);
  });

  it("should return best path", async () => {
    const result = await runTreeOfThoughts("test", {
      strategy: "bfs",
      breadth: 2,
      maxDepth: 2,
      maxNodes: 20,
    });

    expect(result.bestPath.length).toBeGreaterThanOrEqual(1);
    expect(result.bestPath[0].id).toBe(result.rootId);
    expect(result.bestPath[result.bestPath.length - 1].depth).toBeGreaterThanOrEqual(0);
  });

  it("should include stats", async () => {
    const result = await runTreeOfThoughts("test", {
      strategy: "bfs",
      breadth: 2,
      maxDepth: 2,
      maxNodes: 20,
    });

    expect(result.stats.totalNodes).toBeGreaterThanOrEqual(1);
    expect(result.stats.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(result.stats.maxDepth).toBeGreaterThanOrEqual(0);
  });

  it("should work with DFS strategy", async () => {
    const result = await runTreeOfThoughts("test", {
      strategy: "dfs",
      breadth: 2,
      maxDepth: 3,
      valueThreshold: 1,
      maxNodes: 20,
    });

    expect(Object.keys(result.tree).length).toBeGreaterThanOrEqual(3);
    expect(result.stats.totalNodes).toBeGreaterThanOrEqual(1);
  });

  it("should not expand below valueThreshold", async () => {
    setTotEvaluator(async () => ({ value: 2, isTerminal: false, reason: "low" }));

    const result = await runTreeOfThoughts("test", {
      strategy: "bfs",
      breadth: 2,
      maxDepth: 3,
      valueThreshold: 8, // high threshold
      maxNodes: 20,
    });

    // Only root + depth1 children, no deeper expansion
    const maxDepth = Math.max(...Object.values(result.tree).map((n) => n.depth));
    expect(maxDepth).toBe(1);
  });

  it("should mark terminal nodes", async () => {
    setTotEvaluator(async (_problem, thought) => ({
      value: thought.includes("c1") ? 10 : 5,
      isTerminal: thought.includes("c1"),
      reason: "mock",
    }));

    const result = await runTreeOfThoughts("test", {
      strategy: "bfs",
      breadth: 2,
      maxDepth: 3,
      maxNodes: 20,
    });

    const terminalNodes = Object.values(result.tree).filter((n) => n.isTerminal);
    expect(terminalNodes.length).toBeGreaterThanOrEqual(1);
  });

  it("should flatten tree to levels", async () => {
    const result = await runTreeOfThoughts("test", {
      strategy: "bfs",
      breadth: 2,
      maxDepth: 2,
      maxNodes: 20,
    });

    const levels = flattenTreeLevels(result.tree, result.rootId);
    expect(levels.length).toBeGreaterThanOrEqual(1);
    expect(levels[0].length).toBe(1); // root only
    expect(levels[1].length).toBe(2); // 2 children
  });

  it("should throw if generator not set", async () => {
    setTotGenerator(null);
    await expect(
      runTreeOfThoughts("test", { maxNodes: 10 }),
    ).rejects.toThrow("not initialized");
  });

  it("should throw if evaluator not set", async () => {
    setTotEvaluator(null);
    await expect(
      runTreeOfThoughts("test", { maxNodes: 10 }),
    ).rejects.toThrow("not initialized");
  });
});
