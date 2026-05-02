import { z } from "zod";

export const createProjectSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  intent: z.string().min(1).max(3000),
  domain: z.string().optional(),
});

export const saveConversationTurnSchema = z.object({
  projectId: z.number(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(10000),
  questionId: z.string().optional(),
  questionData: z.record(z.string(), z.unknown()).optional(),
  answerData: z.record(z.string(), z.unknown()).optional(),
  turnNumber: z.number().optional(),
});

export const generateSummarySchema = z.object({
  projectId: z.number(),
});

export const updateProjectSchema = z.object({
  id: z.number(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  domain: z.string().optional(),
  intent: z.string().optional(),
  status: z.enum(["draft", "ready", "executing", "completed", "archived"]).optional(),
  clarificationStatus: z.enum(["pending", "in_progress", "completed"]).optional(),
  turnCount: z.number().optional(),
});

export const deleteProjectSchema = z.object({
  id: z.number(),
});

export const getProjectSchema = z.object({
  id: z.number(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type SaveConversationTurnInput = z.infer<typeof saveConversationTurnSchema>;
export type GenerateSummaryInput = z.infer<typeof generateSummarySchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type DeleteProjectInput = z.infer<typeof deleteProjectSchema>;
export type GetProjectInput = z.infer<typeof getProjectSchema>;
