/**
 * P1-3: Tree of Thoughts tRPC 路由
 *
 * 使用真实 LLM 进行候选生成和质量评估。
 * 若用户未配置 API Key，则 fallback 到本地 Mock 引擎。
 */
import { z } from "zod";
import { createRouter, authedQuery, publicQuery } from "../../middleware";
import {
  runTreeOfThoughts,
  setTotGenerator,
  setTotEvaluator,
  flattenTreeLevels,
} from "./tree-of-thoughts";
import { callAI } from "../../lib/ai-service-v3/client";
import { getAvailableModels } from "../promptforge/settings";

// ============================================================================
// Mock 引擎（Fallback：用户未配置 API Key 时使用）
// ============================================================================

const SIMULATED_STRATEGIES: Record<string, string[]> = {
  math: [
    "先列出题目中所有已知条件和未知量",
    "尝试用代入法将变量逐个替换求解",
    "建立方程组来联立求解未知量",
    "画图辅助理解几何或函数关系",
    "逆向推导从目标结果反推中间步骤",
    "尝试用特殊值验证结论的正确性",
  ],
  coding: [
    "先仔细分析题目对时间复杂度的要求",
    "考虑使用哈希表来优化查找性能",
    "尝试用双指针技巧降低时间复杂度",
    "考虑动态规划来避免重复计算",
    "先写出暴力解法再逐步进行优化",
    "考虑分治策略将大问题拆分成子问题",
  ],
  writing: [
    "先确定文章的目标读者群体特征",
    "列出核心要点并构建文章大纲",
    "用故事化方式引入主题吸引读者",
    "加入真实数据来支撑核心论点",
    "考虑反方观点以增强文章说服力",
    "用通俗类比来简化复杂概念的描述",
  ],
  general: [
    "将复杂问题分解为多个子任务逐个处理",
    "先收集更多背景信息辅助决策判断",
    "尝试类比相似问题的已有解决方案",
    "从期望结果倒推需要的中间执行步骤",
    "仔细考虑约束条件的边界和异常情况",
    "寻找问题中隐藏的模式或数学规律",
  ],
};

function detectDomain(problem: string): string {
  const p = problem.toLowerCase();
  if (/\d+.*[+\-*/=]|方程|求解|计算|math/i.test(p)) return "math";
  if (/代码|程序|算法|函数|python|javascript|bug|debug/i.test(p)) return "coding";
  if (/文章|写作|文案|邮件|报告|essay|write/i.test(p)) return "writing";
  return "general";
}

function initMockEngine() {
  setTotGenerator(async (problem, currentThought, breadth) => {
    const domain = detectDomain(problem);
    const strategies = SIMULATED_STRATEGIES[domain] ?? SIMULATED_STRATEGIES.general;

    if (currentThought) {
      const nextSteps = [
        `${currentThought} → 验证可行性`,
        `${currentThought} → 寻找更优方案`,
        `${currentThought} → 考虑边界情况`,
        `${currentThought} → 与其他方法对比`,
      ];
      return nextSteps.slice(0, breadth);
    }

    const shuffled = [...strategies].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, breadth);
  });

  setTotEvaluator(async (_problem, thought, _path) => {
    let value = 5;
    const lower = thought.toLowerCase();

    if (/验证|测试|检查|证明/i.test(lower)) value += 2;
    if (/优化|更优|改进|提升/i.test(lower)) value += 2;
    if (/边界|异常|容错|极端/i.test(lower)) value += 1;
    if (/对比|分析|评估|比较/i.test(lower)) value += 1;
    if (/分解|拆分|抽象|建模/i.test(lower)) value += 1;
    if (/模式|规律|归纳|演绎/i.test(lower)) value += 1;

    if (thought.length >= 10 && thought.length < 20) value += 1;
    if (thought.length >= 20) value += 2;

    value = Math.min(10, Math.max(1, value));

    const isTerminal = /得出结论|最终答案|完成求解|总结如下/i.test(lower) || value >= 9;

    return { value, isTerminal, reason: `heuristic score ${value}` };
  });
}

// ============================================================================
// AI 引擎（使用真实 LLM）
// ============================================================================

function buildGeneratorPrompt(problem: string, currentThought: string | null, path: string[]): string {
  const pathStr = path.length > 0 ? path.join(" → ") : "（尚未开始）";
  const currentStr = currentThought ?? "（这是第一步，请直接针对问题提出思考方向）";

  return `你是一位擅长结构化推理的专家。请根据问题和当前思考，生成若干个不同的下一步思考候选。

【问题】${problem}

【当前思考】${currentStr}

【已走过路径】${pathStr}

请生成 3-5 个具体、可执行、互不相同的新思考步骤。每个候选应该：
1. 是对当前思考的自然延伸
2. 包含具体的行动或分析方向
3. 避免空洞的泛泛而谈

请严格按以下格式输出（每行一个候选，不要编号，不要额外解释）：
候选1内容
候选2内容
候选3内容`;
}

function buildEvaluatorPrompt(problem: string, thought: string, path: string[]): string {
  const pathStr = path.length > 0 ? path.join(" → ") : "（起点）";

  return `你是一位严格的思考质量评估专家。请评估以下思考步骤对于解决问题的价值。

【问题】${problem}

【当前思考步骤】${thought}

【已走过路径】${pathStr}

请按以下严格格式回复（不要有任何其他内容）：
分数:<1-10的整数>
终局:<是|否>
理由:<一句话说明>

评分标准：
- 10分：已经直接得出最终答案或结论
- 7-9分：非常有价值的深入分析或关键突破
- 4-6分：有一定价值但比较常规
- 1-3分：空洞、重复或离题

"终局"填"是"的条件：当前思考步骤已经包含明确的最终答案、结论或完整解决方案。`;
}

async function parseAIResponse(text: string | null): Promise<{ value: number; isTerminal: boolean; reason: string } | null> {
  if (!text) return null;

  const scoreMatch = text.match(/分数[:：]\s*(\d+)/i);
  const terminalMatch = text.match(/终局[:：]\s*(是|否|yes|no)/i);
  const reasonMatch = text.match(/理由[:：]\s*(.+)/i);

  if (!scoreMatch) return null;

  const value = Math.min(10, Math.max(1, parseInt(scoreMatch[1], 10)));
  const isTerminal = /是|yes/i.test(terminalMatch?.[1] ?? "");
  const reason = reasonMatch?.[1]?.trim() ?? `AI score ${value}`;

  return { value, isTerminal, reason };
}

function parseGeneratorResponse(text: string | null, breadth: number): string[] {
  if (!text) return [];
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("候选") && !l.match(/^\d+[.、]/));
  return lines.slice(0, breadth);
}

async function initAIEngine(userId: number) {
  const models = await getAvailableModelsForUser(userId);
  if (models.length === 0) {
    // 没有 API Key，使用 Mock
    initMockEngine();
    return false;
  }

  const { model, apiKey } = models[0];

  setTotGenerator(async (problem, currentThought, breadth) => {
    const path: string[] = currentThought ? [currentThought] : [];
    const prompt = buildGeneratorPrompt(problem, currentThought, path);
    const response = await callAI(model, apiKey, "你是 Tree of Thoughts 候选生成器", prompt, 0.7);
    return parseGeneratorResponse(response, breadth);
  });

  setTotEvaluator(async (problem, thought, path) => {
    const prompt = buildEvaluatorPrompt(problem, thought, path);
    const response = await callAI(model, apiKey, "你是 Tree of Thoughts 质量评估器", prompt, 0.3);
    const parsed = await parseAIResponse(response);
    if (parsed) return parsed;

    // Fallback heuristic if AI parse fails
    const len = thought.length;
    const value = Math.min(10, Math.max(1, Math.floor(len / 5) + 3));
    return { value, isTerminal: value >= 9, reason: `fallback heuristic ${value}` };
  });

  return true;
}

async function getAvailableModelsForUser(userId: number) {
  const { getPromptForgeSettingsRecord } = await import("../promptforge/settings");
  const settings = await getPromptForgeSettingsRecord(userId);
  return getAvailableModels(settings);
}

// ============================================================================
// Router
// ============================================================================

export const totRouter = createRouter({
  /** 运行 Tree of Thoughts 推理（需要登录，以便使用用户配置的 API Key） */
  solve: authedQuery
    .input(
      z.object({
        problem: z.string().min(1).max(2000),
        strategy: z.enum(["bfs", "dfs"]).default("bfs"),
        breadth: z.number().min(2).max(5).default(3),
        maxDepth: z.number().min(2).max(6).default(4),
        valueThreshold: z.number().min(1).max(10).default(6),
        maxNodes: z.number().min(5).max(100).default(50),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const hasAI = await initAIEngine(ctx.user.id);
      if (!hasAI) {
        // 未配置 API Key，使用 Mock 并给出提示
        console.warn("[ToT] No API Key configured, falling back to mock engine");
      }

      const result = await runTreeOfThoughts(input.problem, {
        strategy: input.strategy,
        breadth: input.breadth,
        maxDepth: input.maxDepth,
        valueThreshold: input.valueThreshold,
        maxNodes: input.maxNodes,
        timeoutMs: 35000, // 35s global timeout
      });

      return {
        ...result,
        meta: {
          usingAI: hasAI,
        },
      };
    }),

  /** 获取树的层级结构（无需登录，使用 Mock 引擎） */
  levels: publicQuery
    .input(
      z.object({
        problem: z.string().min(1).max(2000),
        strategy: z.enum(["bfs", "dfs"]).default("bfs"),
        breadth: z.number().min(2).max(5).default(3),
        maxDepth: z.number().min(2).max(6).default(4),
      }),
    )
    .query(async ({ input }) => {
      initMockEngine();

      const result = await runTreeOfThoughts(input.problem, {
        strategy: input.strategy,
        breadth: input.breadth,
        maxDepth: input.maxDepth,
      });

      return {
        levels: flattenTreeLevels(result.tree, result.rootId),
        bestPath: result.bestPath.map((n) => n.id),
        stats: result.stats,
        config: result.config,
      };
    }),
});
