import { authRouter } from "./auth-router";
import { promptForgeRouter } from "./promptforge-router";
import { templateRouter } from "./template-router";
import { projectRouter } from "./project-router";
import { optimizerRouter } from "./optimizer-router";
import { exportRouter } from "./export-router";
import { frameworkRouter } from "./services/framework";
import { totRouter } from "./services/ai/tot-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  promptForge: promptForgeRouter,
  template: templateRouter,
  project: projectRouter,
  optimizer: optimizerRouter,
  export: exportRouter,
  framework: frameworkRouter,
  tot: totRouter,
});

export type AppRouter = typeof appRouter;
