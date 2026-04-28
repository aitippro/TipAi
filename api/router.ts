import { authRouter } from "./auth-router";
import { promptForgeRouter } from "./promptforge-router";
import { templateRouter } from "./template-router";
import { projectRouter } from "./project-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  promptForge: promptForgeRouter,
  template: templateRouter,
  project: projectRouter,
});

export type AppRouter = typeof appRouter;
