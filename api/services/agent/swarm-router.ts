/**
 * P3-2: Agent Swarm tRPC 路由
 */
import { z } from "zod";
import { createRouter, authedQuery } from "../../middleware";
import { runSwarm, getAvailableRoles, getCollaborationModes } from "./swarm";
import { getAvailableModels } from "../promptforge/settings";

export const swarmRouter = createRouter({
  /** 运行 Agent Swarm（需要登录） */
  run: authedQuery
    .input(
      z.object({
        description: z.string().min(1).max(2000),
        mode: z.enum(["sequential", "parallel", "hierarchical"]),
        roles: z.array(z.enum(["planner", "executor", "reviewer", "optimizer", "coordinator"])).min(1).max(5),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { getPromptForgeSettingsRecord } = await import("../promptforge/settings");
      const settings = await getPromptForgeSettingsRecord(ctx.user.id);
      const models = getAvailableModels(settings);

      if (models.length > 0) {
        const { model, apiKey } = models[0];
        return runSwarm(input.description, input.mode, input.roles, model, apiKey);
      }

      return runSwarm(input.description, input.mode, input.roles);
    }),

  /** 获取可用角色 */
  roles: authedQuery.query(() => {
    return getAvailableRoles();
  }),

  /** 获取协作模式 */
  modes: authedQuery.query(() => {
    return getCollaborationModes();
  }),
});
