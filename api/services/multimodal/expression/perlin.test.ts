import { describe, it, expect } from "vitest";
import { injectPerlinNoise } from "./perlin";
import { generateExpressionTimeline } from "./timeline";
import type { PunctuationProfile } from "../types/expression";

describe("T3: Perlin Noise", () => {
  const profiles: PunctuationProfile[] = [
    { punctuation: "！", auCodes: ["AU5"], intensity: 0.8, gazeState: "EMPHASIS", duration: 300, easingCurve: "linear" },
  ];

  const frames = generateExpressionTimeline("Hi！", profiles);

  it("same seed → same output", () => {
    const a = injectPerlinNoise(frames, { seed: "A", amplitude: 0.05, frequency: 0.3 });
    const b = injectPerlinNoise(frames, { seed: "A", amplitude: 0.05, frequency: 0.3 });
    expect(a[0].auState.AU5).toBe(b[0].auState.AU5);
  });

  it("different seed → different output", () => {
    const a = injectPerlinNoise(frames, { seed: "A", amplitude: 0.05, frequency: 0.3 });
    const b = injectPerlinNoise(frames, { seed: "B", amplitude: 0.05, frequency: 0.3 });
    expect(a[0].auState.AU5).not.toBe(b[0].auState.AU5);
  });

  it("amplitude constraint: diff ≤ amplitude", () => {
    const noised = injectPerlinNoise(frames, { seed: "X", amplitude: 0.05, frequency: 0.3 });
    for (let i = 0; i < frames.length; i++) {
      const diff = Math.abs(noised[i].auState.AU5 - frames[i].auState.AU5);
      expect(diff).toBeLessThanOrEqual(0.0501);
    }
  });

  it("values stay in [0, 1]", () => {
    const noised = injectPerlinNoise(frames, { seed: "X", amplitude: 0.1, frequency: 1.0 });
    for (const f of noised) {
      for (const v of Object.values(f.auState)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it("higher frequency → more variation", () => {
    const lo = injectPerlinNoise(frames, { seed: "F", amplitude: 0.1, frequency: 0.1 });
    const hi = injectPerlinNoise(frames, { seed: "F", amplitude: 0.1, frequency: 2.0 });
    const loVariance = variance(lo.map((f) => f.auState.AU5));
    const hiVariance = variance(hi.map((f) => f.auState.AU5));
    expect(hiVariance).toBeGreaterThan(loVariance);
  });
});

function variance(arr: number[]): number {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
}
