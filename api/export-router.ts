/* eslint-disable @typescript-eslint/no-explicit-any */

import { native } from "./lib/native";

/** Escape markdown special characters in user-provided content */
function escapeMarkdown(text: unknown): string {
  if (typeof text !== "string") return String(text ?? "");
  return text
    .replace(/\|/g, "\\|")
    .replace(/#/g, "\\#")
    .replace(/`/g, "\\`")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/>/g, "\\>");
}
import { createRouter, authedQuery } from "./middleware";
import { exportProjectsSchema, exportPromptsSchema } from "./services/export/schemas";

export const exportRouter = createRouter({
  // Export projects
  projects: authedQuery
    .input(exportProjectsSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      let projectList;
      if (input.projectIds && input.projectIds.length > 0) {
        // Filter by provided IDs
        const all = native.projectList(userId) || [];
        const idSet = new Set(input.projectIds);
        projectList = all.filter((p: any) => idSet.has(p.id));
      } else {
        projectList = native.projectList(userId) || [];
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
          clarificationStatus: project.clarification_status,
          createdAt: project.created_at,
          updatedAt: project.updated_at,
        };

        if (input.includeSummaries) {
          const summary = native.summaryGetByProject(project.id);
          if (summary) {
            item.summary = {
              summary: summary.summary,
              requirements: summary.requirements,
              constraints: summary.constraints,
              suggestedFrameworks: summary.suggested_frameworks,
            };
          }
        }

        if (input.includeConversations) {
          const conversations = native.conversationListByProject(project.id) || [];
          item.conversations = conversations.map((c: any) => ({
            role: c.role,
            content: c.content,
            turnNumber: c.turn_number,
            createdAt: c.created_at,
          }));
        }

        result.push(item);
      }

      if (input.format === "markdown") {
        let md = "# 项目导出\n\n";
        for (const item of result) {
          md += `## ${escapeMarkdown(item.title)}\n\n`;
          md += `- **ID**: ${item.id}\n`;
          md += `- **领域**: ${escapeMarkdown(item.domain) || "通用"}\n`;
          md += `- **状态**: ${escapeMarkdown(item.status)}\n`;
          md += `- **创建时间**: ${item.createdAt}\n\n`;
          md += `### 需求意图\n\n${escapeMarkdown(item.intent) || "无"}\n\n`;

          if (item.summary) {
            const s = item.summary as Record<string, unknown>;
            md += `### 需求摘要\n\n${escapeMarkdown(s.summary)}\n\n`;
            if (s.requirements && Array.isArray(s.requirements)) {
              md += "#### 核心需求\n\n";
              for (const req of s.requirements as string[]) {
                md += `- ${escapeMarkdown(req)}\n`;
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
      const userId = ctx.user.id;

      let promptList;
      if (input.promptIds && input.promptIds.length > 0) {
        const all = native.promptList(userId) || [];
        const idSet = new Set(input.promptIds);
        promptList = all.filter((p: any) => idSet.has(p.id));
      } else {
        promptList = native.promptList(userId) || [];
      }

      const result = promptList.map((p: any) => ({
        id: p.id,
        title: p.title,
        content: p.generated_prompt,
        description: p.original_intent || "",
        framework: p.framework,
        tags: p.tags,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }));

      if (input.format === "markdown") {
        let md = "# 提示词库导出\n\n";
        for (const p of result) {
          md += `## ${escapeMarkdown(p.title)}\n\n`;
          md += `- **框架**: ${escapeMarkdown(p.framework) || "通用"}\n`;
          md += `- **标签**: ${escapeMarkdown(p.tags) || "无"}\n`;
          md += `- **创建时间**: ${p.createdAt}\n\n`;
          md += `### 提示词内容\n\n\`\`\`\n${p.content}\n\`\`\`\n\n`;
          if (p.description) {
            md += `### 描述\n\n${escapeMarkdown(p.description)}\n\n`;
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
