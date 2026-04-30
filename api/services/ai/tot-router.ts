/**
 * P1-3: Tree of Thoughts tRPC 路由
 */
import { z } from "zod";
import { createRouter, publicQuery } from "../../middleware";
import {
  runTreeOfThoughts,
  setTotGenerator,
  setTotEvaluator,
  flattenTreeLevels,
} from "./tree-of-thoughts";

// ============================================================================
// 模拟生成器 & 评估器（无需 LLM API，用于演示和快速体验）
// ============================================================================

const SIMULATED_STRATEGIES: Record<string, string[]> = {
  math: [
    "先列出已知条件",
    "尝试代入法求解",
    "建立方程组",
    "画图辅助理解",
    "逆向推导",
    "尝试特殊值验证",
  ],
  coding: [
    "先分析时间复杂度要求",
    "考虑使用哈希表优化查找",
    "尝试双指针技巧",
    "考虑动态规划",
    "先写暴力解法再优化",
    "考虑分治策略",
  ],
  writing: [
    "先确定目标读者",
    "列出核心要点大纲",
    "用故事化方式引入",
    "加入数据支撑论点",
    "考虑反方观点增强说服力",
    "用类比简化复杂概念",
  ],
  general: [
    "分解问题为子任务",
    "先收集更多信息",
    "尝试类比相似问题",
    "从结果倒推步骤",
    "考虑约束条件的边界情况",
    "寻找模式或规律",
  ],
};

function detectDomain(problem: string): string {
  const p = problem.toLowerCase();
  if (/\d+.*[\+\-\*\/\=]|方程|求解|计算|math/i.test(p)) return "math";
  if (/代码|程序|算法|函数|python|javascript|bug|debug/i.test(p)) return "coding";
  if (/文章|写作|文案|邮件|报告|essay|write/i.test(p)) return "writing";
  return "general";
}

function initMockEngine() {
  setTotGenerator(async (problem, currentThought, breadth) => {
    const domain = detectDomain(problem);
    const strategies = SIMULATED_STRATEGIES[domain] ?? SIMULATED_STRATEGIES.general;

    // 如果有当前思考，基于它生成下一步
    if (currentThought) {
      const nextSteps = [
        `${currentThought} → 验证可行性`,
        `${currentThought} → 寻找更优方案`,
        `${currentThought} → 考虑边界情况`,
        `${currentThought} → 与其他方法对比`,
      ];
      return nextSteps.slice(0, breadth);
    }

    // 随机选择策略
    const shuffled = [...strategies].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, breadth);
  });

  setTotEvaluator(async (_problem, thought, _path) => {
    // 基于内容质量启发式打分
    let value = 5;
    const lower = thought.toLowerCase();

    // 关键词加分
    if (/验证|测试|检查/i.test(lower)) value += 2;
    if (/优化|更优|改进/i.test(lower)) value += 2;
    if (/边界|异常|容错/i.test(lower)) value += 1;
    if (/对比|分析|评估/i.test(lower)) value += 1;

    // 长度惩罚（太短的思考没价值）
    if (thought.length < 10) value -= 2;
    if (thought.length > 30) value += 1;

    value = Math.min(10, Math.max(1, value));

    // 终止条件：包含"得出"或深度内容
    const isTerminal = /结论|答案|结果|完成|最终/i.test(lower) || value >= 9;

    return { value, isTerminal, reason: `heuristic score ${value}` };
  });
}

// 初始化默认 mock 引擎
initMockEngine();

// ============================================================================
// Router
// ============================================================================

export const totRouter = createRouter({
  /** 运行 Tree of Thoughts 推理 */
  solve: publicQuery
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
    .mutation(async ({ input }) => {
      // 确保 mock 引擎已初始化（避免测试覆盖后丢失）
      initMockEngine();

      const result = await runTreeOfThoughts(input.problem, {
        strategy: input.strategy,
        breadth: input.breadth,
        maxDepth: input.maxDepth,
        valueThreshold: input.valueThreshold,
        maxNodes: input.maxNodes,
      });

      return result;
    }),

  /** 获取树的层级结构（便于前端渲染） */
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
