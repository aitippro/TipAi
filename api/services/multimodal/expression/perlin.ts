/**
 * TPEMA v0.2 — Perlin Noise Injector (T3)
 * Uses simplex-noise@4.0.3 (locked version).
 */

import { createNoise2D } from "simplex-noise";
import type { TimelineFrame } from "./timeline";
import type { AUState } from "./interpolator";

export interface NoiseConfig {
  amplitude: number; // default 0.05
  frequency: number; // Hz, default 0.3
  seed: string; // speaker_id
}

export function injectPerlinNoise(
  frames: TimelineFrame[],
  config: NoiseConfig,
): TimelineFrame[] {
  const seedNum = hashString(config.seed);
  const noise2D = createNoise2D(() => seedNum / Number.MAX_SAFE_INTEGER);

  return frames.map((frame) => {
    const timeSec = frame.timestamp / 1000;
    const noiseVal = noise2D(timeSec * config.frequency, seedNum);

    const perturbedAU: AUState = {};
    for (const [au, val] of Object.entries(frame.auState)) {
      perturbedAU[au] = Math.max(0, Math.min(1, val + noiseVal * config.amplitude));
    }

    return {
      ...frame,
      auState: perturbedAU,
    };
  });
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
