import { createRouter, authedQuery } from "./middleware";
import { exportProjectsSchema, exportPromptsSchema } from "./services/export/schemas";
import { getDb } from "./queries/connection";
import { projects, projectConversations, projectSummaries, promptLibrary } from "@db/schema";
import { eq, inArray } from "drizzle-orm";

export const exportRouter = createRouter({
  // Export projects
  projects: authedQuery
    .input(exportProjectsSchema)
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const userId = ctx.user.id;

      let projectList;
      if (input.projectIds && input.projectIds.length > 0) {
        projectList = await db
          .select()
          .from(projects)
          .where(inArray(projects.id, input.projectIds))
          .all();
      } else {
        projectList = await db
          .select()
          .from(projects)
          .where(eq(projects.userId, userId))
          .all();
      }

      const result: Record<string, unknown>[] = [];

      for (const project of projectList) {
        const item: Record<string, unknown> = {
          id: project.id,
          title: project.title,
          description: project.description,
          intent: project.intent,
          domain: project.domain,
          status: project.status,
          clarificationStatus: project.clarificationStatus,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        };

        if (input.includeSummaries) {
          const summary = await db
            .select()
            .from(projectSummaries)
            .where(eq(projectSummaries.projectId, project.id))
            .get();
          if (summary) {
            item.summary = {
              summary: summary.summary,
              requirements: summary.requirements,
              constraints: summary.constraints,
              suggestedFrameworks: summary.suggestedFrameworks,
            };
          }
        }

        if (input.includeConversations) {
          const conversations = await db
            .select()
            .from(projectConversations)
            .where(eq(projectConversations.projectId, project.id))
            .all();
          item.conversations = conversations.map((c) => ({
            role: c.role,
            content: c.content,
            turnNumber: c.turnNumber,
            createdAt: c.createdAt,
          }));
        }

        result.push(item);
      }

      if (input.format === "markdown") {
        let md = "# 项目导出\n\n";
        for (const item of result) {
          md += `## ${item.title}\n\n`;
          md += `- **ID**: ${item.id}\n`;
          md += `- **领域**: ${item.domain || "通用"}\n`;
          md += `- **状态**: ${item.status}\n`;
          md += `- **创建时间**: ${item.createdAt}\n\n`;
          md += `### 需求意图\n\n${item.intent || "无"}\n\n`;

          if (item.summary) {
            const s = item.summary as Record<string, unknown>;
            md += `### 需求摘要\n\n${s.summary}\n\n`;
            if (s.requirements && Array.isArray(s.requirements)) {
              md += "#### 核心需求\n\n";
              for (const req of s.requirements as string[]) {
                md += `- ${req}\n`;
              }
              md += "\n";
            }
          }

          md += "---\n\n";
        }
        return { format: "markdown", content: md, count: result.length };
      }

      return {
        format: "json",
        content: JSON.stringify(result, null, 2),
        count: result.length,
      };
    }),

  // Export prompt library
  prompts: authedQuery
    .input(exportPromptsSchema)
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const userId = ctx.user.id;

      let promptList;
      if (input.promptIds && input.promptIds.length > 0) {
        promptList = await db
          .select()
          .from(promptLibrary)
          .where(inArray(promptLibrary.id, input.promptIds))
          .all();
      } else {
        promptList = await db
          .select()
          .from(promptLibrary)
          .where(eq(promptLibrary.userId, userId))
          .all();
      }

      const result = promptList.map((p) => ({
        id: p.id,
        title: p.title,
        content: p.generatedPrompt,
        description: p.originalIntent || "",
        framework: p.framework,
        tags: p.tags,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));

      if (input.format === "markdown") {
        let md = "# 提示词库导出\n\n";
        for (const p of result) {
          md += `## ${p.title}\n\n`;
          md += `- **框架**: ${p.framework || "通用"}\n`;
          md += `- **标签**: ${p.tags || "无"}\n`;
          md += `- **创建时间**: ${p.createdAt}\n\n`;
          md += `### 提示词内容\n\n\`\`\`\n${p.content}\n\`\`\`\n\n`;
          if (p.description) {
            md += `### 描述\n\n${p.description}\n\n`;
          }
          md += "---\n\n";
        }
        return { format: "markdown", content: md, count: result.length };
      }

      return {
        format: "json",
        content: JSON.stringify(result, null, 2),
        count: result.length,
      };
    }),
});
