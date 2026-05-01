import { describe, it, expect } from "vitest";
import {
  generateMultimodalPrompt,
  getMultimodalModes,
} from "./multimodal-engine";

describe("multimodal-engine", () => {
  describe("text-to-image", () => {
    it("should generate prompts for image generation", () => {
      const result = generateMultimodalPrompt(
        "一只穿着宇航服的猫在月球上",
        "text-to-image",
      );

      expect(result.mode).toBe("text-to-image");
      expect(result.generatedPrompts.length).toBe(3);
      expect(result.generatedPrompts[0].title).toContain("DALL-E");
      expect(result.generatedPrompts[1].negativePrompt).toBeDefined();
      expect(result.generatedPrompts[2].title).toContain("极简");
    });

    it("should detect anime style", () => {
      const result = generateMultimodalPrompt("动漫风格的少女", "text-to-image");
      const prompt = result.generatedPrompts[1].prompt;
      expect(prompt).toContain("anime");
    });

    it("should detect photorealistic style", () => {
      const result = generateMultimodalPrompt("写实风格的汽车", "text-to-image");
      const prompt = result.generatedPrompts[1].prompt;
      expect(prompt).toContain("photorealistic");
    });

    it("should include tips", () => {
      const result = generateMultimodalPrompt("test", "text-to-image");
      expect(result.tips.length).toBeGreaterThanOrEqual(3);
      expect(result.recommendedModel).toContain("DALL-E");
    });
  });

  describe("image-to-text", () => {
    it("should generate prompts for image analysis", () => {
      const result = generateMultimodalPrompt(
        "分析这张产品图的设计亮点",
        "image-to-text",
      );

      expect(result.mode).toBe("image-to-text");
      expect(result.generatedPrompts.length).toBe(3);
      expect(result.generatedPrompts[0].title).toBe("详细描述");
      expect(result.generatedPrompts[1].title).toBe("结构化分析");
      expect(result.generatedPrompts[2].title).toBe("创意解读");
    });

    it("should include JSON format in structured analysis", () => {
      const result = generateMultimodalPrompt("test", "image-to-text");
      const prompt = result.generatedPrompts[1].prompt;
      expect(prompt).toContain("JSON");
    });
  });

  describe("video-storyboard", () => {
    it("should generate storyboard scenes", () => {
      const result = generateMultimodalPrompt(
        "一个程序员在咖啡馆写代码，突然被窗外的流星吸引",
        "video-storyboard",
      );

      expect(result.mode).toBe("video-storyboard");
      expect(result.generatedPrompts.length).toBe(3);
      expect(result.generatedPrompts[0].title).toBe("完整分镜脚本");
      expect(result.generatedPrompts[2].title).toBe("AI 视频生成提示词");
    });

    it("should generate at least 3 scenes", () => {
      const result = generateMultimodalPrompt("test", "video-storyboard");
      const script = result.generatedPrompts[0].prompt;
      const sceneCount = (script.match(/镜头/g) || []).length;
      expect(sceneCount).toBeGreaterThanOrEqual(3);
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
