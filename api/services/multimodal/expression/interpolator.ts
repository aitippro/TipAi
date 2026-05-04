/**
 * TPEMA v0.2 — AU & Head Pose Interpolator (T2)
 */

import { EASING, type EasingType } from "./easing";

export interface AUState {
  [auCode: string]: number;
}

export interface HeadPose {
  pitch: number; // degrees
  yaw: number;
  roll: number;
}

export function interpolateAU(
  from: AUState,
  to: AUState,
  progress: number,
  easing: EasingType,
): AUState {
  const eased = EASING[easing](progress);
  const result: AUState = {};
  const allKeys = new Set([...Object.keys(from), ...Object.keys(to)]);

  for (const key of allKeys) {
    const a = from[key] ?? 0;
    const b = to[key] ?? 0;
    result[key] = Math.max(0, Math.min(1, a + (b - a) * eased));
  }

  return result;
}

export function interpolateHeadPose(
  target: HeadPose | undefined,
  progress: number,
): HeadPose {
  if (!target) return { pitch: 0, yaw: 0, roll: 0 };
  return {
    pitch: target.pitch * progress,
    yaw: target.yaw * progress,
    roll: target.roll * progress,
  };
}
