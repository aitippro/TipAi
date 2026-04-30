/**
 * P3-2: Agent Swarm tRPC 路由
 */
import { z } from "zod";
import { createRouter, publicQuery } from "../../middleware";
import { runSwarm, getAvailableRoles, getCollaborationModes } from "./swarm";

export const swarmRouter = createRouter({
  /** 运行 Agent Swarm */
  run: publicQuery
    .input(
      z.object({
        description: z.string().min(1).max(2000),
        mode: z.enum(["sequential", "parallel", "hierarchical"]),
        roles: z.array(z.enum(["planner", "executor", "reviewer", "optimizer", "coordinator"])).min(1).max(5),
      }),
    )
    .mutation(async ({ input }) => {
      return runSwarm(input.description, input.mode, input.roles);
    }),

  /** 获取可用角色 */
  roles: publicQuery.query(() => {
    return getAvailableRoles();
  }),

  /** 获取协作模式 */
  modes: publicQuery.query(() => {
    return getCollaborationModes();
  }),
});
