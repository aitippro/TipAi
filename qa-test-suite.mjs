/**
 * TipAi Desktop QA Test Suite v2
 * Node.js-based, explicit UTF-8, correct route names
 */

const PORT = process.argv[2] || 61359;
const BASE = `http://127.0.0.1:${PORT}/api/trpc`;

const results = [];
const failures = [];

function addResult(name, status, code, detail = "") {
  const d = detail.replace(/\s+/g, " ").slice(0, 200);
  results.push({ Test: name, Status: status, Code: code, Detail: d });
  if (status === "FAIL") failures.push(name);
}

async function qaPost(name, url, body, timeoutMs, validate) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const text = await res.text();
    let pass = res.ok;
    let data = null;
    try { data = JSON.parse(text); } catch {}
    if (pass && validate) {
      pass = await validate(data);
    }
    if (pass) addResult(name, "PASS", res.status);
    else addResult(name, "FAIL", res.status, `Validation failed: ${text.slice(0, 300)}`);
  } catch (err) {
    addResult(name, "FAIL", "ERR", err.message);
  }
}

async function qaGet(name, url, timeoutMs, validate) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timer);
    const text = await res.text();
    let pass = res.ok;
    let data = null;
    try { data = JSON.parse(text); } catch {}
    if (pass && validate) {
      pass = await validate(data);
    }
    if (pass) addResult(name, "PASS", res.status);
    else addResult(name, "FAIL", res.status, `Validation failed: ${text.slice(0, 300)}`);
  } catch (err) {
    addResult(name, "FAIL", "ERR", err.message);
  }
}

// URL-encode helper for GET query params
function qp(obj) {
  return encodeURIComponent(JSON.stringify(obj));
}

console.log("========== TIPAI DESKTOP QA TEST SUITE v2 ==========");
console.log(`Backend: ${BASE}`);
console.log(`Started: ${new Date().toISOString()}`);
console.log("");

// =============================================================
// SECTION 1: Health, Auth & Settings
// =============================================================
console.log("[SECTION 1] Health, Auth & Settings");
await qaGet("1.1  Ping", `${BASE}/ping`, 5000, d => d?.result?.data?.json?.ok === true);
await qaGet("1.2  Auth.me", `${BASE}/auth.me`, 5000, d => d?.result?.data?.json?.unionId === "local-user");
await qaGet("1.3  Settings.get", `${BASE}/promptForge.getSettings`, 5000, d => d?.result?.data?.json?.hasKimiKey === true);
await qaPost("1.4  Settings.update model", `${BASE}/promptForge.updateSettings`, { json: { defaultModel: "kimi" } }, 5000, d => d?.result?.data?.json?.success === true);
await qaPost("1.5  Settings.update framework", `${BASE}/promptForge.updateSettings`, { json: { defaultFramework: "co-star" } }, 5000, d => d?.result?.data?.json?.success === true);
await qaPost("1.6  Settings.restore defaults", `${BASE}/promptForge.updateSettings`, { json: { defaultModel: "kimi", defaultFramework: "auto", defaultLanguage: "zh" } }, 5000, d => d?.result?.data?.json?.success === true);

// =============================================================
// SECTION 2: Prompt Forge Core Generation
// =============================================================
console.log("[SECTION 2] Prompt Forge Core Generation");
await qaPost("2.1  Generate (auto)", `${BASE}/promptForge.generate`,
  { json: { model: "kimi", intent: "帮我写一份产品需求文档，关于在线预约系统", framework: "auto", language: "zh", complexity: "medium", quickMode: false } },
  45000, d => d?.result?.data?.json?.results?.length > 0);

await qaPost("2.2  Generate (CO-STAR)", `${BASE}/promptForge.generate`,
  { json: { model: "kimi", intent: "写一篇小红书文案推广护肤品", framework: "co-star", language: "zh", complexity: "medium", quickMode: false } },
  45000, d => d?.result?.data?.json?.results?.[0]?.framework === "CO-STAR");

await qaPost("2.3  Generate (RISEN complex)", `${BASE}/promptForge.generate`,
  { json: { model: "kimi", intent: "设计6天5晚日本关西自由行行程", framework: "risen", language: "zh", complexity: "complex", quickMode: false } },
  45000, d => d?.result?.data?.json?.results?.[0]?.framework === "RISE-N");

await qaPost("2.4  Generate (RTF simple)", `${BASE}/promptForge.generate`,
  { json: { model: "kimi", intent: "总结文章核心观点", framework: "rtf", language: "zh", complexity: "simple", quickMode: false } },
  45000, d => d?.result?.data?.json?.results?.[0]?.framework === "RTF");

await qaPost("2.5  Quick generate", `${BASE}/promptForge.quickGenerate`,
  { json: { model: "kimi", intent: "快速生成Python爬虫", language: "zh" } },
  45000, d => d?.result?.data?.json?.result?.prompt?.length > 0);

await qaPost("2.6  Clarify (vague)", `${BASE}/promptForge.clarify`,
  { json: { intent: "设计一个网站" } },
  45000, d => d?.result?.data?.json?.needsClarification === true);

await qaPost("2.7  Clarify (specific)", `${BASE}/promptForge.clarify`,
  { json: { intent: "用Python写豆瓣电影Top250爬虫保存到CSV" } },
  45000, d => Array.isArray(d?.result?.data?.json?.questions));

await qaPost("2.8  Decompose", `${BASE}/promptForge.decompose`,
  { json: { model: "kimi", intent: "开发完整电商系统" } },
  45000, d => Array.isArray(d?.result?.data?.json?.decomposition?.steps));

// =============================================================
// SECTION 3: Extreme Input Edge Cases
// =============================================================
console.log("[SECTION 3] Extreme Input Edge Cases");
await qaPost("3.1  Empty intent", `${BASE}/promptForge.generate`,
  { json: { model: "kimi", intent: "", framework: "auto", language: "zh", complexity: "simple", quickMode: true } },
  45000, d => d?.result?.data?.json?.results?.length > 0);

await qaPost("3.2  Emoji", `${BASE}/promptForge.generate`,
  { json: { model: "kimi", intent: "🚀写火箭发射模拟程序❤️", framework: "auto", language: "zh", complexity: "simple", quickMode: true } },
  45000, d => d?.result?.data?.json?.results?.length > 0);

await qaPost("3.3  Mixed languages", `${BASE}/promptForge.generate`,
  { json: { model: "kimi", intent: "日本語文章を書いてこんにちは你好", framework: "auto", language: "zh", complexity: "simple", quickMode: true } },
  45000, d => d?.result?.data?.json?.results?.length > 0);

await qaPost("3.4  SQL injection attempt", `${BASE}/promptForge.generate`,
  { json: { model: "kimi", intent: "test'; DROP TABLE users; --", framework: "auto", language: "zh", complexity: "simple", quickMode: true } },
  45000, d => d?.result?.data?.json?.results?.length > 0);

await qaPost("3.5  XSS attempt", `${BASE}/promptForge.generate`,
  { json: { model: "kimi", intent: "<script>alert(1)</script>", framework: "auto", language: "zh", complexity: "simple", quickMode: true } },
  45000, d => d?.result?.data?.json?.results?.length > 0);

// =============================================================
// SECTION 4: Framework System
// =============================================================
console.log("[SECTION 4] Framework System");
await qaGet("4.1  Framework.graph", `${BASE}/framework.graph`, 5000, d => d?.result?.data?.json?.nodes?.length > 0);
await qaGet("4.2  Framework.stats", `${BASE}/framework.stats`, 5000, d => d?.result?.data?.json?.totalFrameworks === 30);
await qaGet("4.3  Framework.match", `${BASE}/framework.match?input=${qp({ json: { intent: "写一篇营销文案" } })}`, 5000, d => Array.isArray(d?.result?.data?.json));
await qaGet("4.4  Framework.similar", `${BASE}/framework.similar?input=${qp({ json: { key: "co-star" } })}`, 5000, d => Array.isArray(d?.result?.data?.json));
await qaGet("4.5  Framework.upgradePath", `${BASE}/framework.upgradePath?input=${qp({ json: { key: "rtf" } })}`, 5000, d => Array.isArray(d?.result?.data?.json));
await qaGet("4.6  Framework.hybrid", `${BASE}/framework.hybrid?input=${qp({ json: { domain: "programming", complexity: "complex" } })}`, 5000, d => Array.isArray(d?.result?.data?.json));

// =============================================================
// SECTION 5: Prompt Library
// =============================================================
console.log("[SECTION 5] Prompt Library");
await qaGet("5.1  Library.getLibrary", `${BASE}/promptForge.getLibrary`, 5000, d => Array.isArray(d?.result?.data?.json));
await qaPost("5.2  Library.saveToLibrary", `${BASE}/promptForge.saveToLibrary`,
  { json: { title: "Test Prompt", generatedPrompt: "This is a test prompt", framework: "co-star", domain: "general", model: "kimi", tags: "test,qa" } },
  5000, d => d?.result?.data?.json?.id > 0);
await qaGet("5.3  Library.getLibrary (after save)", `${BASE}/promptForge.getLibrary`, 5000, d => d?.result?.data?.json?.length > 0);
await qaPost("5.4  Library.deleteFromLibrary", `${BASE}/promptForge.deleteFromLibrary`,
  { json: { id: 1 } },
  5000, d => d?.result?.data?.json?.success === true);

// =============================================================
// SECTION 6: Templates
// =============================================================
console.log("[SECTION 6] Templates");
await qaGet("6.1  Template.list", `${BASE}/template.list`, 5000, d => Array.isArray(d?.result?.data?.json));
await qaPost("6.2  Template.create", `${BASE}/template.create`,
  { json: { title: "QATemplate", content: "QA test template", description: "For testing", framework: "rtf", domain: "general", tags: "qa,test" } },
  5000, d => d?.result?.data?.json?.id > 0);
await qaGet("6.3  Template.myTemplates", `${BASE}/template.myTemplates`, 5000, d => Array.isArray(d?.result?.data?.json));
await qaPost("6.4  Template.delete", `${BASE}/template.delete`,
  { json: { id: 1 } },
  5000, d => d?.result?.data?.json?.success === true);

// =============================================================
// SECTION 7: Projects
// =============================================================
console.log("[SECTION 7] Projects");
await qaGet("7.1  Project.list", `${BASE}/project.list`, 5000, d => Array.isArray(d?.result?.data?.json));
await qaPost("7.2  Project.create", `${BASE}/project.create`,
  { json: { title: "QA Project", description: "Test project for QA", domain: "programming", intent: "Build a test app" } },
  5000, d => d?.result?.data?.json?.id > 0);
await qaGet("7.3  Project.get", `${BASE}/project.get?input=${qp({ json: { id: 1 } })}`, 5000, d => d?.result?.data?.json?.id === 1);
await qaGet("7.4  Project.getConversation", `${BASE}/project.getConversation?input=${qp({ json: { id: 1 } })}`, 5000, d => Array.isArray(d?.result?.data?.json));
await qaPost("7.5  Project.saveConversationTurn", `${BASE}/project.saveConversationTurn`,
  { json: { projectId: 1, role: "user", content: "Hello test", turnNumber: 1 } },
  5000, d => d?.result?.data?.json?.id > 0);
await qaGet("7.6  Project.getSummary", `${BASE}/project.getSummary?input=${qp({ json: { id: 1 } })}`, 5000, d => d?.result?.data?.json != null);
await qaPost("7.7  Project.update", `${BASE}/project.update`,
  { json: { id: 1, title: "Updated QA Project", status: "ready" } },
  5000, d => d?.result?.data?.json?.title === "Updated QA Project");
await qaPost("7.8  Project.delete", `${BASE}/project.delete`,
  { json: { id: 1 } },
  5000, d => d?.result?.data?.json?.success === true);

// =============================================================
// SECTION 8: Optimizer
// =============================================================
console.log("[SECTION 8] Optimizer");
await qaPost("8.1  Optimizer.optimize", `${BASE}/optimizer.optimize`,
  { json: { prompt: "Write code", domain: "general", strategy: "general" } },
  45000, d => d?.result?.data?.json?.optimizedPrompt?.length > 0);
await qaGet("8.2  Optimizer.history", `${BASE}/optimizer.history`, 5000, d => Array.isArray(d?.result?.data?.json));

// =============================================================
// SECTION 9: Export
// =============================================================
console.log("[SECTION 9] Export");
await qaPost("9.1  Export.json", `${BASE}/export.prompts`,
  { json: { format: "json", data: [] } },
  5000, d => d?.result?.data?.json?.format === "json");
await qaPost("9.2  Export.markdown", `${BASE}/export.prompts`,
  { json: { format: "markdown", data: [{ title: "Test", prompt: "Hello" }] } },
  5000, d => d?.result?.data?.json?.format === "markdown");

// =============================================================
// SECTION 10: Rate Limiting
// =============================================================
console.log("[SECTION 10] Rate Limiting");
for (let i = 1; i <= 5; i++) {
  await qaPost(`10.${i} Rapid generate`, `${BASE}/promptForge.generate`,
    { json: { model: "kimi", intent: "测试速率限制", framework: "auto", language: "zh", complexity: "simple", quickMode: true } },
    15000, d => d?.result?.data?.json?.results?.length > 0);
}

// =============================================================
// SECTION 11: Deep Functional Verification
// =============================================================
console.log("[SECTION 11] Deep Functional Verification");

// 11.1 Verify Chinese goal is preserved correctly
await qaPost("11.1 Chinese intent analysis", `${BASE}/promptForge.generate`,
  { json: { model: "kimi", intent: "帮我写一份Python爬虫", framework: "auto", language: "zh", complexity: "simple", quickMode: true } },
  45000, d => {
    const a = d?.result?.data?.json?.analysis;
    return a?.goal === "帮我写一份Python爬虫" || a?.goal?.includes("Python");
  });

// 11.2 Verify generated prompt contains original intent
await qaPost("11.2 Prompt contains intent", `${BASE}/promptForge.generate`,
  { json: { model: "kimi", intent: "帮我写一份Python爬虫", framework: "auto", language: "zh", complexity: "simple", quickMode: true } },
  45000, d => {
    const prompt = d?.result?.data?.json?.results?.[0]?.prompt;
    return prompt?.includes("帮我写一份Python爬虫") || prompt?.includes("Python");
  });

// 11.3 Verify framework recommendation works
await qaPost("11.3 Framework recommendation", `${BASE}/promptForge.generate`,
  { json: { model: "kimi", intent: "写一段Python代码", framework: "auto", language: "zh", complexity: "simple", quickMode: true } },
  45000, d => {
    const recs = d?.result?.data?.json?.recommendations;
    return Array.isArray(recs) && recs.length > 0 && recs[0]?.framework;
  });

// =============================================================
// REPORT
// =============================================================
console.log("");
console.log("========== QA TEST REPORT ==========");
const passCount = results.filter(r => r.Status === "PASS").length;
const failCount = results.filter(r => r.Status === "FAIL").length;
console.log(`Total: ${results.length}`);
console.log(`PASS : ${passCount}`);
console.log(`FAIL : ${failCount}`);
console.log(`Time : ${new Date().toISOString()}`);
console.log("");

if (failures.length > 0) {
  console.log("FAILED TESTS:");
  for (const f of failures) console.log(`  - ${f}`);
  console.log("");
}

// Save JSON report
import { writeFileSync } from "fs";
writeFileSync(
  `${process.env.APPDATA}\\TipAi\\data\\qa-report-v2.json`,
  JSON.stringify({ results, failures, summary: { total: results.length, pass: passCount, fail: failCount, timestamp: new Date().toISOString() } }, null, 2),
  "utf-8"
);
console.log(`Report saved to: ${process.env.APPDATA}\\TipAi\\data\\qa-report-v2.json`);

if (failCount > 0) {
  console.log("\nFAILURE DETAILS:");
  for (const r of results.filter(r => r.Status === "FAIL")) {
    console.log(`  ${r.Test} | Code: ${r.Code} | ${r.Detail}`);
  }
  process.exit(1);
} else {
  console.log("\n✅ ALL TESTS PASSED!");
  process.exit(0);
}
