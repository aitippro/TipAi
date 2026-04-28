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

export const projectRouter = createRouter({
  // List all projects for the user
  list: authedQuery.query(({ ctx }) => listUserProjects(ctx.user.id)),

  // Get a single project with its conversation
  get: authedQuery
    .input(getProjectSchema)
    .query(({ input, ctx }) => getProjectById(ctx.user.id, input.id)),

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
});
