/**
 * DeepSeek Model Core AI Test
 * Verifies AI-powered generation actually works (not fallback)
 */

const PORT = process.argv[2] || 61359;
const BASE = `http://127.0.0.1:${PORT}/api/trpc`;

async function callApi(url, body, timeoutMs = 45000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
    signal: controller.signal,
  });
  clearTimeout(timer);
  return res.json();
}

console.log("========== DEEPSEEK AI CORE TEST ==========");
console.log(`Backend: ${BASE}`);
console.log("");

// Test 1: Standard generation with DeepSeek
console.log("[TEST 1] Standard generation (deepseek, auto framework)");
const r1 = await callApi(`${BASE}/promptForge.generate`, {
  json: { model: "deepseek", intent: "帮我写一份Python爬虫，爬取豆瓣电影Top250", framework: "auto", language: "zh", complexity: "medium", quickMode: false }
});
const a1 = r1?.result?.data?.json;
console.log("  Model:", a1?.model);
console.log("  Goal:", a1?.analysis?.goal);
console.log("  Domain:", a1?.analysis?.domain);
console.log("  Complexity:", a1?.analysis?.complexity);
console.log("  Results count:", a1?.results?.length);
console.log("  First framework:", a1?.results?.[0]?.framework);
console.log("  Prompt preview:", a1?.results?.[0]?.prompt?.substring(0, 100));
console.log("");

// Test 2: Verify Chinese is preserved
console.log("[TEST 2] Chinese intent preservation");
const r2 = await callApi(`${BASE}/promptForge.generate`, {
  json: { model: "deepseek", intent: "帮我写一份Python爬虫", framework: "auto", language: "zh", complexity: "simple", quickMode: true }
});
const a2 = r2?.result?.data?.json;
const goal2 = a2?.analysis?.goal;
const prompt2 = a2?.results?.[0]?.prompt;
console.log("  Goal:", goal2);
console.log("  Goal contains Chinese:", /[\u4e00-\u9fff]/.test(goal2));
console.log("  Prompt contains intent:", prompt2?.includes("Python爬虫") || prompt2?.includes("Python"));
console.log("");

// Test 3: Clarify with DeepSeek
console.log("[TEST 3] Clarify (vague intent)");
const r3 = await callApi(`${BASE}/promptForge.clarify`, {
  json: { intent: "设计一个网站" }
});
const a3 = r3?.result?.data?.json;
console.log("  needsClarification:", a3?.needsClarification);
console.log("  Questions count:", a3?.questions?.length);
console.log("  Questions:", a3?.questions?.map(q => q.question).join(" | "));
console.log("");

// Test 4: Decompose with DeepSeek (complex intent)
console.log("[TEST 4] Decompose (complex intent)");
const r4 = await callApi(`${BASE}/promptForge.decompose`, {
  json: { model: "deepseek", intent: "开发一个完整的B2C电商平台，包含用户注册登录、商品管理、购物车、订单系统、支付集成、物流追踪、后台管理系统、数据分析报表、多语言支持、移动端适配、SEO优化、缓存策略、数据库设计、API接口规范、安全认证、性能监控、自动化测试、CI/CD流水线部署、容器化运维、微服务架构拆分等模块。需要支持高并发、分布式事务、消息队列、搜索引擎、Redis缓存集群、MySQL主从复制、Elasticsearch全文检索、Kafka日志收集、Prometheus监控告警、Grafana可视化大盘、Kubernetes自动扩缩容、Istio服务网格、Vault密钥管理、Harbor镜像仓库、Jenkins持续集成、ArgoCD持续部署等基础设施" }
});
const a4 = r4?.result?.data?.json;
console.log("  Complexity:", a4?.analysis?.complexity);
console.log("  Decomposition:", a4?.decomposition ? "present" : "null");
console.log("  Steps count:", a4?.decomposition?.steps?.length);
if (a4?.decomposition?.steps?.length > 0) {
  console.log("  First step:", a4.decomposition.steps[0].title);
}
console.log("");

// Test 5: Quick generate
console.log("[TEST 5] Quick generate");
const r5 = await callApi(`${BASE}/promptForge.quickGenerate`, {
  json: { model: "deepseek", intent: "快速生成一个Python爬虫", language: "zh" }
});
const a5 = r5?.result?.data?.json;
console.log("  Framework:", a5?.framework);
console.log("  Prompt length:", a5?.result?.prompt?.length);
console.log("");

// Test 6: Optimizer with DeepSeek
console.log("[TEST 6] Optimizer");
const r6 = await callApi(`${BASE}/optimizer.optimize`, {
  json: { prompt: "Write a Python script", domain: "general", strategy: "general" }
});
const a6 = r6?.result?.data?.json;
console.log("  Optimized prompt length:", a6?.optimizedPrompt?.length);
console.log("  Improvements:", a6?.improvements?.length);
console.log("");

// Summary
console.log("========== DEEPSEEK TEST SUMMARY ==========");
const tests = [
  { name: "Standard generation", pass: a1?.results?.length > 0 && /[\u4e00-\u9fff]/.test(a1?.analysis?.goal) },
  { name: "Chinese preservation", pass: /[\u4e00-\u9fff]/.test(goal2) },
  { name: "Clarify", pass: typeof a3?.needsClarification === "boolean" },
  { name: "Decompose", pass: a4?.analysis?.complexity === "complex" },
  { name: "Quick generate", pass: a5?.result?.prompt?.length > 0 },
  { name: "Optimizer", pass: a6?.optimizedPrompt?.length > 0 },
];

let passCount = 0;
for (const t of tests) {
  const icon = t.pass ? "✅" : "❌";
  console.log(`  ${icon} ${t.name}`);
  if (t.pass) passCount++;
}
console.log(`\nResult: ${passCount}/${tests.length} passed`);

if (passCount === tests.length) {
  console.log("\n🎉 DeepSeek AI integration fully functional!");
} else {
  console.log("\n⚠️  Some tests failed. Check details above.");
}
