import { env } from "./env";

// ============================================
// TipAi v2 - Enhanced AI Service
// ============================================

export interface DecomposedStep {
  title: string;
  description: string;
  prompt: string;
  order: number;
}

export interface IntentAnalysis {
  goal: string;
  domain: string;
  constraints: string[];
  audience: string;
  tone: string;
  complexity: "simple" | "medium" | "complex";
  estimatedSteps: number;
}

export interface OptimizationResult {
  optimizedPrompt: string;
  improvements: string[];
  technique: string;
}

export interface EvaluationResult {
  clarity: number;
  relevance: number;
  completeness: number;
  actionability: number;
  overall: number;
  suggestions: string[];
}

// ---- Domain Package System ----

const DOMAIN_PACKAGES: Record<string, {
  name: string;
  systemPrompt: string;
  decompositionStrategy: string;
  evaluationCriteria: string[];
}> = {
  "content-marketing": {
    name: "内容营销",
    systemPrompt: `你是一位资深内容营销专家和提示词工程师。擅长将营销目标拆解为可执行的AI提示词工作流。
专长：市场调研、竞品分析、用户画像、内容策略、文案创作、渠道分发、效果追踪、AIDA/PAS框架。
规则：
1. 提示词必须完整可用，可直接粘贴到AI对话中
2. 使用中文，包含角色设定、任务描述、输出格式
3. 步骤间逻辑连贯，上一步输出可作为下一步输入
4. 融入营销最佳实践（AIDA、4P、增长黑客等框架）`,
    decompositionStrategy: "漏斗模型：市场洞察→策略制定→内容创作→渠道执行→效果优化",
    evaluationCriteria: ["吸引力", "转化导向", "品牌一致性", "渠道适配性"],
  },
  programming: {
    name: "编程开发",
    systemPrompt: `你是一位资深软件架构师和提示词工程师。擅长将开发需求拆解为可执行的AI提示词工作流。
专长：需求分析、架构设计、代码实现、测试策略、文档编写、性能优化、代码审查。
规则：
1. 提示词包含明确的编程语言、框架版本、代码规范
2. 包含代码审查标准和最佳实践要求
3. 融入敏捷/Scrum方法论
4. 包含安全性和可维护性考量`,
    decompositionStrategy: "瀑布-敏捷混合：需求→架构→设计→编码→测试→部署→监控",
    evaluationCriteria: ["技术可行性", "代码质量", "安全性", "可维护性"],
  },
  education: {
    name: "教育教学",
    systemPrompt: `你是一位资深教育专家和教学设计顾问。擅长将教学目标拆解为可执行的AI提示词工作流。
专长：课程设计、教学目标设定、内容组织、评估设计、互动活动、学习资源开发。
规则：
1. 基于Bloom分类法、ADDIE模型、建构主义理论
2. 包含明确的教学目标、学习者特征、评估标准
3. 考虑多元智能和差异化教学
4. 融入形成性评估和总结性评估`,
    decompositionStrategy: "ADDIE模型：分析→设计→开发→实施→评估",
    evaluationCriteria: ["教学目标明确性", "学习者参与度", "评估有效性", "内容准确性"],
  },
  "data-analysis": {
    name: "数据分析",
    systemPrompt: `你是一位资深数据科学家和分析顾问。擅长将分析需求拆解为可执行的AI提示词工作流。
专长：数据探索、清洗策略、统计建模、可视化设计、洞察提炼、报告撰写。
规则：
1. 包含明确的数据源说明、分析方法和输出格式
2. 包含数据质量检查和异常处理
3. 从描述性到诊断性到预测性分析递进
4. 融入统计学最佳实践和商业分析框架`,
    decompositionStrategy: "分析 pipeline：问题定义→数据理解→清洗→探索分析→建模→解释→报告",
    evaluationCriteria: ["分析深度", "数据质量", "洞察价值", "可视化清晰度"],
  },
  legal: {
    name: "法律分析",
    systemPrompt: `你是一位资深法律顾问和合规专家。擅长将法律需求拆解为可执行的AI提示词工作流。
专长：合同审查、法规检索、案例研究、风险评估、文书起草、合规检查。
规则：
1. 基于现行法律法规和判例
2. 包含明确的法律框架、适用条款
3. 包含风险识别和防范建议
4. 强调法律意见的限制性和免责声明`,
    decompositionStrategy: "法律分析流程：事实梳理→法律检索→要件分析→风险评估→方案设计→文书起草",
    evaluationCriteria: ["法律依据充分性", "风险覆盖度", "文书规范性", "实操可行性"],
  },
  general: {
    name: "通用任务",
    systemPrompt: `你是一位任务拆解和流程优化专家。擅长将任意目标拆解为清晰、可执行的AI提示词工作流。
规则：
1. 自动识别最适合的方法论框架（CRISPE、CO-STAR、Chain-of-Thought等）
2. 步骤之间有逻辑递进关系
3. 提示词具体明确，包含角色设定、任务描述、输出格式`,
    decompositionStrategy: "通用模型：目标澄清→信息收集→方案设计→执行计划→质量检查",
    evaluationCriteria: ["目标清晰度", "步骤可执行性", "输出质量", "整体连贯性"],
  },
};

export function detectDomain(intent: string): string {
  const lower = intent.toLowerCase();
  const scores: Record<string, number> = {};

  scores["content-marketing"] = ["营销", "推广", "文案", "品牌", "广告", "社交媒体", "seo", "内容",
    "marketing", "promotion", "copywriting", "brand", "advertising", "social media",
    "campaign", "漏斗", "转化率", "获客", "用户增长", "曝光",
    "kpi", "roi", "ctr", "cpm", "cps", "私域", "公域", "种草", "带货"].filter(k => lower.includes(k)).length;

  scores["programming"] = ["代码", "编程", "开发", "app", "网站", "api", "数据库", "算法",
    "code", "programming", "development", "software", "application", "web",
    "frontend", "backend", "debug", "refactor", "架构", "微服务", "前端", "后端"].filter(k => lower.includes(k)).length;

  scores["education"] = ["教学", "课程", "培训", "教育", "学习", "教案", "课件", "考试",
    "teaching", "course", "training", "education", "learning", "curriculum",
    "lesson", "student", "classroom", "培训方案", "训练营", "教案设计"].filter(k => lower.includes(k)).length;

  scores["data-analysis"] = ["数据", "分析", "报表", "统计", "可视化", "图表", "趋势", "指标",
    "data", "analysis", "report", "statistics", "visualization", "chart",
    "dashboard", "kpi", "metric", "洞察", "业务分析", "漏斗分析", "留存分析"].filter(k => lower.includes(k)).length;

  scores["legal"] = ["合同", "法律", "法规", "合规", "条款", "协议", "法务", "诉讼",
    "legal", "contract", "law", "regulation", "compliance", "clause",
    "agreement", "litigation", "知识产权", "隐私", "gdpr", "劳动法"].filter(k => lower.includes(k)).length;

  let bestDomain = "general";
  let bestScore = 0;
  for (const [domain, score] of Object.entries(scores)) {
    if (score > bestScore) { bestScore = score; bestDomain = domain; }
  }
  return bestScore >= 2 ? bestDomain : "general";
}

export function getDomainPackage(domain: string) {
  return DOMAIN_PACKAGES[domain] || DOMAIN_PACKAGES["general"];
}

export function getAllDomainPackages() {
  return Object.entries(DOMAIN_PACKAGES).map(([key, pkg]) => ({
    key, name: pkg.name, description: pkg.decompositionStrategy,
    criteria: pkg.evaluationCriteria,
  }));
}

// ---- Kimi API Client ----

async function callKimiAPI(systemPrompt: string, userMessage: string, temperature = 0.7): Promise<string | null> {
  const apiKey = process.env.KIMI_API_KEY || "";
  if (!apiKey) { console.warn("KIMI_API_KEY not set"); return null; }
  try {
    const response = await fetch(`${env.kimiOpenUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "moonshot-v1-8k",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }],
        temperature,
      }),
    });
    if (!response.ok) { console.error(`API error: ${response.status}`); return null; }
    const data = await response.json() as Record<string, unknown>;
    const choices = data.choices as Array<Record<string, unknown>> | undefined;
    return (choices?.[0]?.message as Record<string, unknown>)?.content as string || null;
  } catch (e) { console.error("API call failed:", e); return null; }
}

// ---- Intent Analysis (v2 with complexity detection) ----

export async function analyzeIntent(intent: string): Promise<IntentAnalysis> {
  const systemPrompt = `你是意图分析专家。分析用户目标描述，提取信息并以JSON返回：
{
  "goal": "核心目标（一句话）",
  "domain": "最适合的领域",
  "constraints": ["约束1", "约束2"],
  "audience": "目标受众",
  "tone": "语气风格",
  "complexity": "simple|medium|complex",
  "estimatedSteps": 数字(3-8)
}
complexity判断：simple=单一明确任务(3-4步), medium=多维度任务(5-6步), complex=系统性工程(7-8步)
只返回JSON。`;

  const result = await callKimiAPI(systemPrompt, intent, 0.3);
  if (result) {
    try {
      const cleaned = result.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return {
        goal: parsed.goal || intent,
        domain: parsed.domain || detectDomain(intent),
        constraints: Array.isArray(parsed.constraints) ? parsed.constraints : [],
        audience: parsed.audience || "",
        tone: parsed.tone || "专业",
        complexity: ["simple", "medium", "complex"].includes(parsed.complexity) ? parsed.complexity : "medium",
        estimatedSteps: Math.min(Math.max(parseInt(parsed.estimatedSteps) || 5, 3), 8),
      };
    } catch (e) { console.error("Parse failed:", e); }
  }
  return {
    goal: intent.length > 50 ? intent.substring(0, 50) + "..." : intent,
    domain: detectDomain(intent),
    constraints: [],
    audience: "", tone: "专业",
    complexity: intent.length > 200 ? "complex" : intent.length > 100 ? "medium" : "simple",
    estimatedSteps: intent.length > 200 ? 7 : intent.length > 100 ? 5 : 4,
  };
}

// ---- Task Decomposition (v2 with strategy selection) ----

export async function decomposeTask(intent: string, domain: string, analysis: IntentAnalysis): Promise<DecomposedStep[]> {
  const domainPkg = getDomainPackage(domain);

  const systemPrompt = `${domainPkg.systemPrompt}

请根据用户目标，拆解为${analysis.estimatedSteps}个有序步骤。
复杂度：${analysis.complexity === "simple" ? "简单（3-4步线性流程）" : analysis.complexity === "medium" ? "中等（5-6步含分支）" : "复杂（7-8步含迭代和验证）"}

输出格式（严格JSON数组）：
[{"title":"步骤标题","description":"步骤说明","prompt":"完整提示词"}]

策略：${domainPkg.decompositionStrategy}
只返回JSON。`;

  const userMessage = `拆解步骤：
用户描述：${intent}
核心目标：${analysis.goal}
受众：${analysis.audience || "未指定"}
语气：${analysis.tone}
约束：${analysis.constraints.join("、") || "无"}
复杂度：${analysis.complexity}

要求：
1. 步骤间逻辑递进
2. 提示词完整可用
3. 前面步骤结果可在后续引用
4. 融入${domainPkg.name}最佳实践`;

  const result = await callKimiAPI(systemPrompt, userMessage, 0.5);
  if (result) {
    try {
      const cleaned = result.replace(/```json\n?|\n?```/g, "").trim();
      const steps: Array<{ title: string; description: string; prompt: string }> = JSON.parse(cleaned);
      return steps.map((s, i) => ({ title: s.title, description: s.description, prompt: s.prompt, order: i }));
    } catch (e) { console.error("Parse failed:", e); }
  }
  return generateDomainFallbackSteps(intent, domain, analysis);
}

// ---- Single Prompt Optimization ----

export async function optimizePrompt(prompt: string, domain: string): Promise<OptimizationResult> {
  const systemPrompt = `你是一位顶级提示词工程师（Prompt Engineer）。你的任务是优化用户提供的提示词，使其更加清晰、具体、有效。

优化原则（基于CRISPE和CO-STAR框架）：
1. 角色设定(C/R)：为AI分配明确的专家角色
2. 上下文(C)：提供充足的背景信息
3. 任务(T)：用明确的动词描述任务
4. 格式要求：指定输出格式和结构
5. 约束条件：添加质量标准
6. 示例：如需要，添加few-shot示例

返回JSON格式：
{
  "optimizedPrompt": "优化后的完整提示词",
  "improvements": ["改进点1", "改进点2", "改进点3"],
  "technique": "使用的主要技术（如：CRISPE/CO-STAR/Chain-of-Thought）"
}`;

  const result = await callKimiAPI(systemPrompt, `请优化以下提示词：\n\n${prompt}\n\n领域：${getDomainPackage(domain).name}`, 0.4);

  if (result) {
    try {
      const cleaned = result.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return {
        optimizedPrompt: parsed.optimizedPrompt || result,
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : ["优化了提示词结构"],
        technique: parsed.technique || "综合优化",
      };
    } catch {
      // Fall back to the heuristic output below when JSON parsing fails.
    }
  }

  // Fallback
  return {
    optimizedPrompt: `# 角色\n你是一位${getDomainPackage(domain).name}专家。\n\n# 任务\n${prompt}\n\n# 要求\n1. 提供详细、专业的回答\n2. 使用清晰的结构（标题、列表、表格）\n3. 包含具体的案例和数据支撑\n4. 确保内容可直接使用或稍作修改即可使用\n\n# 输出格式\n请按照以下格式输出：\n1. 核心要点\n2. 详细说明\n3. 行动建议`,
    improvements: ["添加了角色设定", "明确了输出格式", "增加了质量要求", "优化了结构"],
    technique: "CRISPE框架",
  };
}

// ---- Prompt Evaluation (multi-dimension) ----

export async function evaluatePrompt(prompt: string, output: string, domain: string): Promise<EvaluationResult> {
  const systemPrompt = `你是一位提示词质量评估专家。请从以下维度评估提示词及其输出质量：
1. 清晰度(1-10)：提示词是否清晰明确
2. 相关性(1-10)：输出是否与目标高度相关
3. 完整性(1-10)：是否覆盖了所有必要方面
4. 可执行性(1-10)：输出是否可直接使用
5. 整体评分(1-10)

返回JSON：{"clarity":N,"relevance":N,"completeness":N,"actionability":N,"overall":N,"suggestions":["建议1","建议2"]}`;

  const result = await callKimiAPI(systemPrompt, `提示词：\n${prompt.substring(0, 1000)}\n\n输出：\n${output.substring(0, 2000)}\n\n领域：${domain}`, 0.3);

  if (result) {
    try {
      const cleaned = result.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return {
        clarity: Math.min(Math.max(parseInt(parsed.clarity) || 7, 1), 10),
        relevance: Math.min(Math.max(parseInt(parsed.relevance) || 7, 1), 10),
        completeness: Math.min(Math.max(parseInt(parsed.completeness) || 7, 1), 10),
        actionability: Math.min(Math.max(parseInt(parsed.actionability) || 7, 1), 10),
        overall: Math.min(Math.max(parseInt(parsed.overall) || 7, 1), 10),
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      };
    } catch {
      // Fall back to the default evaluation when JSON parsing fails.
    }
  }

  return {
    clarity: 7, relevance: 7, completeness: 7, actionability: 7, overall: 7,
    suggestions: ["建议添加更多具体示例", "可以考虑增加输出格式要求"],
  };
}

// ---- Step Execution ----

export async function executeStep(prompt: string, previousOutputs: string[] = []): Promise<string> {
  const context = previousOutputs.length > 0
    ? `之前步骤的输出（参考用）：\n${previousOutputs.map((o, i) => `---步骤${i + 1}---\n${o.substring(0, 1500)}`).join("\n\n")}\n\n---\n\n`
    : "";

  const systemPrompt = `你是一位专业助手。请根据用户要求提供高质量、详细的回答。回答应当：
1. 结构清晰（使用Markdown格式：标题、列表、表格）
2. 内容具体，避免泛泛而谈
3. 专业准确，基于最佳实践
4. 输出格式符合用户要求`;

  const result = await callKimiAPI(systemPrompt, context + prompt, 0.7);
  if (result) return result;

  return `[执行结果预览]\n\n提示词内容：\n---\n${prompt.substring(0, 600)}...\n---\n\n此步骤将调用AI模型执行上述提示词。前置上下文：${previousOutputs.length > 0 ? "已提供" : "无"}`;
}

// ---- Domain-specific Fallback Steps ----

function generateDomainFallbackSteps(intent: string, domain: string, analysis: IntentAnalysis): DecomposedStep[] {
  const pkg = getDomainPackage(domain);
  const c = analysis.complexity;
  const g = analysis.goal;
  const a = analysis.audience || "一般受众";
  const t = analysis.tone;

  const baseSteps: DecomposedStep[] = [
    { title: "目标澄清", description: "明确核心目标和范围",
      prompt: `你是${pkg.name}专家。请澄清以下目标的具体要求：\n\n"${intent}"\n\n输出：\n1. 核心目标（一句话）\n2. 关键交付物\n3. 成功标准\n4. 潜在挑战`, order: 0 },
    { title: "背景研究", description: `收集${pkg.name}领域相关信息`,
      prompt: `针对"${g}"，请提供全面的${pkg.name}背景信息：\n\n受众：${a}\n\n输出：\n1. 相关概念和术语\n2. 行业最佳实践\n3. 类似案例参考\n4. 关键数据或趋势`, order: 1 },
  ];

  const midSteps: DecomposedStep[] = c === "simple" ? [] : [
    { title: "策略制定", description: "制定执行策略",
      prompt: `基于以上分析，为"${g}"制定详细策略：\n\n输出：\n1. 总体策略\n2. 具体方法\n3. 资源需求\n4. 时间安排\n5. 风险与应对`, order: 2 },
    { title: "方案设计", description: "设计具体方案",
      prompt: `为"${g}"设计具体方案：\n\n语气：${t}\n\n输出：\n1. 详细方案内容\n2. 实施步骤\n3. 质量标准\n4. 交付物清单`, order: 3 },
  ];

  const endSteps: DecomposedStep[] = [
    { title: "内容创作", description: "生成核心内容",
      prompt: `请为"${g}"创作专业内容：\n\n语气：${t}，受众：${a}\n\n要求：\n- 专业且易于理解\n- 结构清晰\n- 可直接使用`, order: c === "simple" ? 2 : 4 },
  ];

  if (c === "complex") {
    endSteps.push(
      { title: "质量审查", description: "审查和优化输出",
        prompt: `对以上内容进行全面质量检查：\n\n检查：\n1. 准确性和专业性\n2. 完整性和逻辑性\n3. 可读性\n4. 输出最终优化版本`, order: 5 },
      { title: "实施规划", description: "制定实施路线图",
        prompt: `为"${g}"制定实施路线图：\n\n输出：\n1. 实施阶段划分\n2. 每阶段关键任务\n3. 里程碑和检查点\n4. 成功指标`, order: 6 },
    );
  }

  return [...baseSteps, ...midSteps, ...endSteps];
}
