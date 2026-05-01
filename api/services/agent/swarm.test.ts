import { describe, it, expect } from "vitest";
import {
  runSwarm,
  createAgent,
  getAvailableRoles,
  getCollaborationModes,
} from "./swarm";

describe("Agent Swarm", () => {
  it("should create agent with correct role", () => {
    const agent = createAgent("planner");
    expect(agent.role).toBe("planner");
    expect(agent.name).toBe("规划者");
    expect(agent.systemPrompt).toContain("规划");
  });

  it("should run sequential mode", async () => {
    const result = await runSwarm("测试任务", "sequential", ["planner", "executor"]);

    expect(result.mode).toBe("sequential");
    expect(result.tasks.length).toBe(2);
    expect(result.stats.completedTasks).toBe(2);
    expect(result.executionLog.length).toBeGreaterThanOrEqual(2);
  });

  it("should run parallel mode", async () => {
    const result = await runSwarm("测试任务", "parallel", ["executor", "reviewer"]);

    expect(result.mode).toBe("parallel");
    expect(result.tasks.length).toBe(2);
    expect(result.tasks.every((t) => t.status === "completed")).toBe(true);
  });

  it("should run hierarchical mode", async () => {
    const result = await runSwarm(
      "复杂分析任务",
      "hierarchical",
      ["planner", "executor", "reviewer", "optimizer", "coordinator"],
    );

    expect(result.mode).toBe("hierarchical");
    expect(result.agents.length).toBe(5);
    expect(result.tasks.length).toBeGreaterThanOrEqual(3);
    expect(result.finalOutput).toBeTruthy();
    expect(result.stats.totalTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("should include execution log", async () => {
    const result = await runSwarm("测试", "sequential", ["executor"]);
    expect(result.executionLog.length).toBeGreaterThanOrEqual(1);
    expect(result.executionLog[0]).toContain("[");
  });

  it("should return available roles", () => {
    const roles = getAvailableRoles();
    expect(roles.length).toBe(5);
    expect(roles.map((r) => r.role)).toContain("planner");
    expect(roles.map((r) => r.role)).toContain("coordinator");
  });

  it("should return collaboration modes", () => {
    const modes = getCollaborationModes();
    expect(modes.length).toBe(3);
    expect(modes.map((m) => m.mode)).toContain("sequential");
    expect(modes.map((m) => m.mode)).toContain("parallel");
    expect(modes.map((m) => m.mode)).toContain("hierarchical");
  });

  it("should handle single agent", async () => {
    const result = await runSwarm("简单任务", "sequential", ["executor"]);
    expect(result.tasks.length).toBe(1);
    expect(result.stats.completedTasks).toBe(1);
  });

  it("should have unique agent IDs", async () => {
    const result = await runSwarm("测试", "parallel", ["executor", "executor"]);
    const ids = result.agents.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should include task timestamps", async () => {
    const result = await runSwarm("测试", "sequential", ["planner"]);
    const task = result.tasks[0];
    expect(task.startedAt).toBeDefined();
    expect(task.completedAt).toBeDefined();
    expect(task.completedAt! >= task.startedAt!).toBe(true);
  });
});
