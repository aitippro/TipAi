import { describe, it, expect } from "vitest";
import { analyzeSentiment } from "../sentiment/analyzer";
import { generateExpressionTimeline } from "./timeline";
import { injectPerlinNoise } from "./perlin";
import { exportTimeline } from "./export";
import type { PunctuationProfile } from "../types/expression";

describe("T11: TPEMA 端到端集成", () => {
  const text = "这也太棒了吧！完美！";

  const profiles: PunctuationProfile[] = [
    { punctuation: "？", auCodes: ["AU1+2", "AU5"], intensity: 0.8, gazeState: "EMPHASIS", duration: 500, easingCurve: "backOut" },
    { punctuation: "！", auCodes: ["AU20", "AU5", "AU12"], intensity: 0.9, gazeState: "EMPHASIS", duration: 600, easingCurve: "elasticOut" },
  ];

  it("完整流程：文本 → sentiment → 时间轴 → 噪声 → 导出", () => {
    // Layer 1-2: Sentiment
    const sentiment = analyzeSentiment(text);
    expect(sentiment).toBeGreaterThan(0);

    // Layer 3: Timeline
    const frames = generateExpressionTimeline(text, profiles);
    expect(frames.length).toBeGreaterThan(0);
    expect(frames[0].timestamp).toBe(0);
    expect(frames[frames.length - 1].timestamp).toBeGreaterThan(0);

    // Layer 4: Perlin Noise
    const noisedFrames = injectPerlinNoise(frames, { seed: "test", amplitude: 0.05, frequency: 0.3 });
    expect(noisedFrames.length).toBe(frames.length);

    // Layer 5: Export
    const metadata = {
      sourceText: text,
      language: "zh",
      sentimentScore: sentiment,
      speakerId: "test_speaker",
      totalDuration: frames[frames.length - 1].timestamp,
      frameRate: 30,
    };

    const json = exportTimeline(noisedFrames, "json", metadata, profiles);
    expect(JSON.parse(json).version).toBe("tpema-0.2");

    const csv = exportTimeline(noisedFrames, "csv", metadata, profiles);
    expect(csv.split("\n").length).toBeGreaterThan(1);

    const xml = exportTimeline(noisedFrames, "facs-xml", metadata, profiles);
    expect(xml).toContain("<?xml");

    const prompt = exportTimeline(noisedFrames, "prompt-text", metadata, profiles);
    expect(prompt).toContain("Facial expression control");
  });

  describe("性能基准", () => {
    it("sentiment 分析 < 1ms", () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) analyzeSentiment(text);
      const elapsed = performance.now() - start;
      expect(elapsed / 1000).toBeLessThan(1);
    });

    it("时间轴生成（1000字文本）< 50ms", () => {
      const longText = "你好！".repeat(250);
      const start = performance.now();
      generateExpressionTimeline(longText, profiles);
      expect(performance.now() - start).toBeLessThan(50);
    });

    it("Perlin Noise 注入（1000帧）< 100ms", () => {
      const longText = "你好！".repeat(250);
      const frames = generateExpressionTimeline(longText, profiles);
      const start = performance.now();
      injectPerlinNoise(frames, { seed: "perf", amplitude: 0.05, frequency: 0.3 });
      expect(performance.now() - start).toBeLessThan(100);
    });

    it("JSON 导出（1000帧）< 50ms", () => {
      const longText = "你好！".repeat(250);
      const frames = generateExpressionTimeline(longText, profiles);
      const meta = { sourceText: longText, language: "zh", sentimentScore: 0, speakerId: "p", totalDuration: 999, frameRate: 30 };
      const start = performance.now();
      exportTimeline(frames, "json", meta, profiles);
      expect(performance.now() - start).toBeLessThan(50);
    });
  });

  describe("边界条件", () => {
    it("空文本 → sentiment=0，时间轴为空", () => {
      expect(analyzeSentiment("")).toBe(0);
      expect(generateExpressionTimeline("", profiles)).toEqual([]);
    });

    it("无标点文本 → 时间轴为空", () => {
      expect(generateExpressionTimeline("你好世界", profiles)).toEqual([]);
    });

    it("超长文本（1万字）不崩溃", () => {
      const long = "A".repeat(10000);
      expect(() => analyzeSentiment(long)).not.toThrow();
      expect(() => generateExpressionTimeline(long, profiles)).not.toThrow();
    });

    it("纯标点 → 每个标点都触发 AU", () => {
      const frames = generateExpressionTimeline("？？！…", profiles);
      expect(frames.length).toBeGreaterThan(0);
    });

    it("emoji 忽略不报错", () => {
      expect(() => analyzeSentiment("😀😂🎉")).not.toThrow();
      expect(() => generateExpressionTimeline("😀！", profiles)).not.toThrow();
    });

    it("sentiment 词典未命中 → 0", () => {
      expect(analyzeSentiment("xyz qwer")).toBe(0);
    });
  });
});
