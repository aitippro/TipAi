import { createRouter, authedQuery } from "./middleware";
import {
  createProject,
  listUserProjects,
  getProjectById,
  updateProject,
  deleteProject,
  saveConversationTurn,
  getProjectConversation,
  getProjectSummary,
  saveProjectSummary,
  getFullDetail,
} from "./services/projects/crud";
import {
  generateRequirementSummary,
  generateNextClarificationQuestion,
} from "./services/projects/summary";
import {
  createProjectSchema,
  saveConversationTurnSchema,
  generateSummarySchema,
  updateProjectSchema,
  deleteProjectSchema,
  getProjectSchema,
} from "./services/projects/schemas";
import { z } from "zod";
import {
  getProjectPipeline,
  moveStepStage,
  linkParentStep,
  getChildSteps,
  createLifecycleStep,
} from "./services/projects/lifecycle";

export const projectRouter = createRouter({
  // List all projects for the user
  list: authedQuery.query(({ ctx }) => listUserProjects(ctx.user.id)),

  // Get a single project with its conversation
  get: authedQuery
    .input(getProjectSchema)
    .query(({ input, ctx }) => getProjectById(ctx.user.id, input.id)),

  // Merged endpoint: project + conversation + summary in one query
  getFullDetail: authedQuery
    .input(getProjectSchema)
    .query(({ input, ctx }) => getFullDetail(ctx.user.id, input.id)),

  // Get project conversation history
  getConversation: authedQuery
    .input(getProjectSchema)
    .query(({ input, ctx }) => getProjectConversation(input.id, ctx.user.id)),

  // Get project summary
  getSummary: authedQuery
    .input(getProjectSchema)
    .query(({ input, ctx }) => getProjectSummary(input.id, ctx.user.id)),

  // Create a new project
  create: authedQuery
    .input(createProjectSchema)
    .mutation(({ input, ctx }) => createProject(ctx.user.id, input)),

  // Update project
  update: authedQuery
    .input(updateProjectSchema)
    .mutation(({ input, ctx }) => updateProject(ctx.user.id, input)),

  // Delete project
  delete: authedQuery
    .input(deleteProjectSchema)
    .mutation(({ input, ctx }) => deleteProject(ctx.user.id, input.id)),

  // Save a conversation turn
  saveConversationTurn: authedQuery
    .input(saveConversationTurnSchema)
    .mutation(({ input, ctx }) => saveConversationTurn(ctx.user.id, input)),

  // Generate summary from conversation
  generateSummary: authedQuery
    .input(generateSummarySchema)
    .mutation(async ({ input, ctx }) => {
      const project = await getProjectById(ctx.user.id, input.projectId);
      if (!project) {
        throw new Error("Project not found");
      }

      const result = await generateRequirementSummary(
        ctx.user.id,
        input.projectId,
        project.intent || "",
      );

      // Save the summary
      await saveProjectSummary(
        ctx.user.id,
        input.projectId,
        result.summary,
        result.requirements,
        result.constraints,
        result.suggestedFrameworks,
        JSON.stringify(result.intentAnalysis),
      );

      // Update project status
      await updateProject(ctx.user.id, {
        id: input.projectId,
        clarificationStatus: "completed",
      });

      return result;
    }),

  // Generate next clarification question
  generateNextQuestion: authedQuery
    .input(getProjectSchema)
    .mutation(async ({ input, ctx }) => {
      const project = await getProjectById(ctx.user.id, input.id);
      if (!project) {
        throw new Error("Project not found");
      }

      const conversation = await getProjectConversation(input.id, ctx.user.id);
      const turns = conversation?.map((t: typeof conversation[number]) => ({
        role: t.role,
        content: t.content,
        questionData: t.questionData as Record<string, unknown> | undefined,
        answerData: t.answerData as Record<string, unknown> | undefined,
      })) || [];

      const result = await generateNextClarificationQuestion(
        ctx.user.id,
        project.intent || "",
        turns,
      );

      return result;
    }),

  // F7: Prompt Lifecycle Management
  getPipeline: authedQuery
    .input(getProjectSchema)
    .query(({ input, ctx }) => getProjectPipeline(ctx.user.id, input.id)),

  createStep: authedQuery
    .input(
      z.object({
        projectId: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        prompt: z.string().min(1),
        stage: z.enum(["clarify", "design", "implement", "test", "deploy", "maintain"]),
        parentStepId: z.number().optional(),
        model: z.string().optional(),
        temperature: z.number().optional(),
        decodeStrategy: z.object({
          type: z.enum(["greedy", "sampling", "self-consistency"]),
          temperature: z.number().optional(),
          topP: z.number().optional(),
          sampleCount: z.number().optional(),
          maxTokens: z.number().optional(),
        }).optional(),
      })
    )
    .mutation(({ input, ctx }) => createLifecycleStep(ctx.user.id, input)),

  moveStep: authedQuery
    .input(
      z.object({
        stepId: z.number(),
        toStage: z.enum(["clarify", "design", "implement", "test", "deploy", "maintain"]),
      })
    )
    .mutation(({ input, ctx }) => moveStepStage(ctx.user.id, input.stepId, input.toStage)),

  linkStep: authedQuery
    .input(
      z.object({
        stepId: z.number(),
        parentStepId: z.number(),
      })
    )
    .mutation(({ input, ctx }) => linkParentStep(ctx.user.id, input.stepId, input.parentStepId)),

  getChildSteps: authedQuery
    .input(z.object({ stepId: z.number() }))
    .query(({ input, ctx }) => getChildSteps(ctx.user.id, input.stepId)),
});
