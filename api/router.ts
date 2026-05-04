import { promptForgeRouter } from "./promptforge-router";
import { templateRouter } from "./template-router";
import { projectRouter } from "./project-router";
import { optimizerRouter } from "./optimizer-router";
import { exportRouter } from "./export-router";
import { frameworkRouter } from "./services/framework";
import { totRouter } from "./services/ai/tot-router";
import { multimodalRouter } from "./services/multimodal/multimodal-router";
import { qualityGateRouter } from "./services/quality/gate-router";
import { driftRouter } from "./services/quality/drift-router";
import { feedbackRouter } from "./services/feedback/feedback-router";
import { swarmRouter } from "./services/agent/swarm-router";
import { academicRouter } from "./services/academic/academic-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  promptForge: promptForgeRouter,
  template: templateRouter,
  project: projectRouter,
  optimizer: optimizerRouter,
  export: exportRouter,
  framework: frameworkRouter,
  tot: totRouter,
  multimodal: multimodalRouter,
  qualityGate: qualityGateRouter,
  drift: driftRouter,
  feedback: feedbackRouter,
  swarm: swarmRouter,
  academic: academicRouter,
});

export type AppRouter = typeof appRouter;
