import { describe, it, expect, vi } from "vitest";
import { callAI } from "../../lib/ai-service-v3/client";
import {
  generateMultimodalPromptWithAI,
  getMultimodalModes,
} from "./multimodal-engine";

// Mock AI client to avoid real API calls in tests
vi.mock("../../lib/ai-service-v3/client", () => ({
  callAI: vi.fn((_model: string, _apiKey: string, _system: string, userMessage: string) => {
    // Return a minimal valid JSON array response based on the prompt content
    if (userMessage.includes("text-to-image")) {
      return Promise.resolve(`[{"title":"DALL-E","prompt":"A cat in space","purpose":"test"}]`);
    }
    if (userMessage.includes("image-to-text")) {
      return Promise.resolve(`[{"title":"Analysis","prompt":"Describe the image","purpose":"test"}]`);
    }
    if (userMessage.includes("video-storyboard")) {
      return Promise.resolve(`{"variants":[{"title":"Storyboard","prompt":"Scene 1","purpose":"test"}]}`);
    }
    return Promise.resolve(`[{"title":"Default","prompt":"Default prompt","purpose":"test"}]`);
  }),
  callAIVision: vi.fn((_model: string, _apiKey: string, _system: string, _userMessage: string, _imageData: string) => {
    return Promise.resolve(`[{"title":"Vision","prompt":"Image analysis result","purpose":"test"}]`);
  }),
}));

describe("multimodal-engine", () => {
  describe("generateMultimodalPromptWithAI", () => {
    it("should generate text-to-image prompts via AI", async () => {
      const result = await generateMultimodalPromptWithAI(
        "一只穿着宇航服的猫在月球上",
        "text-to-image",
        "gpt-4",
        "test-key",
      );

      expect(result.mode).toBe("text-to-image");
      expect(result.usingAI).toBe(true);
      expect(result.generatedPrompts.length).toBeGreaterThan(0);
    });

    it("should generate image-to-text prompts via AI", async () => {
      const result = await generateMultimodalPromptWithAI(
        "分析这张产品图的设计亮点",
        "image-to-text",
        "gpt-4",
        "test-key",
      );

      expect(result.mode).toBe("image-to-text");
      expect(result.usingAI).toBe(true);
      expect(result.generatedPrompts.length).toBeGreaterThan(0);
    });

    it("should generate video-storyboard prompts via AI", async () => {
      const result = await generateMultimodalPromptWithAI(
        "一个程序员在咖啡馆写代码",
        "video-storyboard",
        "gpt-4",
        "test-key",
      );

      expect(result.mode).toBe("video-storyboard");
      expect(result.usingAI).toBe(true);
      expect(result.generatedPrompts.length).toBeGreaterThan(0);
    });

    it("should use vision API when imageData is provided", async () => {
      const result = await generateMultimodalPromptWithAI(
        "分析这张图片",
        "image-to-text",
        "gpt-4",
        "test-key",
        "base64image",
      );

      expect(result.mode).toBe("image-to-text");
      expect(result.usingAI).toBe(true);
    });

    it("should preserve expressionControls in parsed JSON (T5)", async () => {
      const jsonWithExpr = JSON.stringify({
        variants: [{
          title: "Storyboard",
          prompt: "Scene 1",
          purpose: "test",
          expressionControls: {
            punctuationMap: [{ punctuation: "！", auCodes: ["AU20"], intensity: 0.9, gazeState: "EMPHASIS", duration: 600, easingCurve: "elasticOut" }],
            sentimentWeight: 1.0,
            noiseSeed: "speaker_001",
            noiseAmplitude: 0.05,
            gazeTransitions: [],
            exportFormats: ["json", "csv"],
          },
        }],
      });

      vi.mocked(callAI).mockResolvedValueOnce(jsonWithExpr);

      const result = await generateMultimodalPromptWithAI(
        "主播介绍产品",
        "video-storyboard",
        "gpt-4",
        "test-key",
      );

      expect(result.generatedPrompts[0].expressionControls).toBeDefined();
      expect(result.generatedPrompts[0].expressionControls?.punctuationMap[0].punctuation).toBe("！");
      expect(result.generatedPrompts[0].expressionControls?.sentimentWeight).toBe(1.0);
    });
  });

  describe("getMultimodalModes", () => {
    it("should return all 3 modes", () => {
      const modes = getMultimodalModes();
      expect(modes.length).toBe(3);
      expect(modes.map((m) => m.value)).toContain("text-to-image");
      expect(modes.map((m) => m.value)).toContain("image-to-text");
      expect(modes.map((m) => m.value)).toContain("video-storyboard");
    });
  });
});
