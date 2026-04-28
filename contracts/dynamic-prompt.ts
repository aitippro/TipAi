/**
 * F6: Dynamic Prompt Generation Types
 * Based on Microsoft Dynamic Prompt Refinement Control (CHIWORK 2025)
 */

// === Option Control Types ===

export type ControlType = "select" | "multi-select" | "slider" | "toggle" | "text";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface PromptControl {
  id: string;
  type: ControlType;
  label: string;
  description?: string;
  /** UI 提示文本 */
  placeholder?: string;
  /** select/multi-select 选项 */
  options?: SelectOption[];
  /** slider 范围 */
  min?: number;
  max?: number;
  step?: number;
  default?: unknown;
  /** 所属层级 */
  layer: "response" | "session";
  /** 影响的提示词维度 */
  affects: string;
}

// === Dynamic Options Response ===

export interface DynamicPromptOptions {
  /** 唯一会话 ID */
  sessionId: string;
  /** 用户原始意图 */
  intent: string;
  /** 响应级控件（针对本次请求） */
  responseControls: PromptControl[];
  /** 会话级控件（跨会话持久生效） */
  sessionControls: PromptControl[];
  /** 初始生成的提示词 */
  initialPrompt: string;
  /** 当前控件值 */
  controlValues: Record<string, unknown>;
}

// === Regeneration ===

export interface RegenerationInput {
  sessionId: string;
  intent: string;
  controlValues: Record<string, unknown>;
}

export interface RegenerationResult {
  prompt: string;
  reasoning: string;
  changedControls: string[];
}

// === Session Preferences ===

export interface SessionPreferences {
  /** 用户长期偏好 */
  responseFormat?: "list" | "paragraph" | "steps" | "markdown";
  detailLevel?: "concise" | "balanced" | "detailed";
  tone?: "formal" | "casual" | "technical";
  targetAudience?: string;
  language?: string;
}
