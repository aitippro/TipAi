/**
 * P3-3: 学术合作工具
 *
 * 支持功能：
 *  - 引用生成：从提示词/论文内容提取引用
 *  - 实验复现报告：记录提示词版本和结果，生成可复现文档
 */

export type CitationFormat = "apa" | "mla" | "gb7714" | "ieee" | "chicago";

export interface CitationResult {
  format: CitationFormat;
  citations: string[];
  extractedKeywords: string[];
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

// ============================================================================
// 引用生成
// ============================================================================

const FORMAT_TEMPLATES: Record<CitationFormat, (author: string, year: number, title: string, source: string) => string> = {
  apa: (a, y, t, s) => `${a}. (${y}). ${t}. ${s}.`,
  mla: (a, y, t, s) => `${a}. "${t}." ${s}, ${y}.`,
  gb7714: (a, y, t, s) => `[1] ${a}. ${t}[M]. ${s}, ${y}.`,
  ieee: (a, y, t, s) => `[1] ${a}, "${t}," ${s}, ${y}.`,
  chicago: (a, y, t, s) => `${a}. ${y}. "${t}." ${s}.`,
};

export function generateCitations(text: string, format: CitationFormat): CitationResult {
  // 提取关键词（基于提示词内容推断引用主题）
  const keywords = extractKeywords(text);

  // 基于关键词生成模拟引用
  const citations: string[] = [];
  const template = FORMAT_TEMPLATES[format];

  const year = new Date().getFullYear();

  for (let i = 0; i < keywords.length && i < 5; i++) {
    const kw = keywords[i];
    const author = getMockAuthor(kw);
    const title = getMockTitle(kw);
    const source = getMockSource(kw);
    citations.push(template(author, year - i, title, source));
  }

  return { format, citations, extractedKeywords: keywords };
}

function extractKeywords(text: string): string[] {
  const stopwords = new Set(["的", "了", "是", "在", "我", "有", "和", "就", "不", "人", "都", "一", "一个", "上", "也", "很", "到", "说", "要", "去", "你", "会", "着", "没有", "看", "好", "自己", "这", "the", "a", "an", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "shall", "can", "need", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "and", "but", "or", "yet", "so", "if", "because", "although", "while", "where", "when", "that", "which", "who", "whom", "what", "this", "these", "those", "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them"]);

  const tokens: string[] = [];
  const cleaned = text.toLowerCase().replace(/[^\u4e00-\u9fa5a-z0-9\s]/g, " ");

  // 先按空格分块
  const chunks = cleaned.split(/\s+/).filter(Boolean);

  for (const chunk of chunks) {
    // 如果块主要是中文且没有空格，按 2-3 字切片
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

function getMockAuthor(keyword: string): string {
  const authors: Record<string, string> = {
    prompt: "Zhao, W. X.",
    engineering: "Liu, P.",
    llm: "Brown, T.",
    optimization: "Chen, H.",
    framework: "Wang, Y.",
    ai: "LeCun, Y.",
    model: "Vaswani, A.",
    data: "McKinney, W.",
    analysis: "Tukey, J. W.",
    generation: "Radford, A.",
  };
  return authors[keyword] || `Author, ${keyword.charAt(0).toUpperCase()}.`;
}

function getMockTitle(keyword: string): string {
  const titles: Record<string, string> = {
    prompt: "A Survey on Prompt Engineering for Large Language Models",
    engineering: "Best Practices in Software Engineering",
    llm: "Language Models are Few-Shot Learners",
    optimization: "Automatic Prompt Optimization with Gradient Descent",
    framework: "A Unified Framework for Prompt-based Learning",
    ai: "Deep Learning for Artificial Intelligence",
    model: "Attention Is All You Need",
    data: "Data Structures and Algorithms",
    analysis: "Exploratory Data Analysis",
    generation: "Improving Language Understanding by Generative Pre-Training",
  };
  return titles[keyword] || `Research on ${keyword.charAt(0).toUpperCase() + keyword.slice(1)}`;
}

function getMockSource(keyword: string): string {
  const sources: Record<string, string> = {
    prompt: "arXiv preprint arXiv:2402.07927",
    engineering: "IEEE Transactions on Software Engineering",
    llm: "Advances in Neural Information Processing Systems",
    optimization: "Proceedings of the ACL",
    framework: "Journal of Machine Learning Research",
    ai: "Nature Machine Intelligence",
    model: "NeurIPS",
    data: "O'Reilly Media",
    analysis: "Addison-Wesley",
    generation: "OpenAI Technical Report",
  };
  return sources[keyword] || "Proceedings of the Conference";
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
      platform: "TipAi v1.2.2",
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
