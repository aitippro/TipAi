import { describe, it, expect, vi } from "vitest";
import {
  normalizeText,
  charJaccardSimilarity,
  normalizeStructured,
  runSelfConsistency,
  scResultToChatResponse,
} from "./self-consistency";
import type { AIModelProvider, ChatResponse } from "./provider";

describe("Self-Consistency Engine", () => {
  describe("normalizeText", () => {
    it("lowercases and trims whitespace", () => {
      expect(normalizeText("  Hello World  ")).toBe("hello world");
    });

    it("collapses multiple spaces", () => {
      expect(normalizeText("Hello    World")).toBe("hello world");
    });

    it("removes punctuation in hard mode", () => {
      expect(normalizeText("Hello, World!", "hard")).toBe("hello world");
    });

    it("keeps punctuation in soft mode", () => {
      expect(normalizeText("Hello, World!", "soft")).toBe("hello, world!");
    });
  });

  describe("charJaccardSimilarity", () => {
    it("returns 1.0 for identical strings", () => {
      expect(charJaccardSimilarity("abc", "abc")).toBe(1.0);
    });

    it("returns 0 for completely different strings", () => {
      expect(charJaccardSimilarity("abc", "xyz")).toBe(0);
    });

    it("returns 0 for empty strings", () => {
      expect(charJaccardSimilarity("", "abc")).toBe(0);
      expect(charJaccardSimilarity("abc", "")).toBe(0);
    });

    it("returns intermediate value for partial overlap", () => {
      const sim = charJaccardSimilarity("hello", "helio");
      expect(sim).toBeGreaterThan(0);
      expect(sim).toBeLessThan(1);
    });
  });

  describe("normalizeStructured", () => {
    it("normalizes JSON consistently", () => {
      const json1 = '{"b": 2, "a": 1}';
      const json2 = '{"a":1,"b":2}';
      expect(normalizeStructured(json1)).toBe(normalizeStructured(json2));
    });

    it("extracts JSON from code blocks", () => {
      const block = "```json\n{\"a\": 1}\n```";
      expect(normalizeStructured(block)).toBe('{"a":1}');
    });

    it("falls back to text normalization for plain text", () => {
      expect(normalizeStructured("Hello World")).toBe("hello world");
    });

    it("normalizes code by removing comments", () => {
      const code = "function add(a, b) { // adds two numbers\n  return a + b;\n}";
      const normalized = normalizeStructured(code);
      expect(normalized).not.toContain("//");
      expect(normalized).toContain("function add");
    });
  });

  describe("runSelfConsistency", () => {
    it("returns majority answer with confidence", async () => {
      const mockProvider: AIModelProvider = {
        name: "mock",
        config: { apiKey: "test", model: "gpt-4o-mini" },
        chat: vi.fn(),
        streamChat: vi.fn(),
        detectCapability: vi.fn(),
        getUsage: vi.fn(),
      };

      // 模拟 5 次调用，3 次相同答案，2 次不同
      let callCount = 0;
      vi.mocked(mockProvider.chat).mockImplementation(async () => {
        callCount++;
        const responses: ChatResponse[] = [
          { content: "Answer A", model: "mock", provider: "mock" },
          { content: "Answer A", model: "mock", provider: "mock" },
          { content: "Answer B", model: "mock", provider: "mock" },
          { content: "Answer A", model: "mock", provider: "mock" },
          { content: "Answer B", model: "mock", provider: "mock" },
        ];
        return responses[callCount - 1];
      });

      const result = await runSelfConsistency(
        mockProvider,
        [{ role: "user", content: "test" }],
        {},
        { type: "self-consistency", sampleCount: 5, temperature: 0.7 },
      );

      expect(result.finalAnswer).toBe("Answer A");
      expect(result.confidence).toBe(0.6); // 3/5
      expect(result.clusters).toHaveLength(2);
      expect(result.clusters[0].votes).toBe(3);
      expect(result.clusters[1].votes).toBe(2);
      expect(result.totalUsage).toBeDefined();
      expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
    });

    it("handles all identical answers with 1.0 confidence", async () => {
      const mockProvider: AIModelProvider = {
        name: "mock",
        config: { apiKey: "test", model: "gpt-4o-mini" },
        chat: vi.fn().mockResolvedValue({
          content: "Unanimous",
          model: "mock",
          provider: "mock",
        } as ChatResponse),
        streamChat: vi.fn(),
        detectCapability: vi.fn(),
        getUsage: vi.fn(),
      };

      const result = await runSelfConsistency(
        mockProvider,
        [{ role: "user", content: "test" }],
        {},
        { type: "self-consistency", sampleCount: 3, temperature: 0.7 },
      );

      expect(result.confidence).toBe(1.0);
      expect(result.clusters).toHaveLength(1);
      expect(result.clusters[0].votes).toBe(3);
    });

    it("handles failures gracefully", async () => {
      const mockProvider: AIModelProvider = {
        name: "mock",
        config: { apiKey: "test", model: "gpt-4o-mini" },
        chat: vi.fn().mockRejectedValue(new Error("API Error")),
        streamChat: vi.fn(),
        detectCapability: vi.fn(),
        getUsage: vi.fn(),
      };

      await expect(
        runSelfConsistency(
          mockProvider,
          [{ role: "user", content: "test" }],
          {},
          { type: "self-consistency", sampleCount: 3, temperature: 0.7 },
        ),
      ).rejects.toThrow("All sampling paths failed");
    });

    it("handles partial failures", async () => {
      const mockProvider: AIModelProvider = {
        name: "mock",
        config: { apiKey: "test", model: "gpt-4o-mini" },
        chat: vi.fn(),
        streamChat: vi.fn(),
        detectCapability: vi.fn(),
        getUsage: vi.fn(),
      };

      let callCount = 0;
      vi.mocked(mockProvider.chat).mockImplementation(async () => {
        callCount++;
        if (callCount <= 2) {
          throw new Error("API Error");
        }
        return {
          content: "Survivor",
          model: "mock",
          provider: "mock",
        } as ChatResponse;
      });

      const result = await runSelfConsistency(
        mockProvider,
        [{ role: "user", content: "test" }],
        {},
        { type: "self-consistency", sampleCount: 5, temperature: 0.7 },
      );

      expect(result.finalAnswer).toBe("Survivor");
      expect(result.confidence).toBe(1.0); // 3 valid, all same
      expect(result.paths).toHaveLength(5);
      expect(result.paths.filter((p) => p.finishReason === "error")).toHaveLength(2);
    });

    it("uses semantic similarity when configured", async () => {
      const mockProvider: AIModelProvider = {
        name: "mock",
        config: { apiKey: "test", model: "gpt-4o-mini" },
        chat: vi.fn().mockResolvedValue({
          content: "The quick brown fox",
          model: "mock",
          provider: "mock",
        } as ChatResponse),
        streamChat: vi.fn(),
        detectCapability: vi.fn(),
        getUsage: vi.fn(),
      };

      const result = await runSelfConsistency(
        mockProvider,
        [{ role: "user", content: "test" }],
        {},
        { type: "self-consistency", sampleCount: 3, temperature: 0.7 },
        { votingMethod: "semantic-similarity", similarityThreshold: 0.9 },
      );

      expect(result.confidence).toBe(1.0);
    });
  });

  describe("scResultToChatResponse", () => {
    it("converts SCResult to ChatResponse correctly", () => {
      const scResult = {
        finalAnswer: "Best Answer",
        confidence: 0.8,
        paths: [],
        clusters: [
          { id: "c0", normalizedKey: "best", representative: "Best Answer", votes: 4, ratio: 0.8, pathIndices: [0, 1, 2, 3] },
          { id: "c1", normalizedKey: "other", representative: "Other", votes: 1, ratio: 0.2, pathIndices: [4] },
        ],
        totalUsage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
        strategy: { type: "self-consistency" as const, sampleCount: 5, temperature: 0.7 },
        elapsedMs: 1500,
      };

      const response = scResultToChatResponse(scResult, "openai", "gpt-4o-mini");

      expect(response.content).toBe("Best Answer");
      expect(response.model).toBe("gpt-4o-mini");
      expect(response.provider).toBe("openai");
      expect(response.usage).toEqual({ promptTokens: 100, completionTokens: 200, totalTokens: 300 });
      expect(response.finishReason).toBe("stop");

      const raw = response.raw as Record<string, unknown>;
      expect(raw._decodeStrategy).toBe("self-consistency");
      expect(raw._confidence).toBe(0.8);
      expect(raw._pathCount).toBe(5);
      expect(raw._elapsedMs).toBe(1500);
      expect(Array.isArray(raw._clusters)).toBe(true);
    });
  });
});
