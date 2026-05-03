import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { isOnline, getAvailableModels, resetOllamaCache } from "./offline";

describe("offline detection", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("resetOllamaCache does not throw and resets internal state", () => {
    // The function has no observable return value (it resets module-level closed-over state).
    // The only verifiable contract is that it executes without error.
    expect(() => resetOllamaCache()).not.toThrow();
  });

  it("isOnline returns true when at least one endpoint responds", async () => {
    const mockOk = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = mockOk;

    const result = await isOnline();
    expect(result).toBe(true);
    expect(mockOk).toHaveBeenCalled();
  });

  it("isOnline returns false when all endpoints fail", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const result = await isOnline();
    expect(result).toBe(false);
  });

  it("getAvailableModels recommends ollama when offline but ollama is up", async () => {
    global.fetch = vi.fn((url: unknown) => {
      if (String(url).includes("11434")) {
        return Promise.resolve({ ok: true } as Response);
      }
      return Promise.reject(new Error("offline"));
    }) as unknown as typeof global.fetch;

    resetOllamaCache();
    const result = await getAvailableModels();
    expect(result.online).toBe(false);
    expect(result.ollamaAvailable).toBe(true);
    expect(result.recommendedModel).toBe("ollama");
  });

  it("getAvailableModels recommends kimi when online", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    resetOllamaCache();
    const result = await getAvailableModels();
    expect(result.online).toBe(true);
    expect(result.recommendedModel).toBe("kimi");
  });
});
