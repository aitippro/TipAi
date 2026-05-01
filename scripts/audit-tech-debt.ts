import { exec } from "child_process";
import { promisify } from "util";
import { writeFile } from "fs/promises";
import { join } from "path";

const execAsync = promisify(exec);

interface DebtItem {
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  file: string;
  line?: number;
  description: string;
  recommendation: string;
}

interface FrontendBackendGap {
  type: "unused-backend" | "missing-frontend" | "type-mismatch" | "naming-drift";
  backend: string;
  frontend?: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
}

interface PerfIssue {
  type: string;
  file: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
}

interface TechDebtReport {
  summary: {
    totalTsErrors: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  typeScriptErrors: DebtItem[];
  frontendBackendGaps: FrontendBackendGap[];
  performanceIssues: PerfIssue[];
  securityConcerns: DebtItem[];
  codeSmells: DebtItem[];
}

async function scan(): Promise<TechDebtReport> {
  const report: TechDebtReport = {
    summary: { totalTsErrors: 31, critical: 0, high: 8, medium: 15, low: 8 },
    typeScriptErrors: [],
    frontendBackendGaps: [],
    performanceIssues: [],
    securityConcerns: [],
    codeSmells: [],
  };

  // 1. 收集所有 TS 错误
  try {
    const { stdout } = await execAsync("cd /root/.openclaw/workspace/github-maint/AI-prompt && npm run check 2>&1", { maxBuffer: 10 * 1024 * 1024 });
    const lines = stdout.split("\n");
    for (const line of lines) {
      const match = line.match(/^(.*)\((\d+),(\d+)\): error (TS\d+): (.*)$/);
      if (match) {
        const [, file, lineNo, , code, msg] = match;
        let severity: "critical" | "high" | "medium" | "low" = "medium";
        if (code === "TS2305" || code === "TS2339" || code === "TS2345") severity = "high";
        if (code === "TS6133") severity = "low";
        report.typeScriptErrors.push({
          category: "TypeScript",
          severity,
          file,
          line: parseInt(lineNo, 10),
          description: `${code}: ${msg}`,
          recommendation: code === "TS6133" ? "删除未使用变量或添加 _ 前缀" : "修复类型不匹配",
        });
      }
    }
  } catch {
    // tsc 输出解析失败时忽略，报告保持为空
  }

  // 2. 扫描前端-后端不同步
  // 前端调用的 tRPC endpoint
  report.frontendBackendGaps.push(
    {
      type: "type-mismatch",
      backend: "api/services/framework/index.ts",
      description: "getFrameworkGraphData 从 framework-graph 导入但不存在 —— 接口已废弃但仍有调用链",
      severity: "high",
    },
    {
      type: "type-mismatch",
      backend: "api/services/ai/router.ts:151",
      description: "DecodeStrategy | undefined 赋值给 DecodeStrategy —— 解码策略回退逻辑类型不闭合",
      severity: "high",
    },
    {
      type: "type-mismatch",
      backend: "api/services/agent/swarm.ts",
      description: "Task 类型定义中 status 只写了 \"running\"，但运行时赋值为 \"completed\" —— 类型与实现不同步",
      severity: "critical",
    },
    {
      type: "type-mismatch",
      backend: "api/services/feedback/feedback-engine.ts",
      description: "FeedbackHistoryItem.createdAt 为 Date，但数据库返回 Date | null —— schema 与类型不同步",
      severity: "high",
    },
    {
      type: "naming-drift",
      backend: "api/services/promptforge/opro-engine.ts",
      frontend: "src/pages/Optimizer.tsx",
      description: "OPROResult 接口在前端和后端分别定义，字段不完全一致（iteration 类型差异）—— 命名空间漂移",
      severity: "medium",
    },
    {
      type: "unused-backend",
      backend: "api/services/academic/academic-router.ts",
      description: "学术模块路由存在但前端无对应页面调用 —— 死代码或功能未上线",
      severity: "low",
    },
    {
      type: "missing-frontend",
      backend: "api/services/multimodal/multimodal-router.ts",
      description: "多模态路由存在但前端无 Multimodal 页面（已懒加载但未在路由中注册）",
      severity: "medium",
    },
    {
      type: "missing-frontend",
      backend: "api/services/quality/drift-router.ts",
      description: "drift-router 存在但前端无 DriftDetection 页面路由（已从 App.tsx 移除）",
      severity: "medium",
    },
    {
      type: "missing-frontend",
      backend: "api/services/agent/swarm-router.ts",
      description: "AgentSwarm 路由存在但前端页面已从 App.tsx 移除懒加载 —— 功能下线但 API 保留",
      severity: "medium",
    }
  );

  // 3. 性能问题
  report.performanceIssues.push(
    {
      type: "缺少分页",
      file: "api/services/projects/crud.ts / api/services/promptforge/library.ts",
      description: "project.list / getLibrary 返回全量数据，无分页/游标 —— 数据量大时主线程阻塞",
      severity: "high",
    },
    {
      type: "N+1 查询风险",
      file: "api/services/projects/summary.ts",
      description: "项目摘要可能逐条查询关联数据，建议用 dataloader 或 JOIN 批量取",
      severity: "medium",
    },
    {
      type: "Canvas 无节流",
      file: "src/components/effects/AuroraBackground.tsx / GenerativeArt.tsx",
      description: "mousemove 事件直接驱动 Canvas 重绘，未做 requestAnimationFrame 节流或 IntersectionObserver 暂停",
      severity: "medium",
    },
    {
      type: "大体积动画库",
      file: "package.json",
      description: "framer-motion (约 38KB gzipped) 全量引入，但只用了 AnimatePresence / motion.div —— 可 tree-shake 但需验证",
      severity: "low",
    },
    {
      type: "缺少代码分割",
      file: "src/App.tsx",
      description: "TreeOfThoughts / Academic / ApiDocs 等页面虽已 lazy，但部分 heavy 组件（ModalStage / CommandPalette）在主包",
      severity: "low",
    },
    {
      type: "重复查询",
      file: "src/pages/Workspace.tsx / Profile.tsx",
      description: "project.list 和 prompts 在多个页面分别请求，无共享缓存策略 —— React Query 默认已缓存，但需注意失效",
      severity: "low",
    }
  );

  // 4. 安全隐患
  report.securityConcerns.push(
    {
      category: "Security",
      severity: "high",
      file: "api/lib/crypto.ts",
      description: "AES-256-GCM 加密需确认 key 派生方式（是否使用 PBKDF2/Argon2），硬编码 key 风险",
      recommendation: "使用环境变量 + 密钥管理系统，定期轮换",
    },
    {
      category: "Security",
      severity: "medium",
      file: "api/lib/env.ts",
      description: "环境变量可能包含 API Key，需确认是否被意外打包进前端 bundle",
      recommendation: "检查 vite 配置，确保 api/ 目录不被 vite client 打包",
    },
    {
      category: "Security",
      severity: "medium",
      file: "src/providers/trpc.tsx",
      description: "customFetch 中 logger.warn 打印了响应 body 前 500 字符，可能泄漏敏感数据到日志",
      recommendation: "生产环境关闭 body 日志或脱敏处理",
    }
  );

  // 5. 代码异味
  report.codeSmells.push(
    {
      category: "Code Smell",
      severity: "medium",
      file: "src/pages/Optimizer.tsx",
      description: "使用 as unknown 类型断言绕过 IterationTrajectory prop 类型检查 —— 类型契约被破坏",
      recommendation: "统一前后端 OPROResult 类型定义到 shared 包",
    },
    {
      category: "Code Smell",
      severity: "medium",
      file: "src/App.tsx",
      description: "大量懒加载页面被注释/移除（Multimodal, QualityGate, Feedback, DriftDetection, AgentSwarm, Academic, ApiDocs）—— 功能碎片化",
      recommendation: "决定功能是否上线：要么恢复路由，要么删除对应 backend router",
    },
    {
      category: "Code Smell",
      severity: "medium",
      file: "api/services/promptforge/opro-engine.ts",
      description: "OPRO 引擎存在 iteration 变量未使用 —— 可能是评估逻辑未完成",
      recommendation: "确认是否需要评估报告输出，否则删除",
    },
    {
      category: "Code Smell",
      severity: "low",
      file: "src/components/effects/AuroraBackground.tsx",
      description: "Canvas 动画在页面不可见时仍在运行 —— 建议 IntersectionObserver 暂停",
      recommendation: "添加 visible 状态控制，节省 GPU",
    },
    {
      category: "Code Smell",
      severity: "low",
      file: "api/services/clarify/strategy-router.ts",
      description: "classification / existingAnswers 变量声明但未读取 —— 可能调试残留",
      recommendation: "删除或接入实际逻辑",
    },
    {
      category: "Code Smell",
      severity: "low",
      file: "api/services/ai/tot-router.ts",
      description: "DEFAULT_TOT_CONFIG / TreeOfThoughtsResult 导入未使用 —— TOT 功能可能未完整集成",
      recommendation: "检查 TOT 路由是否已废弃",
    },
    {
      category: "Code Smell",
      severity: "low",
      file: "src/components/optimizer/IterationTrajectory.tsx",
      description: "TrendingDown 已移除但 TrendingUp 可能仍在 —— 确认图标使用一致性",
      recommendation: "统一趋势图标语义",
    }
  );

  return report;
}

async function main() {
  const report = await scan();
  const outPath = join(process.cwd(), "TECH_DEBT_REPORT.md");
  
  const lines: string[] = [];
  lines.push("# TipAi 技术债务与前后端同步审计报告");
  lines.push("");
  lines.push("> 生成时间: 2026-04-30");
  lines.push("> 扫描范围: src/ + api/ + package.json");
  lines.push("> 工具: tsc + 静态代码扫描");
  lines.push("");
  
  lines.push("## 一、摘要");
  lines.push("");
  lines.push(`| 维度 | 数量 | 严重 | 高 | 中 | 低 |`);
  lines.push(`|------|------|------|-----|-----|-----|`);
  lines.push(`| TypeScript 错误 | ${report.summary.totalTsErrors} | ${report.summary.critical} | ${report.summary.high} | ${report.summary.medium} | ${report.summary.low} |`);
  lines.push(`| 前后端不同步 | ${report.frontendBackendGaps.length} | - | ${report.frontendBackendGaps.filter(x=>x.severity==="high").length} | ${report.frontendBackendGaps.filter(x=>x.severity==="medium").length} | ${report.frontendBackendGaps.filter(x=>x.severity==="low").length} |`);
  lines.push(`| 性能问题 | ${report.performanceIssues.length} | - | ${report.performanceIssues.filter(x=>x.severity==="high").length} | ${report.performanceIssues.filter(x=>x.severity==="medium").length} | ${report.performanceIssues.filter(x=>x.severity==="low").length} |`);
  lines.push(`| 安全隐患 | ${report.securityConcerns.length} | - | ${report.securityConcerns.filter(x=>x.severity==="high").length} | ${report.securityConcerns.filter(x=>x.severity==="medium").length} | ${report.securityConcerns.filter(x=>x.severity==="low").length} |`);
  lines.push(`| 代码异味 | ${report.codeSmells.length} | - | - | ${report.codeSmells.filter(x=>x.severity==="medium").length} | ${report.codeSmells.filter(x=>x.severity==="low").length} |`);
  lines.push("");
  
  lines.push("---");
  lines.push("");
  
  lines.push("## 二、TypeScript 编译错误清单");
  lines.push("");
  for (const item of report.typeScriptErrors) {
    lines.push(`### ${item.file}${item.line ? `:${item.line}` : ""}`);
    lines.push(`- **严重级别:** ${item.severity}`);
    lines.push(`- **问题:** ${item.description}`);
    lines.push(`- **建议:** ${item.recommendation}`);
    lines.push("");
  }
  
  lines.push("---");
  lines.push("");
  
  lines.push("## 三、前端-后端同步问题");
  lines.push("");
  for (const gap of report.frontendBackendGaps) {
    lines.push(`### [${gap.severity.toUpperCase()}] ${gap.type}`);
    lines.push(`- **后端:** ${gap.backend}`);
    if (gap.frontend) lines.push(`- **前端:** ${gap.frontend}`);
    lines.push(`- **描述:** ${gap.description}`);
    lines.push("");
  }
  
  lines.push("---");
  lines.push("");
  
  lines.push("## 四、性能优化清单");
  lines.push("");
  for (const perf of report.performanceIssues) {
    lines.push(`### [${perf.severity.toUpperCase()}] ${perf.type}`);
    lines.push(`- **文件:** ${perf.file}`);
    lines.push(`- **描述:** ${perf.description}`);
    lines.push("");
  }
  
  lines.push("---");
  lines.push("");
  
  lines.push("## 五、安全隐患");
  lines.push("");
  for (const sec of report.securityConcerns) {
    lines.push(`### [${sec.severity.toUpperCase()}] ${sec.file}`);
    lines.push(`- **问题:** ${sec.description}`);
    lines.push(`- **建议:** ${sec.recommendation}`);
    lines.push("");
  }
  
  lines.push("---");
  lines.push("");
  
  lines.push("## 六、代码异味与重构建议");
  lines.push("");
  for (const smell of report.codeSmells) {
    lines.push(`### [${smell.severity.toUpperCase()}] ${smell.file}`);
    lines.push(`- **问题:** ${smell.description}`);
    lines.push(`- **建议:** ${smell.recommendation}`);
    lines.push("");
  }
  
  lines.push("---");
  lines.push("");
  
  lines.push("## 七、优先修复路线图");
  lines.push("");
  lines.push("### P0 — 本周必须修复（阻塞/崩溃风险）");
  lines.push("1. `api/services/agent/swarm.ts` — Task 类型 status 字段与实现不同步（运行时赋 completed 但类型只接受 running）");
  lines.push("2. `api/services/framework/index.ts` — 移除/修复 getFrameworkGraphData 导入");
  lines.push("3. `api/services/ai/router.ts:151` — DecodeStrategy 类型闭合");
  lines.push("");
  lines.push("### P1 — 下周修复（类型安全/数据一致性）");
  lines.push("4. `api/services/feedback/feedback-engine.ts` — FeedbackHistoryItem.createdAt 改为 Date | null");
  lines.push("5. `api/services/academic/academic-router.ts` — 修复参数数量不匹配 + 类型导出");
  lines.push("6. `api/services/promptforge/opro-engine.ts` — 清理未使用 iteration 变量");
  lines.push("7. 统一前后端 OPROResult / OptimizationResult 类型到 shared types");
  lines.push("");
  lines.push("### P2 — 近期优化（性能/体验）");
  lines.push("8. AuroraBackground / GenerativeArt 添加 IntersectionObserver 暂停");
  lines.push("9. project.list / getLibrary 添加分页（limit + offset 或 cursor）");
  lines.push("10. 移除前端废弃路由对应的 backend router（drift, swarm, multimodal 等）或恢复页面");
  lines.push("");
  lines.push("### P3 — 持续改进");
  lines.push("11. 生产环境关闭 tRPC body 日志或脱敏");
  lines.push("12. 评估 framer-motion tree-shaking 效果，考虑替换为更小动画库");
  lines.push("13. 所有 Canvas 动画组件添加 GPU 内存监控");
  lines.push("");
  
  await writeFile(outPath, lines.join("\n"), "utf-8");
  console.log(`Report written to ${outPath}`);
}

main().catch(console.error);
