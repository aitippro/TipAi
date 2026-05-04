/**
 * P3-1: REST API 开放层
 *
 * 将核心 tRPC 功能暴露为标准 REST API，便于第三方集成。
 */
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import type { Context, Next } from "hono";
import { createRequire } from "module";
import { matchFrameworks } from "./services/framework";

const _require = createRequire(import.meta.url);
const PKG_VERSION = (_require("../package.json") as { version: string }).version;
import { runQualityGate } from "./services/quality/gate";
import { generateMultimodalPromptWithAI } from "./services/multimodal/multimodal-engine";
import { runTreeOfThoughts, setTotGenerator, setTotEvaluator } from "./services/ai/tree-of-thoughts";
import { callAI } from "./lib/ai-service-v3/client";
import { generateCitationsWithAI } from "./services/academic/academic";
import { verifySessionToken } from "./kimi/session";
import { findUserByUnionId } from "./queries/users";
import { Session } from "@contracts/constants";

const rest = new Hono();

// ── Auth Middleware ──────────────────────────────────────────────────────────

async function requireAuth(c: Context, next: Next) {
  const token = getCookie(c, Session.cookieName);
  if (!token) return c.json({ error: "Authentication required" }, 401);
  const claim = await verifySessionToken(token);
  if (!claim) return c.json({ error: "Invalid or expired session" }, 401);
  const user = await findUserByUnionId(claim.unionId);
  if (!user) return c.json({ error: "User not found" }, 401);
  c.set("user", user);
  await next();
}

async function authenticateOptional(c: Context, next: Next) {
  const body = await c.req.json().catch(() => ({}));
  if (body.apiKey) {
    // Caller provides their own API key — skip server-side auth
    await next();
    return;
  }
  // No external apiKey — require session authentication
  const token = getCookie(c, Session.cookieName);
  if (!token) {
    return c.json({ error: "Authentication required. Provide 'apiKey' in body or authenticate via session." }, 401);
  }
  const claim = await verifySessionToken(token);
  if (!claim) return c.json({ error: "Invalid or expired session" }, 401);
  const user = await findUserByUnionId(claim.unionId);
  if (!user) return c.json({ error: "User not found" }, 401);
  c.set("user", user);
  await next();
}

// ToT REST API 使用真实 LLM（需传入 apiKey + model）
function initTotAIEngine(model: string, apiKey: string) {
  setTotGenerator(async (problem, currentThought, breadth) => {
    const pathStr = currentThought ? currentThought : "（尚未开始）";
    const prompt = `你是一位擅长结构化推理的专家。请根据问题和当前思考，生成 ${breadth} 个不同的下一步思考候选。

【问题】${problem}
【当前思考】${pathStr}

请生成具体、可执行、互不相同的新思考步骤。每行一个候选，不要编号，不要额外解释：`;
    const response = await callAI(model, apiKey, "你是 Tree of Thoughts 候选生成器", prompt, 0.7);
    if (!response) throw new Error("ToT 候选生成失败");
    return response.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  });

  setTotEvaluator(async (problem, thought, path) => {
    const prompt = `你是一位严格的思考质量评估专家。

【问题】${problem}
【当前思考】${thought}
【已走过路径】${path.join(" → ")}

请按以下格式回复：
分数:<1-10的整数>
终局:<是|否>
理由:<一句话>`;
    const response = await callAI(model, apiKey, "你是 Tree of Thoughts 质量评估器", prompt, 0.3);
    if (!response) throw new Error("ToT 评估失败");
    const scoreMatch = response.match(/分数[:：]\s*(\d+)/i);
    const terminalMatch = response.match(/终局[:：]\s*(是|否|yes|no)/i);
    const reasonMatch = response.match(/理由[:：]\s*(.+)/i);
    if (!scoreMatch) throw new Error("ToT 评估解析失败");
    const value = Math.min(10, Math.max(1, parseInt(scoreMatch[1], 10)));
    const isTerminal = /是|yes/i.test(terminalMatch?.[1] ?? "");
    const reason = reasonMatch?.[1]?.trim() ?? `AI score ${value}`;
    return { value, isTerminal, reason };
  });
}

// Apply auth middleware
rest.use("/framework/match", requireAuth);
rest.use("/quality-gate/check", requireAuth);
rest.use("/multimodal/generate", authenticateOptional);
rest.use("/tot/solve", authenticateOptional);
rest.use("/academic/citations", authenticateOptional);

// ============================================================================
// REST Endpoints
// ============================================================================

rest.get("/ping", (c) => c.json({ ok: true, version: PKG_VERSION, timestamp: Date.now() }));

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
  const apiKey = body.apiKey || "";
  const model = body.model || "";
  const imageData = body.imageData || undefined;
  if (!request) return c.json({ error: "Missing 'request' field" }, 400);
  if (!apiKey || !model) {
    return c.json({ error: "Missing 'apiKey' and 'model' fields. Provide them to use real AI generation." }, 400);
  }

  try {
    const result = await generateMultimodalPromptWithAI(
      request,
      mode as "text-to-image" | "image-to-text" | "video-storyboard",
      model,
      apiKey,
      imageData,
    );
    return c.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});

rest.post("/tot/solve", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const problem = body.problem || "";
  const apiKey = body.apiKey || "";
  const model = body.model || "";
  if (!problem) return c.json({ error: "Missing 'problem' field" }, 400);
  if (!apiKey || !model) {
    return c.json({ error: "Missing 'apiKey' and 'model' fields. Provide them to use real AI generation." }, 400);
  }

  try {
    initTotAIEngine(model, apiKey);
    const result = await runTreeOfThoughts(problem, {
      strategy: body.strategy || "bfs",
      breadth: body.breadth ?? 3,
      maxDepth: body.maxDepth ?? 4,
    });
    return c.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});

rest.post("/academic/citations", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const text = body.text || "";
  const format = body.format || "apa";
  const apiKey = body.apiKey || "";
  const model = body.model || "";
  if (!text) return c.json({ error: "Missing 'text' field" }, 400);
  if (!apiKey || !model) {
    return c.json({ error: "Missing 'apiKey' and 'model' fields. Provide them to use real AI citation generation." }, 400);
  }

  try {
    const result = await generateCitationsWithAI(
      text,
      format as "apa" | "mla" | "gb7714" | "ieee" | "chicago",
      model,
      apiKey,
    );
    return c.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});

rest.get("/docs", (c) => {
  return c.json({
    name: "TipAi REST API",
    version: PKG_VERSION,
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
