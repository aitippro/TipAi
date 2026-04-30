/**
 * Shared types — used by both backend (api/) and frontend (src/)
 * Any change here must be compatible with both sides.
 */

// ============================================================================
// OPRO / Optimizer
// ============================================================================

export interface OptimizationCandidate {
  id: string;
  prompt: string;
  score: number;
  dimensions: Record<string, number>;
  reasoning?: string;
}

export interface OptimizationIteration {
  round: number;
  candidates: OptimizationCandidate[];
  bestCandidate: OptimizationCandidate;
  worstCandidate?: OptimizationCandidate;
  avgScore: number;
  analysis: string;
}

export interface OptimizationResult {
  finalPrompt: string;
  finalScore: number;
  originalPrompt: string;
  originalScore: number;
  improvementPercent: number;
  iterations: OptimizationIteration[];
  totalCandidates: number;
  actualIterations: number;
  estimatedTokens: number;
  elapsedMs: number;
  stopReason: "target_reached" | "max_iterations" | "no_improvement" | "error";
}

// ============================================================================
// Judge / Evaluation
// ============================================================================

export interface JudgeDimensions {
  clarity: number;
  specificity: number;
  completeness: number;
  actionability: number;
  creativity: number;
  overall: number;
}

export interface JudgeResult {
  dimensions: JudgeDimensions;
  reasoning: string;
  score: number;
}

// ============================================================================
// Feedback
// ============================================================================

export type FeedbackDimension = "clarity" | "relevance" | "completeness" | "actionability" | "overall";

export interface FeedbackHistoryItem {
  id: number;
  projectId: number;
  stepId: number | null;
  dimension: FeedbackDimension;
  score: number;
  feedback: string | null;
  createdAt: Date | null;
}

// ============================================================================
// Framework Graph
// ============================================================================

export type FrameworkRelationType = "similar" | "complementary" | "upgrades-to" | "prerequisite";

export interface FrameworkRelation {
  from: string;
  to: string;
  type: FrameworkRelationType;
  strength: number;
  reason: string;
}

export interface FrameworkNode {
  key: string;
  name: string;
  complexity: "simple" | "medium" | "complex";
  category: string;
  componentCount: number;
}

export interface FrameworkGraphData {
  nodes: FrameworkNode[];
  relations: FrameworkRelation[];
  stats: {
    totalFrameworks: number;
    totalRelations: number;
    similarityRelations: number;
    complementaryRelations: number;
    upgradePaths: number;
    hybridPatterns: number;
  };
}
