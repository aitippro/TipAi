/**
 * TPEMA v0.2 — Expression Timeline Generator
 */

import type { PunctuationProfile, GazeState } from "../types/expression";
import type { EasingType } from "./easing";
import { AUState, HeadPose, interpolateAU, interpolateHeadPose } from "./interpolator";

export interface TimelineFrame {
  timestamp: number; // ms
  auState: AUState;
  headPose: HeadPose;
  gazeState: GazeState;
}

const FPS = 30;
const FRAME_DURATION = 1000 / FPS; // ~33.333 ms
const MAX_HEAD_DELTA_PER_FRAME = 15; // degrees

/**
 * Parse AU codes, handling compound notation such as "AU1+2".
 * "AU1+2" expands to AU1 and AU2.
 */
export function parseAUCodes(codes: string[], intensity: number): AUState {
  const state: AUState = {};

  for (const code of codes) {
    const parts = code.split("+");
    const firstPart = parts[0].trim();
    const prefixMatch = firstPart.match(/^([a-zA-Z]+)/);
    const prefix = prefixMatch ? prefixMatch[1] : "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (!part) continue;

      let auCode: string;
      if (i === 0) {
        auCode = part;
      } else if (/^\d+$/.test(part)) {
        auCode = prefix + part;
      } else {
        auCode = part;
      }

      state[auCode] = intensity;
    }
  }

  return state;
}

/**
 * Clamp every AU value into [0, 1].
 */
export function clampAUValues(state: AUState): AUState {
  const result: AUState = {};
  for (const key of Object.keys(state)) {
    result[key] = Math.max(0, Math.min(1, state[key]));
  }
  return result;
}

function clampHeadPoseDelta(prev: HeadPose, next: HeadPose): HeadPose {
  const clampComponent = (p: number, n: number): number => {
    const delta = n - p;
    if (Math.abs(delta) <= MAX_HEAD_DELTA_PER_FRAME) {
      return n;
    }
    return p + Math.sign(delta) * MAX_HEAD_DELTA_PER_FRAME;
  };

  return {
    pitch: clampComponent(prev.pitch, next.pitch),
    yaw: clampComponent(prev.yaw, next.yaw),
    roll: clampComponent(prev.roll, next.roll),
  };
}

/**
 * Generate a frame timeline by scanning text character-by-character.
 * Whenever a punctuation mark with a registered profile is encountered,
 * a sequence of frames is emitted for that mark's duration.
 */
export function generateExpressionTimeline(
  text: string,
  punctuationProfiles: PunctuationProfile[]
): TimelineFrame[] {
  const frames: TimelineFrame[] = [];
  let currentTime = 0;
  let lastHeadPose: HeadPose = { pitch: 0, yaw: 0, roll: 0 };

  const profileMap = new Map<string, PunctuationProfile>();
  for (const profile of punctuationProfiles) {
    profileMap.set(profile.punctuation, profile);
  }

  for (const char of text) {
    const profile = profileMap.get(char);
    if (!profile) continue;

    const frameCount = Math.max(1, Math.round((profile.duration * FPS) / 1000));
    const targetAU = parseAUCodes(profile.auCodes, profile.intensity);
    const easing = profile.easingCurve as EasingType;

    for (let i = 0; i < frameCount; i++) {
      const progress = frameCount <= 1 ? 1 : i / (frameCount - 1);
      const auState = interpolateAU({}, targetAU, progress, easing);
      let headPose = interpolateHeadPose(profile.headPoseDelta, progress);

      // Enforce max head-pose change speed between adjacent frames
      if (frames.length > 0 || i > 0) {
        const prevPose = i === 0 ? lastHeadPose : frames[frames.length - 1].headPose;
        headPose = clampHeadPoseDelta(prevPose, headPose);
      }

      frames.push({
        timestamp: Math.round(currentTime + i * FRAME_DURATION),
        auState: clampAUValues(auState),
        headPose,
        gazeState: profile.gazeState,
      });
    }

    if (frames.length > 0) {
      lastHeadPose = frames[frames.length - 1].headPose;
    }

    currentTime += profile.duration;
  }

  return frames;
}
