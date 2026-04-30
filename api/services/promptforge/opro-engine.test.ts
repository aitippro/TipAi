import { describe, it, expect, vi, beforeEach } from "vitest";
import { runOPRO } from "./opro-engine";

// Mock dependencies
vi.mock("../../lib/ai-service-v3/client", () => ({
  callAI: vi.fn(),
}));

vi.mock("./llm-judge", () => ({
  judgePrompt: vi.fn(),
  judgeBatch: vi.fn(),
  calculateImprovement: vi.fn((orig, fin) => Number((((fin - orig) / orig) * 100).toFixed(1))),
}));

import { callAI } from "../../lib/ai-service-v3/client";
import { judgePrompt, judgeBatch } from "./llm-judge";

function mockJudgeResult(overall: number) {
  return {
    dimensions: {
      clarity: overall,
      specificity: overall,
      completeness: overall,
      actionability: overall,
      creativity: overall,
      overall,
    },
    reasoning: `Score ${overall}`,
    suggestions: [],
  };
}

describe("OPRO Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns immediately if baseline already meets target", async () => {
    vi.mocked(judgePrompt).mockResolvedValue(mockJudgeResult(9));

    const result = await runOPRO("test prompt", {
      judgeProvider: "kimi",
      judgeApiKey: "key",
      optimizerProvider: "kimi",
      optimizerApiKey: "key",
      targetScore: 9,
      maxIterations: 3,
      candidatesPerIteration: 5,
      topKHistory: 3,
      earlyStopPatience: 1,
    });

    expect(result.stopReason).toBe("target_reached");
    expect(result.finalPrompt).toBe("test prompt");
    expect(result.finalScore).toBe(9);
    expect(result.actualIterations).toBe(0);
    expect(result.iterations).toHaveLength(0);
  });

  it("runs iterations and finds better prompt", async () => {
    // Baseline: 5
    vi.mocked(judgePrompt).mockResolvedValueOnce(mockJudgeResult(5));

    // Meta-prompt generates candidates
    vi.mocked(callAI).mockResolvedValue(
      JSON.stringify([
        { prompt: "Better prompt A", strategy: "add examples" },
        { prompt: "Better prompt B", strategy: "restructure" },
      ]),
    );

    // Batch judge: A=7, B=6
    // Note: nextId() generates c-1, c-2, etc.
    vi.mocked(judgeBatch).mockResolvedValue({
      results: new Map(),
      ranked: [
        { id: "c-1", score: 7, result: mockJudgeResult(7) },
        { id: "c-2", score: 6, result: mockJudgeResult(6) },
      ],
      topCandidate: { id: "c-1", score: 7, result: mockJudgeResult(7) },
      bottomCandidate: { id: "c-2", score: 6, result: mockJudgeResult(6) },
      topBottomAnalysis: "gap 1 point",
      avgScore: 6.5,
    });

    const result = await runOPRO("original prompt", {
      judgeProvider: "kimi",
      judgeApiKey: "key",
      optimizerProvider: "kimi",
      optimizerApiKey: "key",
      targetScore: 9,
      maxIterations: 2,
      candidatesPerIteration: 2,
      topKHistory: 3,
      earlyStopPatience: 1,
    });

    expect(result.finalScore).toBe(7);
    expect(result.finalPrompt).toBe("Better prompt A");
    expect(result.actualIterations).toBe(1);
    expect(result.iterations).toHaveLength(1);
    expect(result.iterations[0].bestCandidate.score).toBe(7);
    expect(result.improvementPercent).toBeGreaterThan(0);
    // 第2轮生成重复候选 → early stop (no_improvement)
    expect(result.stopReason).toBe("no_improvement");
  });

  it("early stops when no improvement", async () => {
    vi.mocked(judgePrompt).mockResolvedValueOnce(mockJudgeResult(6));

    vi.mocked(callAI).mockResolvedValue(
      JSON.stringify([{ prompt: "Same quality", strategy: "test" }]),
    );

    vi.mocked(judgeBatch).mockResolvedValue({
      results: new Map(),
      ranked: [{ id: "c1", score: 6, result: mockJudgeResult(6) }],
      topCandidate: { id: "c1", score: 6, result: mockJudgeResult(6) },
      bottomCandidate: { id: "c1", score: 6, result: mockJudgeResult(6) },
      topBottomAnalysis: "same",
      avgScore: 6,
    });

    const result = await runOPRO("original", {
      judgeProvider: "kimi",
      judgeApiKey: "key",
      optimizerProvider: "kimi",
      optimizerApiKey: "key",
      targetScore: 9,
      maxIterations: 3,
      candidatesPerIteration: 1,
      topKHistory: 3,
      earlyStopPatience: 1,
    });

    expect(result.stopReason).toBe("no_improvement");
    expect(result.actualIterations).toBe(1);
  });

  it("stops when target score reached", async () => {
    vi.mocked(judgePrompt).mockResolvedValueOnce(mockJudgeResult(6));

    vi.mocked(callAI).mockResolvedValue(
      JSON.stringify([{ prompt: "Perfect prompt", strategy: "magic" }]),
    );

    vi.mocked(judgeBatch).mockResolvedValue({
      results: new Map(),
      ranked: [{ id: "c1", score: 9, result: mockJudgeResult(9) }],
      topCandidate: { id: "c1", score: 9, result: mockJudgeResult(9) },
      bottomCandidate: { id: "c1", score: 9, result: mockJudgeResult(9) },
      topBottomAnalysis: "perfect",
      avgScore: 9,
    });

    const result = await runOPRO("original", {
      judgeProvider: "kimi",
      judgeApiKey: "key",
      optimizerProvider: "kimi",
      optimizerApiKey: "key",
      targetScore: 9,
      maxIterations: 3,
      candidatesPerIteration: 1,
      topKHistory: 3,
      earlyStopPatience: 1,
    });

    expect(result.stopReason).toBe("target_reached");
    expect(result.finalScore).toBe(9);
  });

  it("deduplicates repeated candidates across iterations", async () => {
    vi.mocked(judgePrompt).mockResolvedValueOnce(mockJudgeResult(5));

    // Both iterations generate the same prompt
    vi.mocked(callAI).mockResolvedValue(
      JSON.stringify([{ prompt: "Duplicate prompt", strategy: "dup" }]),
    );

    vi.mocked(judgeBatch).mockResolvedValue({
      results: new Map(),
      ranked: [{ id: "c1", score: 7, result: mockJudgeResult(7) }],
      topCandidate: { id: "c1", score: 7, result: mockJudgeResult(7) },
      bottomCandidate: { id: "c1", score: 7, result: mockJudgeResult(7) },
      topBottomAnalysis: "single",
      avgScore: 7,
    });

    const result = await runOPRO("original", {
      judgeProvider: "kimi",
      judgeApiKey: "key",
      optimizerProvider: "kimi",
      optimizerApiKey: "key",
      targetScore: 9,
      maxIterations: 3,
      candidatesPerIteration: 1,
      topKHistory: 3,
      earlyStopPatience: 2,
    });

    // 第2轮生成的候选与第1轮重复，应该被跳过
    // 连续2轮无新候选 → early stop (patience=2)
    expect(result.stopReason).toBe("no_improvement");
    expect(result.actualIterations).toBeGreaterThanOrEqual(1);
  });

  it("tracks elapsed time and token estimates", async () => {
    vi.mocked(judgePrompt).mockResolvedValueOnce(mockJudgeResult(5));
    vi.mocked(callAI).mockResolvedValue(
      JSON.stringify([{ prompt: "X", strategy: "s" }]),
    );
    vi.mocked(judgeBatch).mockResolvedValue({
      results: new Map(),
      ranked: [{ id: "c1", score: 6, result: mockJudgeResult(6) }],
      topCandidate: { id: "c1", score: 6, result: mockJudgeResult(6) },
      bottomCandidate: { id: "c1", score: 6, result: mockJudgeResult(6) },
      topBottomAnalysis: "ok",
      avgScore: 6,
    });

    const result = await runOPRO("short", {
      judgeProvider: "kimi",
      judgeApiKey: "key",
      optimizerProvider: "kimi",
      optimizerApiKey: "key",
      targetScore: 9,
      maxIterations: 1,
      candidatesPerIteration: 1,
      topKHistory: 3,
      earlyStopPatience: 1,
    });

    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(result.estimatedTokens).toBeGreaterThan(0);
    expect(result.totalCandidates).toBeGreaterThanOrEqual(1);
  });
});
