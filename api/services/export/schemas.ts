import { z } from "zod";

export const exportProjectsSchema = z.object({
  projectIds: z.array(z.number()).optional(),
  format: z.enum(["json", "markdown"]),
  includeConversations: z.boolean().optional().default(false),
  includeSummaries: z.boolean().optional().default(true),
});

export const exportPromptsSchema = z.object({
  promptIds: z.array(z.number()).optional(),
  format: z.enum(["json", "markdown"]),
  includeMetadata: z.boolean().optional().default(true),
});
