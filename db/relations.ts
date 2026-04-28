import { relations } from "drizzle-orm";
import { users, projects, steps, projectConversations, projectSummaries } from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  steps: many(steps),
  conversations: many(projectConversations),
  summary: one(projectSummaries, {
    fields: [projects.id],
    references: [projectSummaries.projectId],
  }),
}));

export const stepsRelations = relations(steps, ({ one }) => ({
  project: one(projects, {
    fields: [steps.projectId],
    references: [projects.id],
  }),
}));

export const projectConversationsRelations = relations(projectConversations, ({ one }) => ({
  project: one(projects, {
    fields: [projectConversations.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectConversations.userId],
    references: [users.id],
  }),
}));

export const projectSummariesRelations = relations(projectSummaries, ({ one }) => ({
  project: one(projects, {
    fields: [projectSummaries.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectSummaries.userId],
    references: [users.id],
  }),
}));
