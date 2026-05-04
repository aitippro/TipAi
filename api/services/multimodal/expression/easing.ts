/**
 * TPEMA v0.2 — Easing Functions
 * Pure math, zero external dependencies.
 */

export type EasingType = "linear" | "easeInOut" | "elasticOut" | "backOut" | "sineInOut";

export const EASING: Record<EasingType, (t: number) => number> = {
  linear: (t) => t,

  easeInOut: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  },

  elasticOut: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    const c4 = (2 * Math.PI) / 3;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },

  backOut: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },

  sineInOut: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return -(Math.cos(Math.PI * t) - 1) / 2;
  },
};
