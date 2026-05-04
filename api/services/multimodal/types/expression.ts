/**
 * TPEMA v0.2 — Expression Control Types
 * Frozen at T0, shared across T1~T11
 */

// ── Punctuation → AU mapping ──────────────────────────────

export type GazeState = "FOCUS" | "SCAN" | "RECALL" | "AVOID" | "EMPHASIS";
export type EasingCurve = "linear" | "easeInOut" | "elasticOut" | "backOut" | "sineInOut";
export type ExportFormat = "json" | "csv" | "facs-xml" | "prompt-text";

export interface PunctuationProfile {
  punctuation: string;
  auCodes: string[];
  intensity: number;
  headPoseDelta?: { pitch: number; yaw: number; roll: number };
  gazeState: GazeState;
  duration: number; // ms
  easingCurve: EasingCurve;
}

export interface GazeTransition {
  trigger: string;
  targetState: GazeState;
  transitionType: "smooth" | "snap";
}

export interface ExpressionControl {
  punctuationMap: PunctuationProfile[];
  sentimentWeight: number;
  noiseSeed: string;
  noiseAmplitude: number;
  gazeTransitions: GazeTransition[];
  exportFormats: ExportFormat[];
}

// ── Extended GeneratedPrompt (backward-compatible) ────────

export interface GeneratedPromptWithExpression {
  title: string;
  prompt: string;
  negativePrompt?: string;
  parameters?: Record<string, string | number>;
  purpose: string;
  expressionControls?: ExpressionControl;
}

// ── Re-export easing type for convenience ─────────────────

export type { EasingCurve as EasingType };
