import { describe, it, expect } from "vitest";
import { generateExpressionTimeline, parseAUCodes, clampAUValues } from "./timeline";
import { PunctuationProfile } from "../types/expression";

describe("parseAUCodes", () => {
  it("should parse a single AU code", () => {
    const result = parseAUCodes(["AU1"], 0.8);
    expect(result).toEqual({ AU1: 0.8 });
  });

  it('should parse combined AU codes like "AU1+2"', () => {
    const result = parseAUCodes(["AU1+2"], 0.8);
    expect(result).toEqual({ AU1: 0.8, AU2: 0.8 });
  });

  it("should parse multiple codes", () => {
    const result = parseAUCodes(["AU1", "AU2+3"], 0.5);
    expect(result).toEqual({ AU1: 0.5, AU2: 0.5, AU3: 0.5 });
  });
});

describe("clampAUValues", () => {
  it("should clamp values to [0, 1]", () => {
    const result = clampAUValues({ AU1: -0.5, AU2: 0.5, AU3: 1.5 });
    expect(result.AU1).toBe(0);
    expect(result.AU2).toBe(0.5);
    expect(result.AU3).toBe(1);
  });
});

describe("generateExpressionTimeline", () => {
  const profiles: PunctuationProfile[] = [
    {
      punctuation: "，",
      auCodes: ["AU1+2"],
      intensity: 0.6,
      headPoseDelta: { pitch: 10, yaw: 5, roll: 0 },
      gazeState: "FOCUS",
      duration: 200,
      easingCurve: "linear",
    },
    {
      punctuation: "！",
      auCodes: ["AU4"],
      intensity: 0.9,
      headPoseDelta: { pitch: 15, yaw: 0, roll: 0 },
      gazeState: "EMPHASIS",
      duration: 600,
      easingCurve: "easeInOut",
    },
  ];

  it("should generate correct frame count for punctuation marks", () => {
    const frames = generateExpressionTimeline("你好，世界！", profiles);
    // 200 ms @ 30 fps ≈ 6 frames, 600 ms @ 30 fps ≈ 18 frames
    expect(frames.length).toBe(24);
  });

  it("should have monotonically increasing timestamps", () => {
    const frames = generateExpressionTimeline("你好，世界！", profiles);
    for (let i = 1; i < frames.length; i++) {
      expect(frames[i].timestamp).toBeGreaterThan(frames[i - 1].timestamp);
    }
  });

  it("should limit head pose change to ≤ 15° per frame", () => {
    const frames = generateExpressionTimeline("你好，世界！", profiles);
    for (let i = 1; i < frames.length; i++) {
      const prev = frames[i - 1].headPose;
      const curr = frames[i].headPose;
      expect(Math.abs(curr.pitch - prev.pitch)).toBeLessThanOrEqual(15);
      expect(Math.abs(curr.yaw - prev.yaw)).toBeLessThanOrEqual(15);
      expect(Math.abs(curr.roll - prev.roll)).toBeLessThanOrEqual(15);
    }
  });
});
