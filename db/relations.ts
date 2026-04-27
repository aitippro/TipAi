import { relations } from "drizzle-orm";
import { users, projects, steps } from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  steps: many(steps),
}));

export const stepsRelations = relations(steps, ({ one }) => ({
  project: one(projects, {
    fields: [steps.projectId],
    references: [projects.id],
  }),
}));
