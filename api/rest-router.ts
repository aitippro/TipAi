/**
 * P3-1: REST API 开放层
 *
 * 将核心 tRPC 功能暴露为标准 REST API，便于第三方集成。
 */
import { Hono } from "hono";
import { matchFrameworks } from "./services/framework";
import { runQualityGate } from "./services/quality/gate";
import { generateMultimodalPrompt } from "./services/multimodal/multimodal-engine";
import { runTreeOfThoughts, setTotGenerator, setTotEvaluator } from "./services/ai/tree-of-thoughts";
import { generateCitations } from "./services/academic/academic";

const rest = new Hono();

// 初始化 ToT 引擎（复用 tot-router 中的 mock）
const SIMULATED_STRATEGIES: Record<string, string[]> = {
  math: ["先列出已知条件", "尝试代入法求解", "建立方程组", "画图辅助理解", "逆向推导"],
  coding: ["先分析时间复杂度要求", "考虑使用哈希表优化查找", "尝试双指针技巧", "考虑动态规划", "先写暴力解法再优化"],
  writing: ["先确定目标读者", "列出核心要点大纲", "用故事化方式引入", "加入数据支撑论点", "考虑反方观点增强说服力"],
  general: ["分解问题为子任务", "先收集更多信息", "尝试类比相似问题", "从结果倒推步骤", "考虑约束条件的边界情况"],
};

function detectDomain(problem: string): string {
  const p = problem.toLowerCase();
  if (/\d+.*[+\-*\/=]|方程|求解|计算|math/i.test(p)) return "math";
  if (/代码|程序|算法|函数|python|javascript|bug|debug/i.test(p)) return "coding";
  if (/文章|写作|文案|邮件|报告|essay|write/i.test(p)) return "writing";
  return "general";
}

setTotGenerator(async (problem, currentThought, breadth) => {
  const domain = detectDomain(problem);
  const strategies = SIMULATED_STRATEGIES[domain] ?? SIMULATED_STRATEGIES.general;
  if (currentThought) {
    const nextSteps = [
      `${currentThought} → 验证可行性`,
      `${currentThought} → 寻找更优方案`,
      `${currentThought} → 考虑边界情况`,
    ];
    return nextSteps.slice(0, breadth);
  }
  const shuffled = [...strategies].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, breadth);
});

setTotEvaluator(async (_problem, thought) => {
  let value = 5;
  const lower = thought.toLowerCase();
  if (/验证|测试|检查/i.test(lower)) value += 2;
  if (/优化|更优|改进/i.test(lower)) value += 2;
  if (/边界|异常|容错/i.test(lower)) value += 1;
  if (/对比|分析|评估/i.test(lower)) value += 1;
  if (thought.length < 10) value -= 2;
  if (thought.length > 30) value += 1;
  value = Math.min(10, Math.max(1, value));
  const isTerminal = /结论|答案|结果|完成|最终/i.test(lower) || value >= 9;
  return { value, isTerminal, reason: `heuristic score ${value}` };
});

// ============================================================================
// REST Endpoints
// ============================================================================

rest.get("/ping", (c) => c.json({ ok: true, version: "1.2.2", timestamp: Date.now() }));

rest.post("/framework/match", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const intent = body.intent || "";
  if (!intent) return c.json({ error: "Missing 'intent' field" }, 400);

  const result = matchFrameworks(intent);
  return c.json(result);
});

rest.post("/quality-gate/check", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const prompt = body.prompt || "";
  const threshold = body.threshold ?? 70;
  if (!prompt) return c.json({ error: "Missing 'prompt' field" }, 400);

  const result = runQualityGate(prompt, { threshold });
  return c.json(result);
});

rest.post("/multimodal/generate", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const request = body.request || "";
  const mode = body.mode || "text-to-image";
  if (!request) return c.json({ error: "Missing 'request' field" }, 400);

  const result = generateMultimodalPrompt(request, mode as any);
  return c.json(result);
});

rest.post("/tot/solve", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const problem = body.problem || "";
  if (!problem) return c.json({ error: "Missing 'problem' field" }, 400);

  const result = await runTreeOfThoughts(problem, {
    strategy: body.strategy || "bfs",
    breadth: body.breadth ?? 3,
    maxDepth: body.maxDepth ?? 4,
  });
  return c.json(result);
});

rest.post("/academic/citations", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const text = body.text || "";
  const format = body.format || "apa";
  if (!text) return c.json({ error: "Missing 'text' field" }, 400);

  const result = generateCitations(text, format as any);
  return c.json(result);
});

rest.get("/docs", (c) => {
  return c.json({
    name: "TipAi REST API",
    version: "1.2.2",
    baseUrl: "/api/rest",
    endpoints: [
      { method: "GET", path: "/ping", description: "健康检查" },
      { method: "POST", path: "/framework/match", description: "框架匹配", body: { intent: "string" } },
      { method: "POST", path: "/quality-gate/check", description: "质量门禁", body: { prompt: "string", threshold: "number?" } },
      { method: "POST", path: "/multimodal/generate", description: "多模态提示词", body: { request: "string", mode: "text-to-image | image-to-text | video-storyboard" } },
      { method: "POST", path: "/tot/solve", description: "Tree of Thoughts 推理", body: { problem: "string", strategy: "bfs | dfs?", breadth: "number?", maxDepth: "number?" } },
      { method: "POST", path: "/academic/citations", description: "学术引用生成", body: { text: "string", format: "apa | mla | gb7714 | ieee | chicago" } },
    ],
  });
});

export { rest };
