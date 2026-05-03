/**
 * P2-1: 质量门禁系统 (Quality Gate)
 *
 * 对提示词进行 12 项自动化检查，输出质量评分和改进建议。
 *
 * 分为两条路径：
 *  - runQualityGate(): 基于正则/启发式的规则引擎（12 项自动化检查）
 *    速度快、零成本、不依赖外部服务，适合本地离线使用。
 *  - runQualityGateWithAI(model, apiKey): 在规则检查结果之上调用 LLM
 *    生成深度分析和个性化改进建议（推荐）。
 */

import { callAI } from "../../lib/ai-service-v3/client";
import { native } from "../../lib/native";

export interface QualityCheck {
  id: string;
  name: string;
  passed: boolean;
  score: number; // 0-10
  message: string;
  severity: "error" | "warning" | "info";
  suggestion: string;
}

export interface QualityGateResult {
  overallScore: number; // 0-100
  passed: boolean;
  threshold: number;
  checks: QualityCheck[];
  summary: string;
  topIssues: QualityCheck[];
  aiAnalysis?: string;
  usingAI: boolean;
}

export interface GateConfig {
  threshold: number; // 通过阈值 0-100
  enabledChecks: string[];
}

export const DEFAULT_GATE_CONFIG: GateConfig = {
  threshold: 70,
  enabledChecks: [], // 空数组表示启用所有
};

// ============================================================================
// 检查点实现
// ============================================================================

const CHECKERS: Record<string, (prompt: string) => Omit<QualityCheck, "id" | "name">> = {
  length_check: (prompt) => {
    const len = prompt.length;
    const score = len > 4000 ? 2 : len > 2000 ? 5 : len < 20 ? 3 : len < 50 ? 6 : 10;
    return {
      passed: score >= 6,
      score,
      message: len < 20 ? `过短 (${len} 字符)` : len > 4000 ? `过长 (${len} 字符)` : `长度适中 (${len} 字符)`,
      severity: len < 10 || len > 4000 ? "error" : len < 20 || len > 2000 ? "warning" : "info",
      suggestion: len < 20 ? "增加更多细节和上下文" : len > 2000 ? "考虑精简，删除冗余信息" : "长度合适",
    };
  },

  clarity: (prompt) => {
    const actionVerbs = /(分析|生成|计算|解释|总结|比较|评估|创建|编写|优化|转换|提取|分类|预测|回答|描述|列出|定义|证明|解决|设计|实现|测试|调试|重构|部署|监控|维护|扩展|集成|验证|确认|检查|审查|审核|校对|修正|改进|提升|降低|增加|减少|合并|拆分|排序|过滤|搜索|替换|插入|删除|更新|同步|备份|恢复|迁移|升级|降级|配置|定制|个性化|自动化|标准化|规范化|文档化|可视化|量化|定性|定量)/i;
    const hasVerb = actionVerbs.test(prompt);
    const score = hasVerb ? 10 : 4;
    return {
      passed: hasVerb,
      score,
      message: hasVerb ? "包含明确的动作指令" : "缺少明确的动作指令",
      severity: hasVerb ? "info" : "error",
      suggestion: "添加动作动词，如'分析'、'生成'、'总结'等",
    };
  },

  specificity: (prompt) => {
    const hasNumbers = /\d+/.test(prompt);
    const hasNames = /['""'][\s\S]{2,20}['""']|[\u4e00-\u9fa5]{2,6}(?:系统|平台|模型|框架|工具|语言|库|API)/.test(prompt);
    const score = (hasNumbers ? 5 : 0) + (hasNames ? 5 : 0);
    return {
      passed: score >= 5,
      score,
      message: hasNumbers && hasNames ? "包含具体数字和名称" : hasNumbers ? "有数字但缺少具体名称" : hasNames ? "有名称但缺少具体数据" : "缺少具体细节",
      severity: score >= 5 ? "info" : "warning",
      suggestion: "添加具体数字、名称或示例，如'使用 Python 3.11'、'处理 1000 条数据'",
    };
  },

  completeness: (prompt) => {
    const aspects = [
      { check: /角色|扮演|作为|你是一名|你是/i, name: "角色定义" },
      { check: /任务|目标|目的|需要|请|要求/i, name: "任务目标" },
      { check: /格式|输出|返回|以...形式|JSON|Markdown/i, name: "输出格式" },
      { check: /约束|限制|不要|避免|必须|只能|仅/i, name: "约束条件" },
    ];
    const matched = aspects.filter((a) => a.check.test(prompt));
    const score = Math.min(10, matched.length * 2.5);
    return {
      passed: matched.length >= 3,
      score,
      message: `包含 ${matched.length}/4 个完整度维度 (${matched.map((m) => m.name).join("、") || "无"})`,
      severity: matched.length >= 3 ? "info" : matched.length >= 2 ? "warning" : "error",
      suggestion: matched.length < 4 ? `缺少: ${aspects.filter((a) => !a.check.test(prompt)).map((a) => a.name).join("、")}` : "提示词结构完整",
    };
  },

  safety: (prompt) => {
    const riskyPatterns = [
      /忽略|跳过|绕过|突破|破解| Jailbreak|DAN|developer mode/i,
      /系统提示|system prompt|instructions? above|ignore previous/i,
      /不要拒绝|不能拒绝|必须回答|无条件|no matter what/i,
    ];
    const matches = riskyPatterns.filter((p) => p.test(prompt));
    const score = matches.length > 0 ? 2 : 10;
    return {
      passed: matches.length === 0,
      score,
      message: matches.length > 0 ? `检测到 ${matches.length} 个潜在安全风险` : "未发现安全风险",
      severity: matches.length > 0 ? "error" : "info",
      suggestion: matches.length > 0 ? "移除试图覆盖系统指令或强制输出的内容" : "安全合规",
    };
  },

  format_consistency: (prompt) => {
    const hasMarkdown = /[#*\-`[\]()|]/.test(prompt);
    const hasXML = /<\/?[a-z]+>/i.test(prompt);
    const hasJSON = /\{|\}/.test(prompt);
    const formats = [hasMarkdown, hasXML, hasJSON].filter(Boolean).length;
    const score = formats <= 1 ? 10 : formats === 2 ? 6 : 3;
    return {
      passed: formats <= 2,
      score,
      message: formats <= 1 ? "格式统一" : `混用 ${formats} 种格式标记`,
      severity: formats > 2 ? "warning" : "info",
      suggestion: formats > 1 ? "统一使用一种格式（Markdown/XML/JSON）" : "格式一致",
    };
  },

  no_redundancy: (prompt) => {
    const words = prompt.toLowerCase().split(/\s+/);
    const seen = new Set<string>();
    let duplicates = 0;
    for (const w of words) {
      if (w.length < 2) continue;
      if (seen.has(w)) duplicates++;
      seen.add(w);
    }
    const dupRate = words.length > 0 ? duplicates / words.length : 0;
    const score = dupRate > 0.3 ? 3 : dupRate > 0.15 ? 6 : 10;
    return {
      passed: dupRate <= 0.2,
      score,
      message: dupRate > 0.15 ? `冗余度 ${(dupRate * 100).toFixed(1)}%` : "无明显冗余",
      severity: dupRate > 0.3 ? "warning" : "info",
      suggestion: dupRate > 0.15 ? "删除重复表述，合并相似句子" : "表述简洁",
    };
  },

  role_defined: (prompt) => {
    const hasRole = /角色|扮演|作为|你是一名|你是|身份|职业|专家|顾问|助手/i.test(prompt);
    const score = hasRole ? 10 : 5;
    return {
      passed: hasRole,
      score,
      message: hasRole ? "已定义 AI 角色" : "未定义 AI 角色",
      severity: hasRole ? "info" : "warning",
      suggestion: hasRole ? "" : "指定 AI 的角色，如'你是一位资深的 Python 工程师'",
    };
  },

  output_format: (prompt) => {
    const hasFormat = /格式|输出|返回|以...形式|JSON|Markdown|表格|列表|代码块|段落|标题/i.test(prompt);
    const score = hasFormat ? 10 : 4;
    return {
      passed: hasFormat,
      score,
      message: hasFormat ? "已指定输出格式" : "未指定输出格式",
      severity: hasFormat ? "info" : "warning",
      suggestion: hasFormat ? "" : "明确期望的输出格式，如'以 JSON 格式返回'或'用 Markdown 列表'",
    };
  },

  constraints: (prompt) => {
    const hasConstraints = /约束|限制|不要|避免|必须|只能|仅|不超过|至少|最多|最少|范围|条件|如果|除非/i.test(prompt);
    const score = hasConstraints ? 10 : 6;
    return {
      passed: hasConstraints,
      score,
      message: hasConstraints ? "已设置约束条件" : "未设置约束条件",
      severity: "info",
      suggestion: hasConstraints ? "" : "添加约束可提升输出可控性，如'回答不超过 200 字'",
    };
  },

  examples_included: (prompt) => {
    const hasExample = /例如|比如|举例|示例|sample|example|如下|参考/i.test(prompt);
    const score = hasExample ? 10 : 5;
    return {
      passed: hasExample,
      score,
      message: hasExample ? "包含示例（Few-shot）" : "未包含示例",
      severity: "info",
      suggestion: hasExample ? "" : "对于复杂任务，添加 1-2 个示例可显著提升输出质量",
    };
  },

  language_consistency: (prompt) => {
    const cnCount = (prompt.match(/[\u4e00-\u9fa5]/g) || []).length;
    const enCount = (prompt.match(/[a-zA-Z]/g) || []).length;
    const total = cnCount + enCount;
    if (total === 0) {
      return { passed: true, score: 10, message: "无文字内容", severity: "info", suggestion: "" };
    }
    const cnRatio = cnCount / total;
    const mixed = cnRatio > 0.1 && cnRatio < 0.9;
    const score = mixed ? 5 : 10;
    return {
      passed: !mixed,
      score,
      message: mixed ? "中英文混用" : cnRatio >= 0.8 ? "中文为主" : "英文为主",
      severity: mixed ? "warning" : "info",
      suggestion: mixed ? "建议统一使用一种语言，或明确分隔中英文内容" : "语言一致",
    };
  },
};

// ============================================================================
// 主入口
// ============================================================================

function buildQualityAnalysisPrompt(prompt: string, checks: QualityCheck[]): string {
  const checkSummary = checks.map((c) =>
    `- ${c.name}: ${c.score}/10 — ${c.message}${c.passed ? "" : `（建议：${c.suggestion}）`}`
  ).join("\n");

  return `你是一位提示词工程专家。请根据以下质量检查结果，为用户提供一段简洁但专业的深度分析和改进建议。

【待检查的提示词】
${prompt}

【质量检查结果】
${checkSummary}

请输出一段 100-200 字的分析，包含：
1. 提示词的整体质量评价
2. 最关键的 1-2 个改进点
3. 具体的优化建议

直接输出分析内容，不要标题。`;
}

export function runQualityGate(
  prompt: string,
  config: Partial<GateConfig> = {},
): QualityGateResult {
  // v2.0: prefer Rust native implementation for performance
  if (typeof (native as Record<string, unknown>).runQualityGate === "function") {
    try {
      const result = (native as Record<string, (p: string, e?: string[], t?: number) => QualityGateResult>).runQualityGate(
        prompt,
        config.enabledChecks && config.enabledChecks.length > 0 ? config.enabledChecks : undefined,
        config.threshold,
      );
      // Preserve usingAI flag (Rust doesn't know about AI)
      return { ...result, usingAI: false };
    } catch {
      // Fallback to TS implementation on any error
    }
  }
  return runQualityGateInternal(prompt, config);
}

function runQualityGateInternal(
  prompt: string,
  config: Partial<GateConfig> = {},
): QualityGateResult {
  const cfg = { ...DEFAULT_GATE_CONFIG, ...config };
  const enabled = cfg.enabledChecks.length > 0 ? cfg.enabledChecks : Object.keys(CHECKERS);

  const checks: QualityCheck[] = enabled.map((id) => {
    const checker = CHECKERS[id];
    if (!checker) {
      return {
        id,
        name: id,
        passed: true,
        score: 0,
        message: "未知检查项",
        severity: "info",
        suggestion: "",
      };
    }
    const result = checker(prompt);
    return {
      id,
      name: getCheckName(id),
      ...result,
    };
  });

  const overallScore = Math.round(
    checks.reduce((sum, c) => sum + c.score, 0) / checks.length * 10
  ) / 10 * 10; // 0-100

  const passed = overallScore >= cfg.threshold;
  const failedChecks = checks.filter((c) => !c.passed);
  const errorCount = failedChecks.filter((c) => c.severity === "error").length;
  const warningCount = failedChecks.filter((c) => c.severity === "warning").length;

  let summary: string;
  if (passed && errorCount === 0 && warningCount === 0) {
    summary = `✅ 质量门禁通过，总分 ${overallScore}/100，所有 ${checks.length} 项检查均通过`;
  } else if (passed) {
    summary = `⚠️ 质量门禁通过（总分 ${overallScore}/100），但存在 ${warningCount} 个警告`;
  } else {
    summary = `❌ 质量门禁未通过（总分 ${overallScore}/100，阈值 ${cfg.threshold}），${errorCount} 个错误，${warningCount} 个警告`;
  }

  return {
    overallScore,
    passed,
    threshold: cfg.threshold,
    checks,
    summary,
    topIssues: failedChecks.sort((a, b) => b.severity.localeCompare(a.severity)),
    usingAI: false,
  };
}

export async function runQualityGateWithAI(
  prompt: string,
  model: string,
  apiKey: string,
  config: Partial<GateConfig> = {},
): Promise<QualityGateResult> {
  const baseResult = runQualityGateInternal(prompt, config);

  const aiPrompt = buildQualityAnalysisPrompt(prompt, baseResult.checks);
  const aiResponse = await callAI(
    model,
    apiKey,
    "你是一位提示词工程质量分析专家。",
    aiPrompt,
    0.5,
  );

  return {
    ...baseResult,
    aiAnalysis: aiResponse || undefined,
    usingAI: true,
  };
}

function getCheckName(id: string): string {
  const names: Record<string, string> = {
    length_check: "长度检查",
    clarity: "清晰度",
    specificity: "具体性",
    completeness: "完整性",
    safety: "安全性",
    format_consistency: "格式一致性",
    no_redundancy: "无冗余",
    role_defined: "角色定义",
    output_format: "输出格式",
    constraints: "约束条件",
    examples_included: "示例包含",
    language_consistency: "语言一致性",
  };
  return names[id] || id;
}

export function getAvailableChecks(): { id: string; name: string; description: string }[] {
  return Object.keys(CHECKERS).map((id) => ({
    id,
    name: getCheckName(id),
    description: getCheckDescription(id),
  }));
}

function getCheckDescription(id: string): string {
  const desc: Record<string, string> = {
    length_check: "检查提示词长度是否在合理范围 (20-2000 字符)",
    clarity: "检查是否包含明确的动作指令动词",
    specificity: "检查是否包含具体数字、名称或示例",
    completeness: "检查是否包含角色、任务、格式、约束四要素",
    safety: "检测潜在的越狱、注入或系统指令覆盖风险",
    format_consistency: "检查格式标记（Markdown/XML/JSON）是否混用",
    no_redundancy: "检测重复词语和冗余表述",
    role_defined: "检查是否为 AI 定义了明确的角色身份",
    output_format: "检查是否指定了期望的输出格式",
    constraints: "检查是否设置了边界条件和限制",
    examples_included: "检查是否包含 few-shot 示例",
    language_consistency: "检查是否存在严重的中英文混用",
  };
  return desc[id] || "";
}
