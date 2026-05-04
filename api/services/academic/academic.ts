/**
 * P3-3: 学术合作工具
 *
 * 支持功能：
 *  - 引用生成：从提示词/论文内容提取引用
 *  - 实验复现报告：记录提示词版本和结果，生成可复现文档
 *
 * 引用生成分为两条路径：
 *  - generateCitationsWithAI(model, apiKey): 真正调用 LLM 生成学术引用（推荐）
 *  - generateCitations(text, format): 基于关键词提取 + 模板填充的规则引擎 fallback
 *    返回的是格式正确但内容虚构的引用，仅用于无 API Key 时的格式演示。
 */

import { callAI } from "../../lib/ai-service-v3/client";
import { PKG_VERSION } from "../../../contracts/constants";

export type CitationFormat = "apa" | "mla" | "gb7714" | "ieee" | "chicago";

export interface CitationResult {
  format: CitationFormat;
  citations: string[];
  extractedKeywords: string[];
  usingAI: boolean;
}

export interface ReproducibilityReport {
  title: string;
  date: string;
  environment: Record<string, string>;
  steps: ReproStep[];
  conclusion: string;
}

export interface ReproStep {
  step: number;
  description: string;
  prompt: string;
  output: string;
  parameters: Record<string, string | number>;
}

export function extractKeywords(text: string): string[] {
  const stopwords = new Set(["的", "了", "是", "在", "我", "有", "和", "就", "不", "人", "都", "一", "一个", "上", "也", "很", "到", "说", "要", "去", "你", "会", "着", "没有", "看", "好", "自己", "这", "the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "shall", "can", "need", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "and", "but", "or", "yet", "so", "if", "because", "although", "while", "where", "when", "that", "which", "who", "whom", "what", "this", "these", "those", "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them"]);

  const tokens: string[] = [];
  const cleaned = text.toLowerCase().replace(/[^\u4e00-\u9fa5a-z0-9\s]/g, " ");
  const chunks = cleaned.split(/\s+/).filter(Boolean);

  for (const chunk of chunks) {
    const cnChars = chunk.match(/[\u4e00-\u9fa5]/g) || [];
    if (cnChars.length > 0 && cnChars.length / chunk.length > 0.5 && !chunk.includes(" ")) {
      for (let i = 0; i < chunk.length - 1; i++) {
        const slice2 = chunk.slice(i, i + 2);
        if (slice2.length === 2 && /[\u4e00-\u9fa5]/.test(slice2[0])) {
          tokens.push(slice2);
        }
      }
    } else {
      tokens.push(chunk);
    }
  }

  const filtered = tokens.filter((t) => t.length >= 2 && !stopwords.has(t));
  const freq = new Map<string, number>();
  for (const t of filtered) {
    freq.set(t, (freq.get(t) || 0) + 1);
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k]) => k);
}

function buildCitationPrompt(text: string, format: CitationFormat): string {
  const formatDesc: Record<CitationFormat, string> = {
    apa: "APA 格式（作者. (年份). 标题. 来源.）",
    mla: "MLA 格式（作者. \"标题.\" 来源, 年份.）",
    gb7714: "GB/T 7714 格式（[序号] 作者. 标题[文献类型]. 来源, 年份.）",
    ieee: "IEEE 格式（[序号] 作者, \"标题,\" 来源, 年份.）",
    chicago: "Chicago 格式（作者. 年份. \"标题.\" 来源.）",
  };

  return `你是一位学术引用专家。请根据以下内容，生成 3-5 条相关的高质量学术引用。

【用户内容】
${text}

【引用格式要求】
${formatDesc[format]}

请严格按以下格式输出（不要有任何其他内容）：
引用1
引用2
引用3

要求：
1. 引用必须与内容主题高度相关
2. 作者、标题、来源、年份必须合理且真实可信
3. 严格遵循指定的引用格式
4. 不要编造不存在的期刊或会议名称`;
}

export async function generateCitationsWithAI(
  text: string,
  format: CitationFormat,
  model: string,
  apiKey: string,
): Promise<CitationResult> {
  const keywords = extractKeywords(text);
  const prompt = buildCitationPrompt(text, format);

  const response = await callAI(
    model,
    apiKey,
    "你是一位学术引用格式化专家，精通 APA、MLA、GB/T 7714、IEEE、Chicago 等引用格式。",
    prompt,
    0.5,
  );

  if (response) {
    const citations = response
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 10 && !l.startsWith("引用") && !l.match(/^\d+[.、]/));

    if (citations.length > 0) {
      return { format, citations, extractedKeywords: keywords, usingAI: true };
    }
  }

  throw new Error("AI 引用生成失败：模型未返回有效结果或解析失败。请检查 API Key 和网络连接。");
}

// ============================================================================
// 实验复现报告
// ============================================================================

export function generateReproducibilityReport(
  title: string,
  steps: ReproStep[],
): ReproducibilityReport {
  return {
    title,
    date: new Date().toISOString().split("T")[0],
    environment: {
      platform: `TipAi v${PKG_VERSION}`,
      framework: "React + tRPC + SQLite",
      node_version: "20.x",
      test_framework: "Vitest v4.1.5",
    },
    steps: steps.map((s, i) => ({
      ...s,
      step: i + 1,
    })),
    conclusion: `本实验共执行 ${steps.length} 个步骤，所有步骤均已记录。建议保存此报告以便后续复现。`,
  };
}

export function reportToMarkdown(report: ReproducibilityReport): string {
  const lines: string[] = [
    `# ${report.title}`,
    "",
    `**日期**: ${report.date}`,
    "",
    "## 实验环境",
    "",
    ...Object.entries(report.environment).map(([k, v]) => `- **${k}**: ${v}`),
    "",
    "## 实验步骤",
    "",
  ];

  for (const step of report.steps) {
    lines.push(
      `### 步骤 ${step.step}: ${step.description}`,
      "",
      "**提示词**:",
      "```",
      step.prompt,
      "```",
      "",
      "**参数**:",
      ...Object.entries(step.parameters).map(([k, v]) => `- ${k}: ${v}`),
      "",
      "**输出**:",
      "```",
      step.output,
      "```",
      "",
    );
  }

  lines.push(
    "## 结论",
    "",
    report.conclusion,
    "",
  );

  return lines.join("\n");
}

export function getCitationFormats(): { value: CitationFormat; label: string; description: string }[] {
  return [
    { value: "apa", label: "APA", description: "美国心理学会格式（社会科学常用）" },
    { value: "mla", label: "MLA", description: "现代语言协会格式（人文学科常用）" },
    { value: "gb7714", label: "GB/T 7714", description: "中国国家标准（中文学术常用）" },
    { value: "ieee", label: "IEEE", description: "电气电子工程师学会格式（工程学科常用）" },
    { value: "chicago", label: "Chicago", description: "芝加哥格式（历史学科常用）" },
  ];
}
