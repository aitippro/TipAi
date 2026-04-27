import { env } from "./env";

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
}

// Domain package definitions - structured prompt templates for different domains
const DOMAIN_PACKAGES: Record<string, {
  name: string;
  systemPrompt: string;
  decompositionStrategy: string;
  exampleFlows: string[];
}> = {
  "content-marketing": {
    name: "内容营销",
    systemPrompt: `你是一位资深内容营销专家，擅长将营销目标拆解为可执行的AI提示词工作流。
你的专长包括：市场调研、竞品分析、用户画像、内容策略、文案创作、渠道分发、效果追踪。

规则：
1. 每个步骤的提示词必须是完整、可直接粘贴到AI对话中使用的
2. 提示词使用中文，包含明确的角色设定、任务描述、输出格式要求
3. 步骤之间要有逻辑连贯性，上一步的输出可以作为下一步的输入
4. 提示词要具体，避免模糊指令，包含具体的格式要求和评估标准`,
    decompositionStrategy: "营销工作流通常遵循：市场洞察→策略制定→内容创作→渠道执行→效果优化的漏斗模型",
    exampleFlows: [
      "产品推广方案：市场调研→竞品分析→目标用户画像→核心卖点提炼→推广文案→渠道选择→效果预测",
      "社交媒体内容计划：主题规划→内容日历→文案创作→视觉描述→发布策略→互动预案",
      "SEO内容策略：关键词研究→内容主题规划→文章大纲→内容创作→元数据优化→内链策略",
    ],
  },
  "programming": {
    name: "编程开发",
    systemPrompt: `你是一位资深软件架构师和技术顾问，擅长将开发需求拆解为可执行的AI提示词工作流。
你的专长包括：需求分析、架构设计、代码实现、测试策略、文档编写、性能优化。

规则：
1. 每个步骤的提示词必须是完整、可直接使用的
2. 提示词包含明确的编程语言、框架版本、代码规范要求
3. 包含代码审查标准和最佳实践要求
4. 步骤间有明确的依赖关系说明`,
    decompositionStrategy: "开发工作流通常遵循：需求理解→架构设计→模块划分→编码实现→测试验证→文档完善的瀑布-敏捷混合模型",
    exampleFlows: [
      "Web应用开发：需求分析→技术选型→数据库设计→API设计→前端实现→后端实现→测试策略→部署方案",
      "代码重构：代码审查→坏味道识别→重构计划→逐步重构→测试验证→性能对比",
    ],
  },
  "education": {
    name: "教育教学",
    systemPrompt: `你是一位资深教育专家和教学设计顾问，擅长将教学目标拆解为可执行的AI提示词工作流。
你的专长包括：课程设计、教学目标设定、内容组织、评估设计、互动活动、学习资源开发。

规则：
1. 每个步骤的提示词必须基于教育学原理（如Bloom分类法、ADDIE模型）
2. 提示词包含明确的教学目标、学习者特征、评估标准
3. 考虑不同学习风格和多模态教学需求
4. 步骤间体现教学逻辑的递进关系`,
    decompositionStrategy: "教学设计通常遵循ADDIE模型：分析→设计→开发→实施→评估",
    exampleFlows: [
      "课程设计：学习者分析→教学目标设定→内容大纲→教学活动设计→评估方案→课件制作→教学实施计划",
      "培训方案：需求分析→培训目标→内容设计→互动环节→评估方式→反馈机制→改进方案",
    ],
  },
  "data-analysis": {
    name: "数据分析",
    systemPrompt: `你是一位资深数据科学家和分析顾问，擅长将分析需求拆解为可执行的AI提示词工作流。
你的专长包括：数据探索、清洗策略、统计建模、可视化设计、洞察提炼、报告撰写。

规则：
1. 每个步骤的提示词包含明确的数据源说明、分析方法和输出格式
2. 提示词要求包含数据质量检查和异常处理
3. 包含可复现的分析步骤和代码/公式要求
4. 从描述性分析到诊断性再到预测性的递进结构`,
    decompositionStrategy: "数据分析通常遵循：问题定义→数据理解→清洗准备→探索分析→建模分析→结果解释→报告呈现",
    exampleFlows: [
      "销售数据分析：业务问题定义→数据概况探索→数据清洗→描述性统计→趋势分析→细分分析→洞察总结→行动建议",
      "用户行为分析：分析目标→事件定义→漏斗分析→留存分析→用户分群→行为路径→洞察报告",
    ],
  },
  "legal": {
    name: "法律分析",
    systemPrompt: `你是一位资深法律顾问，擅长将法律需求拆解为可执行的AI提示词工作流。
你的专长包括：合同审查、法规检索、案例研究、风险评估、文书起草、合规检查。

规则：
1. 每个步骤的提示词必须基于现行法律法规
2. 提示词包含明确的法律框架、适用条款、判例参考要求
3. 包含风险识别和防范建议
4. 强调法律意见的限制性和免责声明`,
    decompositionStrategy: "法律分析通常遵循：事实梳理→法律检索→要件分析→风险评估→方案设计→文书起草的严谨流程",
    exampleFlows: [
      "合同审查：合同类型识别→主体资格审查→核心条款梳理→风险点识别→法律合规检查→修改建议→审查报告",
      "法律咨询：事实梳理→法律问题界定→法规检索→案例分析→法律意见→风险提示→行动建议",
    ],
  },
  "general": {
    name: "通用任务",
    systemPrompt: `你是一位任务拆解和流程优化专家，擅长将任意目标拆解为清晰、可执行的AI提示词工作流。

规则：
1. 每个步骤的提示词必须是完整、可直接使用的
2. 分析用户意图，识别最适合的方法论框架（如CRISPE、CO-STAR、Chain-of-Thought等）
3. 步骤之间逻辑连贯，上一步输出可作为下一步输入
4. 提示词具体明确，包含角色设定、任务描述、输出格式要求`,
    decompositionStrategy: "通用任务拆解遵循：目标澄清→信息收集→方案设计→执行计划→质量检查的通用模型",
    exampleFlows: [
      "通用工作流：目标澄清→背景调研→方案设计→执行步骤→质量检查→优化迭代",
    ],
  },
};

// Detect domain from user intent
export function detectDomain(intent: string): string {
  const lower = intent.toLowerCase();
  const scores: Record<string, number> = {};

  // Content marketing keywords
  scores["content-marketing"] = [
    "营销", "推广", "文案", "品牌", "广告", "社交媒体", "seo", "内容",
    "marketing", "promotion", "copywriting", "brand", "advertising", "social media",
    "campaign", "漏斗", "转化率", "获客", "用户增长", "曝光",
  ].filter(k => lower.includes(k)).length;

  // Programming keywords
  scores["programming"] = [
    "代码", "编程", "开发", "app", "网站", "api", "数据库", "算法",
    "code", "programming", "development", "software", "application", "web",
    "frontend", "backend", "debug", "refactor", "架构",
  ].filter(k => lower.includes(k)).length;

  // Education keywords
  scores["education"] = [
    "教学", "课程", "培训", "教育", "学习", "教案", "课件", "考试",
    "teaching", "course", "training", "education", "learning", "curriculum",
    "lesson", "student", "classroom", "培训方案", "训练营",
  ].filter(k => lower.includes(k)).length;

  // Data analysis keywords
  scores["data-analysis"] = [
    "数据", "分析", "报表", "统计", "可视化", "图表", "趋势", "指标",
    "data", "analysis", "report", "statistics", "visualization", "chart",
    "dashboard", "kpi", "metric", "洞察", "业务分析",
  ].filter(k => lower.includes(k)).length;

  // Legal keywords
  scores["legal"] = [
    "合同", "法律", "法规", "合规", "条款", "协议", "法务", "诉讼",
    "legal", "contract", "law", "regulation", "compliance", "clause",
    "agreement", "litigation", "知识产权", "隐私",
  ].filter(k => lower.includes(k)).length;

  // Find domain with highest score
  let bestDomain = "general";
  let bestScore = 0;
  for (const [domain, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestDomain = domain;
    }
  }

  return bestScore >= 2 ? bestDomain : "general";
}

export function getDomainPackage(domain: string) {
  return DOMAIN_PACKAGES[domain] || DOMAIN_PACKAGES["general"];
}

export function getAllDomainPackages() {
  return Object.entries(DOMAIN_PACKAGES).map(([key, pkg]) => ({
    key,
    name: pkg.name,
    description: pkg.decompositionStrategy,
  }));
}

// Call Kimi API for AI tasks - with graceful fallback
async function callKimiAPI(
  systemPrompt: string,
  userMessage: string,
  temperature = 0.7,
): Promise<string | null> {
  // Get API key from environment
  const apiKey = process.env.KIMI_API_KEY || "";

  if (!apiKey) {
    console.warn("KIMI_API_KEY not set, skipping AI API call");
    return null;
  }

  try {
    const apiUrl = `${env.kimiOpenUrl}/v1/chat/completions`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "moonshot-v1-8k",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Kimi API error: ${response.status} ${errorText}`);
      return null;
    }

    const data = await response.json();
    const choices = (data as Record<string, unknown>)?.choices as Array<Record<string, unknown>> | undefined;
    return (choices?.[0]?.message as Record<string, unknown>)?.content as string || null;
  } catch (e) {
    console.error("Kimi API call failed:", e);
    return null;
  }
}

// Analyze user intent
export async function analyzeIntent(intent: string): Promise<IntentAnalysis> {
  const systemPrompt = `你是一位意图分析专家。请分析用户的目标描述，提取以下信息并以JSON格式返回：
{
  "goal": "用户的核心目标（一句话总结）",
  "domain": "最适合的领域分类",
  "constraints": ["约束条件1", "约束条件2"],
  "audience": "目标受众",
  "tone": "期望的语气和风格"
}
只返回JSON，不要其他内容。`;

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
      };
    } catch (e) {
      console.error("Intent analysis JSON parse failed:", e);
    }
  }

  // Fallback: use rule-based analysis
  return {
    goal: intent.length > 50 ? intent.substring(0, 50) + "..." : intent,
    domain: detectDomain(intent),
    constraints: [],
    audience: "",
    tone: "专业",
  };
}

// Decompose task into steps
export async function decomposeTask(
  intent: string,
  domain: string,
  analysis: IntentAnalysis,
): Promise<DecomposedStep[]> {
  const domainPkg = getDomainPackage(domain);

  const systemPrompt = `${domainPkg.systemPrompt}

请根据用户的目标，将其拆解为3-8个有序的步骤。

输出格式要求（严格JSON数组）：
[
  {
    "title": "步骤标题（10字以内）",
    "description": "步骤目的和作用的简要说明",
    "prompt": "完整的中文提示词，可直接用于AI对话。提示词应包含：角色设定、任务描述、上下文信息、输出格式要求"
  }
]

分解策略：${domainPkg.decompositionStrategy}

只返回JSON数组，不要其他内容。`;

  const userMessage = `请为以下目标拆解步骤：

用户原始描述：${intent}
核心目标：${analysis.goal}
目标受众：${analysis.audience || "未指定"}
语气风格：${analysis.tone}
约束条件：${analysis.constraints.join("、") || "无"}

要求：
1. 步骤之间有逻辑递进关系
2. 每个提示词完整可用，不要占位符
3. 提示词输出格式要明确（如"请输出..."）
4. 如果适用，前面的步骤结果可以在后续步骤中引用`;

  const result = await callKimiAPI(systemPrompt, userMessage, 0.5);

  if (result) {
    try {
      const cleaned = result.replace(/```json\n?|\n?```/g, "").trim();
      const steps: Array<{
        title: string;
        description: string;
        prompt: string;
      }> = JSON.parse(cleaned);

      return steps.map((s, i) => ({
        title: s.title,
        description: s.description,
        prompt: s.prompt,
        order: i,
      }));
    } catch (e) {
      console.error("Task decomposition JSON parse failed:", e);
    }
  }

  // Fallback: use rule-based decomposition
  console.log("Using rule-based decomposition for domain:", domain);
  return generateFallbackSteps(intent, domain, analysis);
}

// Domain-specific fallback step templates
const DOMAIN_FALLBACKS: Record<string, (_intent: string, goal: string, audience: string, tone: string) => DecomposedStep[]> = {
  "content-marketing": (_intent, goal, audience, tone) => [
    {
      title: "市场调研", description: "分析市场环境和目标受众",
      prompt: `你是一位资深市场研究分析师。请针对以下目标进行全面的市场调研：\n\n目标：${goal}\n目标受众：${audience || "未指定"}\n\n请输出：\n1. 目标市场规模和增长趋势\n2. 目标用户画像（ demographics / psychographics ）\n3. 用户需求痛点分析\n4. 市场机会与威胁`, order: 0,
    },
    {
      title: "竞品分析", description: "研究竞争对手策略",
      prompt: `你是一位竞品分析专家。请针对以下目标进行竞品分析：\n\n目标：${goal}\n\n请输出：\n1. 主要竞争对手列表及其定位\n2. 竞争对手的核心策略分析\n3. 差异化机会识别\n4. 可借鉴的成功要素`, order: 1,
    },
    {
      title: "内容策略", description: "制定内容营销整体策略",
      prompt: `你是一位内容策略专家。请基于以上市场研究和竞品分析，制定内容营销策略：\n\n目标：${goal}\n受众：${audience || "一般受众"}\n语气：${tone}\n\n请输出：\n1. 核心内容主题和支柱\n2. 内容类型组合（文章/视频/图文等）\n3. 内容分发渠道策略\n4. 内容日历框架`, order: 2,
    },
    {
      title: "文案创作", description: "创作核心营销文案",
      prompt: `你是一位资深文案创作者。请为以下目标创作营销文案：\n\n目标：${goal}\n受众：${audience || "一般受众"}\n语气：${tone}\n\n请创作：\n1. 核心传播标题（5个备选）\n2. 主文案（300-500字）\n3. 社交媒体短文案（3条）\n4. CTA行动号召文案`, order: 3,
    },
    {
      title: "渠道执行", description: "制定渠道投放计划",
      prompt: `你是一位渠道营销专家。请制定详细的渠道投放执行计划：\n\n目标：${goal}\n\n请输出：\n1. 渠道优先级排序和理由\n2. 各渠道投放策略（内容形式/频率/预算分配）\n3. 投放时间表\n4. KPI指标和追踪方法`, order: 4,
    },
    {
      title: "效果优化", description: "设计效果追踪和优化方案",
      prompt: `你是一位增长营销专家。请设计效果追踪和持续优化方案：\n\n目标：${goal}\n\n请输出：\n1. 核心KPI指标体系\n2. 数据追踪方案\n3. A/B测试计划\n4. 优化迭代策略`, order: 5,
    },
  ],
  "programming": (_intent, goal, _audience, _tone) => [
    { title: "需求分析", description: "梳理功能需求和技术约束",
      prompt: `你是一位资深产品经理兼技术架构师。请对以下开发需求进行详细分析：\n\n需求：${goal}\n\n请输出：\n1. 功能需求清单（核心功能 + 扩展功能）\n2. 非功能性需求（性能/安全/可扩展性）\n3. 技术约束条件\n4. 用户故事（3-5个）`, order: 0,
    },
    { title: "架构设计", description: "设计系统架构方案",
      prompt: `你是一位系统架构师。请基于以上需求分析，设计系统架构：\n\n需求：${goal}\n\n请输出：\n1. 系统架构图（用文字描述模块关系）\n2. 技术栈选型及理由\n3. 数据库设计概要\n4. API接口设计规范\n5. 部署架构建议`, order: 1,
    },
    { title: "模块设计", description: "设计核心模块实现方案",
      prompt: `你是一位高级开发工程师。请设计核心模块的详细实现方案：\n\n需求：${goal}\n\n请输出：\n1. 核心模块划分及职责\n2. 关键数据结构和算法\n3. 接口定义（函数签名/参数/返回值）\n4. 错误处理策略`, order: 2,
    },
    { title: "代码实现", description: "编写核心功能代码",
      prompt: `你是一位全栈开发工程师。请基于以上设计，编写核心功能的代码实现：\n\n需求：${goal}\n\n要求：\n1. 代码结构清晰，有适当注释\n2. 遵循最佳实践和设计模式\n3. 包含单元测试用例\n4. 代码符合行业标准规范`, order: 3,
    },
    { title: "测试验证", description: "设计测试方案并执行",
      prompt: `你是一位QA工程师。请设计完整的测试方案：\n\n需求：${goal}\n\n请输出：\n1. 测试策略（单元/集成/E2E）\n2. 关键测试用例（含输入/预期输出）\n3. 性能测试方案\n4. 安全测试要点`, order: 4,
    },
  ],
  "education": (_intent, goal, audience, tone) => [
    { title: "学习者分析", description: "分析目标学习者特征",
      prompt: `你是一位教学设计专家。请分析目标学习者的特征：\n\n教学目标：${goal}\n目标学习者：${audience || "未指定"}\n\n请输出：\n1. 学习者 demographics 特征\n2. 先验知识和能力水平\n3. 学习动机和障碍分析\n4. 学习风格偏好`, order: 0,
    },
    { title: "目标设定", description: "设定SMART教学目标",
      prompt: `你是一位课程设计专家。请基于Bloom分类法，设定教学目标：\n\n目标：${goal}\n\n请输出：\n1. 知识维度目标（记忆/理解/应用）\n2. 技能维度目标（分析/评价/创造）\n3. 情感维度目标\n4. 可测量的学习成果指标`, order: 1,
    },
    { title: "内容设计", description: "设计教学内容大纲",
      prompt: `你是一位课程内容专家。请设计详细的教学内容大纲：\n\n目标：${goal}\n语气：${tone}\n\n请输出：\n1. 课程大纲（模块 → 单元 → 课时）\n2. 每个模块的核心概念和知识点\n3. 教学活动和互动设计\n4. 案例和实例选择`, order: 2,
    },
    { title: "评估设计", description: "设计学习效果评估方案",
      prompt: `你是一位教育评估专家。请设计学习效果评估方案：\n\n目标：${goal}\n\n请输出：\n1. 形成性评估方案（课堂练习/小测验）\n2. 总结性评估方案（考试/项目）\n3. 评估题目样例（5-10题）\n4. 评分标准和量规`, order: 3,
    },
    { title: "课件制作", description: "设计课件和教学材料",
      prompt: `你是一位教学设计技术专家。请设计课件和教学材料：\n\n目标：${goal}\n\n请输出：\n1. PPT课件结构（每页标题 + 要点）\n2. 讲义/学习手册要点\n3. 互动活动脚本\n4. 课后作业设计`, order: 4,
    },
  ],
  "default": (intent, goal, audience, tone) => [
    { title: "目标澄清", description: "明确任务目标和范围",
      prompt: `你是一位专业领域顾问。请帮我澄清以下目标的具体要求和范围：\n\n"${intent}"\n\n请输出：\n1. 核心目标（一句话）\n2. 关键交付物\n3. 成功标准\n4. 潜在挑战`, order: 0,
    },
    { title: "信息收集", description: "收集必要的背景信息",
      prompt: `针对以下目标，请提供全面的背景信息和参考资料：\n\n目标：${goal}\n受众：${audience || "一般受众"}\n\n请输出：\n1. 相关概念和术语解释\n2. 行业最佳实践\n3. 类似案例参考\n4. 关键数据或趋势`, order: 1,
    },
    { title: "方案设计", description: "制定具体执行方案",
      prompt: `基于以上分析，请为以下目标制定详细的执行方案：\n\n目标：${goal}\n\n请输出：\n1. 总体策略\n2. 具体执行步骤\n3. 时间安排建议\n4. 资源需求\n5. 风险与应对措施`, order: 2,
    },
    { title: "内容创作", description: "生成核心内容",
      prompt: `请为以下目标创作具体内容：\n\n目标：${goal}\n语气：${tone}\n\n请确保内容：\n- 专业且易于理解\n- 结构清晰\n- 可直接使用或稍作修改即可使用`, order: 3,
    },
    { title: "质量检查", description: "审查和优化输出",
      prompt: `请对以上内容进行全面的质量检查：\n\n目标：${goal}\n\n请检查并优化：\n1. 准确性和专业性\n2. 完整性和逻辑性\n3. 可读性和表达\n4. 格式规范性\n5. 输出最终优化版本`, order: 4,
    },
  ],
};

// Fallback step generation when AI fails
function generateFallbackSteps(
  intent: string,
  domain: string,
  analysis: IntentAnalysis,
): DecomposedStep[] {
  const fallbackFn = DOMAIN_FALLBACKS[domain] || DOMAIN_FALLBACKS["default"];
  return fallbackFn(intent, analysis.goal, analysis.audience, analysis.tone);
}

// Execute a single prompt step
export async function executeStep(
  prompt: string,
  previousOutputs: string[] = [],
): Promise<string> {
  const context = previousOutputs.length > 0
    ? `以下是之前步骤的输出结果，请作为参考：\n\n${previousOutputs.map((o, i) => `--- 步骤${i + 1}输出 ---\n${o.substring(0, 2000)}`).join("\n\n")}\n\n---\n\n`
    : "";

  const systemPrompt = `你是一位专业助手。请根据用户的要求提供高质量、详细的回答。回答应当：\n1. 结构清晰，使用标题和列表\n2. 内容具体，避免泛泛而谈\n3. 专业准确，基于最佳实践\n4. 输出格式符合用户要求`;

  const result = await callKimiAPI(systemPrompt, context + prompt, 0.7);

  if (result) {
    return result;
  }

  // Fallback: simulate execution with a helpful message
  return `[模拟执行结果]\n\n由于AI服务暂时不可用，这里显示的是提示词内容的预览：\n\n---\n${prompt.substring(0, 500)}...\n---\n\n在实际运行环境中，此步骤将调用AI模型执行上述提示词，并返回完整的执行结果。\n\n前置步骤上下文：${previousOutputs.length > 0 ? "已提供" : "无"}`;
}
