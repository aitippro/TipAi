import type {
  Framework,
  FrameworkRecommendation,
  SlashCommand,
} from "./types";

export const DEFAULT_FRAMEWORK_KEY = "co-star";

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    command: "/text",
    name: "文本生成",
    icon: "text",
    description: "通用文本生成提示词",
    targetModel: "text",
    defaultFramework: DEFAULT_FRAMEWORK_KEY,
  },
  {
    command: "/image",
    name: "图像生成",
    icon: "image",
    description: "文生图/图生图提示词（Midjourney/DALL-E/Stable Diffusion）",
    targetModel: "image",
    defaultFramework: "rtf",
  },
  {
    command: "/video",
    name: "视频生成",
    icon: "video",
    description: "文生视频/视频脚本提示词（Sora/Runway/Pika）",
    targetModel: "video",
    defaultFramework: "risen",
  },
  {
    command: "/code",
    name: "代码生成",
    icon: "code",
    description: "编程、算法、架构设计提示词",
    targetModel: "code",
    defaultFramework: "ape-optimized",
  },
  {
    command: "/data",
    name: "数据分析",
    icon: "data",
    description: "数据处理、可视化、统计提示词",
    targetModel: "text",
    defaultFramework: "risen",
  },
  {
    command: "/copy",
    name: "文案创作",
    icon: "copy",
    description: "营销文案、品牌文案、社媒内容提示词",
    targetModel: "text",
    defaultFramework: DEFAULT_FRAMEWORK_KEY,
  },
  {
    command: "/teach",
    name: "教学/培训",
    icon: "teach",
    description: "教案、课程、知识讲解提示词",
    targetModel: "text",
    defaultFramework: "crispe",
  },
  {
    command: "/legal",
    name: "法律文书",
    icon: "legal",
    description: "合同、法律分析、合规文档提示词",
    targetModel: "text",
    defaultFramework: "care",
  },
  {
    command: "/agent",
    name: "AI Agent",
    icon: "agent",
    description: "智能体角色、工具调用、工作流提示词",
    targetModel: "text",
    defaultFramework: "react",
  },
  {
    command: "/think",
    name: "深度推理",
    icon: "think",
    description: "复杂问题分析、决策、研究提示词",
    targetModel: "text",
    defaultFramework: "chain-of-thought",
  },
];

export function parseSlashCommand(intent: string): {
  command: SlashCommand | null;
  cleanIntent: string;
} {
  const trimmed = intent.trim();
  const match = trimmed.match(/^\/([a-z]+)\s*/i);
  if (!match) return { command: null, cleanIntent: trimmed };

  const command = SLASH_COMMANDS.find(
    (item) => item.command === `/${match[1].toLowerCase()}`,
  );
  if (!command) return { command: null, cleanIntent: trimmed };

  return {
    command,
    cleanIntent: trimmed.slice(match[0].length).trim(),
  };
}

export const FRAMEWORKS: Record<string, Framework> = {
  "co-star": {
    name: "CO-STAR",
    nameEn: "CO-STAR",
    description:
      "最全面的沟通框架，6个维度构建完美提示词，适用于所有内容创作场景",
    bestFor: [
      "content-marketing",
      "writing",
      "branding",
      "social-media",
      "email",
      "copywriting",
    ],
    components: [
      "Context(背景)",
      "Objective(目标)",
      "Style(风格)",
      "Tone(语气)",
      "Audience(受众)",
      "Response(输出格式)",
    ],
    template: `Context: {{背景上下文信息，包含品牌/产品/场景}}
Objective: {{具体目标——你想要AI完成什么}}
Style: {{写作风格——专业/幽默/简洁/故事化}}
Tone: {{语气调性——友好/权威/温暖/犀利}}
Audience: {{目标受众画像——年龄/职业/痛点}}
Response: {{期望的输出格式——字数/结构/样式}}`,
    example: `Context: 我们是一家面向Z世代的可持续时尚品牌，即将推出秋季新品系列，主打环保材质和极简设计
Objective: 撰写一则Instagram帖子，吸引目标用户关注并点击购买链接，提升新品曝光度
Style: 轻松、有洞察力、略带幽默，融入当下流行梗
Tone: 友好、鼓励、不居高临下，像朋友推荐好物
Audience: 18-28岁关注环保和时尚的年轻女性，注重性价比和价值观认同
Response: 包含吸引人的标题、3-5个产品卖点（每个带emoji）、CTA、hashtag列表（8-10个）`,
  },
  risen: {
    name: "RISEN",
    nameEn: "RISEN",
    description: "流程驱动框架，适用于需要分步骤执行的复杂任务",
    bestFor: [
      "programming",
      "data-analysis",
      "technical-writing",
      "report",
      "project-planning",
      "workflow",
    ],
    components: [
      "Role(角色)",
      "Instructions(指令)",
      "Steps(步骤)",
      "End goal(目标)",
      "Narrowing(约束)",
    ],
    template: `Role: {{AI扮演的角色——专家身份}}
Instructions: {{需要执行的核心任务}}
Steps:
1. {{步骤1}}
2. {{步骤2}}
3. {{步骤3}}
...
End goal: {{最终交付目标——成功标准}}
Narrowing: {{约束条件和限制——技术栈/预算/时间}}`,
    example: `Role: 你是一位有10年经验的Python后端架构师，曾主导过多个大型电商系统设计
Instructions: 为一个日均订单量50万的电商订单系统设计完整的RESTful API架构
Steps:
1. 分析业务需求和数据模型（订单状态机、支付流程、库存扣减）
2. 设计核心API端点列表（GET/POST/PUT/DELETE），标注幂等性
3. 定义请求/响应DTO格式，包含字段类型、校验规则、示例数据
4. 设计异常处理和错误码规范（HTTP状态码+业务错误码）
5. 提供单元测试示例和接口文档（OpenAPI/Swagger格式）
End goal: 一套可直接进入开发评审的完整API设计方案
Narrowing: 使用FastAPI + SQLAlchemy，遵循RESTful最佳实践，支持10000 QPS并发，响应时间P99 < 200ms`,
  },
  rtf: {
    name: "RTF",
    nameEn: "Role-Task-Format",
    description: "极简高效框架，3要素快速构建，适合简单直接的输出需求",
    bestFor: [
      "programming",
      "quick-task",
      "json",
      "table",
      "checklist",
      "image-prompt",
    ],
    components: ["Role(角色)", "Task(任务)", "Format(格式)"],
    template: `Role: {{AI角色定位}}
Task: {{具体任务描述}}
Format: {{输出格式要求——JSON/表格/列表/代码}}`,
    example: `Role: 你是一位Stable Diffusion提示词专家，精通光影、构图和风格描述
Task: 为一幅"赛博朋克风格的中国古代茶馆"生成英文提示词
Format: 以JSON输出：{ "prompt": "主提示词", "negative_prompt": "负面提示词", "parameters": { "style": "风格标签", "lighting": "光影描述", "composition": "构图说明", "colors": "色彩方案" } }`,
  },
  crispe: {
    name: "CRISPE",
    nameEn: "CRISPE",
    description: "深度角色扮演框架，适合教学、咨询、需要强 persona 的场景",
    bestFor: [
      "education",
      "consulting",
      "coaching",
      "therapy",
      "creative-writing",
    ],
    components: [
      "Capacity+Role(能力+角色)",
      "Insight(洞察)",
      "Instruction(指令)",
      "Personality(个性)",
      "Experiment(实验)",
    ],
    template: `Capacity+Role: {{AI的能力和角色定位——资历/专业/成就}}
Insight: {{关于用户的背景洞察——需求/痛点/水平}}
Instruction: {{具体指令——任务描述和期望}}
Personality: {{AI的个性特征——沟通风格/价值观}}
Experiment: {{迭代机制——如何根据反馈调整}}`,
    example: `Capacity+Role: 你是一位擅长用苏格拉底式教学法教授微积分的大学教授，曾在MIT任教，著有《微积分的艺术》
Insight: 学生是大学一年级新生，数学基础中等，对极限概念感到困惑，需要直观的理解而非公式推导
Instruction: 用循序渐进的方式解释导数的概念，从现实生活中的例子开始（速度、温度变化），再过渡到数学定义
Personality: 耐心、鼓励、善于用类比，从不批评错误，把错误视为学习机会
Experiment: 如果学生没有理解，主动询问困惑点，尝试不同的解释方式或类比，直到学生"aha"为止`,
  },
  ape: {
    name: "APE",
    nameEn: "Action-Purpose-Expectation",
    description: "行动导向框架，适合需要AI执行具体动作的任务",
    bestFor: [
      "programming",
      "execution",
      "data-processing",
      "automation",
      "transformation",
    ],
    components: ["Action(行动)", "Purpose(目的)", "Expectation(期望)"],
    template: `Action: {{具体行动——你要AI做什么}}
Purpose: {{行动的目的——为什么要做}}
Expectation: {{期望的结果和标准——交付质量}}`,
    example: `Action: 用Python编写一个函数，读取CSV文件并计算每列的统计信息（均值、中位数、标准差、缺失值比例、数据类型）
Purpose: 自动化数据分析流程，减少手动计算时间，让团队快速了解数据概况
Expectation: 函数应返回一个结构化字典，处理异常值和空值，包含类型提示和Google Style文档字符串，附带3个使用示例`,
  },
  broke: {
    name: "BROKE",
    nameEn: "BROKE",
    description: "目标驱动框架，适合项目管理、OKR、策略制定",
    bestFor: ["project-management", "okr", "performance", "strategy", "planning"],
    components: [
      "Background(背景)",
      "Role(角色)",
      "Objectives(目标)",
      "Key Results(关键结果)",
      "Evolve(迭代)",
    ],
    template: `Background: {{项目/任务背景——现状/问题/机会}}
Role: {{AI角色——顾问/专家/执行者}}
Objectives: {{主要目标——定性描述}}
Key Results: {{衡量成功的关键指标——定量标准}}
Evolve: {{迭代改进机制——复盘/调整频率}}`,
    example: `Background: 我们是SaaS初创公司，ARR 200万，用户流失率在过去3个月上升了15%，主要流失节点在试用到期后未转化
Role: 你是一位用户留存策略顾问，曾帮助多家SaaS公司将流失率降低50%
Objectives: 制定一套完整的用户留存提升方案，从试用体验到付费转化全链路优化
Key Results: 
1) 30天内流失率下降10%（从15%降至13.5%）
2) 试用转化率提升20%（从8%提升至9.6%）
3) 用户7日留存率提升15%
4) NPS评分提升5分（从32到37）
Evolve: 每周回顾数据，A/B测试不同策略，根据结果动态调整方案`,
  },
  care: {
    name: "CARE",
    nameEn: "CARE",
    description: "简洁约束框架，适合快速内容生成和模板化输出",
    bestFor: [
      "quick-content",
      "social-media",
      "short-copy",
      "headlines",
      "legal-formal",
    ],
    components: ["Context(背景)", "Ask(请求)", "Rules(规则)", "Examples(示例)"],
    template: `Context: {{背景——场景/品牌/受众}}
Ask: {{具体请求——生成什么}}
Rules: {{必须遵守的规则——格式/风格/禁区}}
Examples: {{参考示例——期望输出的参照}}`,
    example: `Context: 我们是一家提供远程工作工具的SaaS公司，主打团队协作和异步沟通
Ask: 写5条Twitter/X帖子，推广我们的产品，每条聚焦不同卖点
Rules: 每条不超过280字，包含一个相关产品标签，语气专业但不枯燥，避免使用"革命性""颠覆"等陈词滥调
Examples: "远程工作不等于孤立工作。用[产品名]让你的团队随时保持同步，无论时区。#远程工作 #团队协作"`,
  },
  "chain-of-thought": {
    name: "思维链",
    nameEn: "Chain-of-Thought",
    description: "逐步推理框架，让AI显式展示思考过程，适合复杂问题求解",
    bestFor: [
      "reasoning",
      "math",
      "logic",
      "problem-solving",
      "analysis",
      "decision-making",
    ],
    components: ["Problem(问题)", "Reasoning Steps(推理步骤)", "Conclusion(结论)"],
    template: `Problem: {{需要解决的问题}}

请按以下步骤显式思考：
Step 1: {{第一步——理解问题/收集信息}}
Step 2: {{第二步——分析/推理}}
Step 3: {{第三步——验证/修正}}
...
Conclusion: {{最终结论——清晰总结}}`,
    example: `Problem: 一家电商公司2024年收入为500万，成本为350万；2025年预计收入增长20%，成本增长15%。请计算2025年的预计利润率，并给出经营建议。

请按以下步骤显式思考：
Step 1: 计算2025年预计收入（500万 × 1.20 = 600万）
Step 2: 计算2025年预计成本（350万 × 1.15 = 402.5万）
Step 3: 计算2025年预计利润（600万 - 402.5万 = 197.5万）
Step 4: 计算利润率（197.5万 / 600万 = 32.9%）
Step 5: 对比2024年利润率（150万/500万 = 30%），分析利润增长来源
Step 6: 给出经营建议——成本控制、收入增长策略、风险预警
Conclusion: 2025年预计利润率32.9%（提升2.9个百分点），收入增长快于成本增长是主因，建议继续优化供应链`,
  },
  react: {
    name: "ReAct",
    nameEn: "Reasoning + Acting",
    description: "推理+行动框架，适合AI Agent、工具调用、多步任务",
    bestFor: ["agent", "tool-use", "multi-step", "workflow", "automation"],
    components: ["Thought(思考)", "Action(行动)", "Observation(观察)", "Reflection(反思)"],
    template: `你是一位AI Agent。按以下循环工作：

Thought: {{对当前情况的思考——现状/目标/策略}}
Action: {{采取的行动——调用工具/查询/计算}}
Observation: {{行动结果——获取的数据/反馈}}
Reflection: {{反思——结果是否满足预期，下一步调整}}

重复以上循环直到达成目标。`,
    example: `你是一位研究助手Agent。用户需要了解"2024年全球AI投资趋势"。

Thought: 用户需要最新投资数据。我应该先搜索2024年AI投资报告，然后整理关键数据点。
Action: 搜索"2024 global AI investment trends report venture capital"
Observation: 获得多份报告数据，包括Crunchbase、PitchBook、Statista的统计
Reflection: 数据来自多个来源，需要交叉验证和统一口径。继续搜索补充中国市场的数据。

Thought: 已有北美和欧洲数据，缺少中国市场数据
Action: 搜索"2024年中国AI投资 融资报告"
Observation: 获得IT桔子、36氪等来源的数据
Reflection: 数据完整了。现在可以生成结构化报告，包含全球总量、区域分布、热门赛道、典型案例。`,
  },
  "tree-of-thoughts": {
    name: "思维树",
    nameEn: "Tree of Thoughts",
    description: "多路径探索框架，适合创意生成、策略制定、方案比较",
    bestFor: [
      "brainstorming",
      "strategy",
      "creative",
      "decision-making",
      "problem-solving",
    ],
    components: ["Problem(问题)", "Paths(路径)", "Evaluation(评估)", "Best Path(最优路径)"],
    template: `Problem: {{需要解决的问题}}

请生成至少3条不同的解决路径：
Path 1: {{路径1标题}}
- 描述：{{具体做法}}
- 优点：{{优势}}
- 风险：{{潜在风险}}

Path 2: {{路径2标题}}
- 描述：{{具体做法}}
- 优点：{{优势}}
- 风险：{{潜在风险}}

Path 3: {{路径3标题}}
- 描述：{{具体做法}}
- 优点：{{优势}}
- 风险：{{潜在风险}}

Evaluation: {{对每条路径的综合评估——成本/收益/可行性}}
Best Path: {{推荐的最优路径及理由}}`,
    example: `Problem: 一家B2B SaaS公司（ARR 500万，客户100家）增长遇到瓶颈，如何在6个月内将ARR提升到800万？

请生成至少3条不同的增长路径：
Path 1: 深耕现有客户（Upsell/Cross-sell）
- 描述：向现有100家客户推广高级套餐和增值服务，提升客单价
- 优点：成本低、转化率高（现有客户信任度高）、实施快
- 风险：客户预算有限，可能遇到采购流程阻力

Path 2: 拓展新市场（地域/行业扩张）
- 描述：进入2-3个新行业或新地域市场，获取新客户
- 优点：增量空间大、分散风险
- 风险：获客成本高、需要新市场教育、销售周期可能较长

Path 3: 产品驱动增长（PLG + 免费增值）
- 描述：推出免费版本，通过产品口碑和病毒式传播获取用户
- 优点：获客成本低、品牌曝光度高
- 风险：免费用户转化付费需要时间，可能稀释品牌定位

Evaluation: 路径1 ROI最高但天花板低；路径2增长潜力大但风险高；路径3适合长期但短期见效慢
Best Path: 组合策略——Q1以路径1为主快速获取收入（目标+100万ARR），Q2启动路径3为长期蓄力，Q3视情况试点路径2`,
  },
  prompt: {
    name: "PROMPT",
    nameEn: "PROMPT",
    description: "7要素结构化框架，适合深度内容创作和精确控制输出",
    bestFor: [
      "writing",
      "content-creation",
      "long-form",
      "technical-writing",
      "documentation",
    ],
    components: [
      "Problem(问题)",
      "Role(角色)",
      "Objective(目标)",
      "Method(方法)",
      "Parameters(参数)",
      "Tone(语气)",
      "Template(模板)",
    ],
    template: `Problem: {{要解决的问题——用户痛点}}
Role: {{AI角色}}
Objective: {{目标——产出什么}}
Method: {{方法——用什么方式达成}}
Parameters: {{参数——字数/格式/结构/风格限制}}
Tone: {{语气}}
Template: {{输出模板——结构示例}}`,
    example: `Problem: 技术博客读者反映文章太干、难读、读完没收获
Role: 你是一位技术写作教练，擅长把复杂技术概念讲清楚
Objective: 为"Kubernetes入门"主题写一篇文章，让初学者读完能动手部署第一个应用
Method: 采用"概念→类比→实操→常见问题"结构，每节配一个生活化类比
Parameters: 3000-4000字，包含至少3个代码块，2个架构图描述（ASCII/Mermaid），1个检查清单
Tone: 像一位耐心的大厂导师，专业但不装腔作势，偶尔幽默
Template: 
# 标题（吸引力+关键词）
## 为什么要学这个（痛点共鸣）
## 用一个类比理解核心概念
## 手把手实操（步骤+代码）
## 踩坑指南
## 下一步学习路线图`,
  },
  tag: {
    name: "TAG",
    nameEn: "Task-Action-Goal",
    description: "3层目标框架，适合OKR拆解、任务分配、执行跟踪",
    bestFor: ["okr", "task-management", "goal-setting", "execution", "team-management"],
    components: ["Task(任务)", "Action(行动)", "Goal(目标)"],
    template: `Task: {{顶层任务——要完成的整体事项}}
Action: {{具体行动——可执行的步骤}}
Goal: {{最终目标——成功标准和验收条件}}`,
    example: `Task: 将产品月活从10万提升到30万
Action: 
1. 优化新用户 onboarding 流程（目标：7日留存从30%提升到50%）
2. 推出邀请奖励机制（目标：每月新增邀请用户5000人）
3. 与3个KOL合作推广（目标：带来2万新增用户）
Goal: 6个月内MAU达到30万，获客成本<50元/人，7日留存>50%`,
  },
  scqa: {
    name: "SCQA",
    nameEn: "Situation-Complication-Question-Answer",
    description: "故事化框架，适合方案提案、商业计划、问题分析",
    bestFor: [
      "business-proposal",
      "storytelling",
      "analysis",
      "consulting",
      "presentation",
    ],
    components: ["Situation(现状)", "Complication(冲突)", "Question(问题)", "Answer(答案)"],
    template: `Situation: {{背景现状——正常状态}}
Complication: {{冲突/变化——出现了什么问题/机会}}
Question: {{核心问题——我们需要解决什么}}
Answer: {{解决方案——你的答案/方案}}`,
    example: `Situation: 我们的电商平台月GMV 500万，用户复购率35%，处于行业平均水平
Complication: 新获客成本在过去半年上涨60%，ROI持续下降；同时竞争对手推出了会员体系，我们的高价值用户开始流失
Question: 如何在控制获客成本的同时提升用户LTV，建立可持续的增长飞轮？
Answer: 建议分三阶段实施会员忠诚度计划——1) 搭建积分+等级体系 2) 推出付费会员 3) 建立社群运营——预期6个月内复购率提升至50%，LTV提升40%`,
  },
  bab: {
    name: "BAB",
    nameEn: "Before-After-Bridge",
    description: "痛点-愿景-方案框架，适合销售文案、产品介绍、转化优化",
    bestFor: ["sales-copy", "product-launch", "landing-page", "conversion", "pitch"],
    components: ["Before(现状痛点)", "After(愿景画面)", "Bridge(解决方案)"],
    template: `Before: {{用户当前的痛苦状态——具体场景/数据/情绪}}
After: {{使用产品后的理想状态——愿景画面/数据/感受}}
Bridge: {{连接现状到愿景的方案——产品/服务如何做到}}`,
    example: `Before: 你每天花2小时在Excel里手动整理销售数据，还经常出错；周报用PPT做，每次熬到半夜；团队数据各自为政，开会讨论全靠"我觉得"
After: 早上9点，你的数据仪表盘已经自动刷新完毕；周报一键生成，还有智能洞察高亮异常；团队数据实时同步，会议直接看数据驱动决策
Bridge: [产品名]自动连接你的CRM、ERP、广告平台，AI自动生成分析洞察和报告模板，让每个团队成员都能实时看到统一的数据真相——不是"我觉得"，而是"数据显示"`,
  },
  smart: {
    name: "SMART",
    nameEn: "SMART Goals",
    description: "目标制定框架，适合OKR、绩效目标、项目里程碑",
    bestFor: ["goal-setting", "okr", "performance", "planning", "milestone"],
    components: [
      "Specific(具体)",
      "Measurable(可衡量)",
      "Achievable(可达成)",
      "Relevant(相关性)",
      "Time-bound(时限)",
    ],
    template: `Specific: {{具体目标——要做什么}}
Measurable: {{衡量指标——怎么算成功}}
Achievable: {{可行性——资源/能力是否足够}}
Relevant: {{相关性——为什么重要}}
Time-bound: {{时限——什么时候完成}}`,
    example: `Specific: 将产品注册转化率从8%提升到15%
Measurable: 通过A/B测试追踪注册漏斗每一步的转化率，以Mixpanel数据为准
Achievable: 参考竞品转化率12-18%，我们有设计和技术资源支持优化
Relevant: 注册转化是增长漏斗的第一关，直接影响后续所有指标
Time-bound: 在Q2结束（6月30日）前完成，分3个sprint迭代`,
  },
  "ape-optimized": {
    name: "APE+",
    nameEn: "APE Advanced",
    description: "APE的扩展版本，添加约束和验证，适合系统设计和代码工程",
    bestFor: ["programming", "system-design", "api-design", "testing", "devops"],
    components: [
      "Action(行动)",
      "Purpose(目的)",
      "Expectation(期望)",
      "Constraints(约束)",
      "Validation(验证)",
    ],
    template: `Action: {{具体行动——开发/设计/测试什么}}
Purpose: {{目的——解决什么问题}}
Expectation: {{期望结果——功能/性能/质量}}
Constraints: {{约束——技术栈/标准/限制}}
Validation: {{验证——怎么测试/验收}}`,
    example: `Action: 设计一个用户认证系统，支持OAuth2.0、JWT、双因素认证
Purpose: 确保只有授权用户可以访问敏感数据，防止数据泄露和未授权访问
Expectation: 支持10000并发用户，响应时间<100ms，兼容iOS/Android/Web三端
Constraints: 使用Node.js + TypeScript + Passport.js，符合OWASP Top 10安全标准，JWT有效期30分钟+刷新机制
Validation: 通过渗透测试（Burp Suite）、单元测试覆盖率>80%、负载测试（k6，10000并发/5分钟）、安全审计报告`,
  },
  langgpt: {
    name: "LangGPT",
    nameEn: "LangGPT",
    description: "结构化提示词编程框架，像写程序一样写提示词，适合复杂Agent和可复用模板",
    bestFor: [
      "agent",
      "complex-template",
      "reusable-prompt",
      "multi-role",
      "workflow",
    ],
    components: ["Profile(配置)", "Rules(规则)", "Skills(技能)", "Workflow(工作流)", "Initialization(初始化)"],
    template: `# Profile
name: {{AI角色名称}}
author: {{作者}}
version: {{版本}}
language: {{语言}}
description: {{角色描述}}

## Rules
1. {{规则1}}
2. {{规则2}}

## Skills
- {{技能1}}
- {{技能2}}

## Workflow
1. {{步骤1}}
2. {{步骤2}}

## Initialization
{{开场白/初始化行为}}`,
    example: `# Profile
name: 产品经理助手
author: TipAi
version: 1.0
language: 中文
description: 你是一位资深互联网产品经理，擅长需求分析、用户研究和PRD撰写

## Rules
1. 所有回答必须基于用户研究数据和行业最佳实践
2. 不确定时主动询问，不编造数据
3. 使用表格对比不同方案的优劣
4. 每个建议都要说明"为什么"

## Skills
- 需求分析和用户故事撰写
- 竞品分析和市场调研
- PRD撰写和原型设计建议
- 数据指标定义和埋点设计
- A/B测试方案设计

## Workflow
1. 理解用户描述的需求，用5W2H框架澄清
2. 分析目标用户画像和使用场景
3. 提供至少2个产品方案，用表格对比
4. 推荐最优方案并说明理由
5. 给出MVP范围和迭代路线图

## Initialization
你好！我是你的产品助手。请描述你想做的产品/功能，我会帮你分析需求、设计方案和规划路线。`,
  },
  "self-refine": {
    name: "自我优化",
    nameEn: "Self-Refine",
    description: "迭代改进框架，适合需要极高质量的输出",
    bestFor: [
      "high-quality-content",
      "code-optimization",
      "translation",
      "editing",
      "review",
    ],
    components: ["Generate(生成)", "Feedback(反馈)", "Refine(优化)"],
    template: `Generate: {{生成初始内容}}

Feedback: {{对内容的评价——优点/不足/问题}}

Refine: {{基于反馈优化后的内容}}`,
    example: `Generate: 写一篇关于"AI在医疗影像诊断中的应用"的学术论文摘要（300字）

Feedback: 
- 优点：涵盖了技术原理和应用场景
- 不足：缺少量化数据支撑、创新性表述不够突出、研究方法描述模糊
- 建议：添加准确率/召回率数据、强调 novel contribution、明确数据集和实验设置

Refine: [基于反馈重写的高质量摘要]`,
  },
  "few-shot": {
    name: "少样本学习",
    nameEn: "Few-Shot",
    description: "通过示例教AI完成任务，适合格式化输出和特定风格模仿",
    bestFor: [
      "formatting",
      "style-mimic",
      "classification",
      "extraction",
      "transformation",
    ],
    components: ["Instruction(指令)", "Examples(示例)", "Input(输入)", "Output(输出)"],
    template: `Instruction: {{任务指令}}

Examples:
Input: {{示例1输入}}
Output: {{示例1输出}}

Input: {{示例2输入}}
Output: {{示例2输出}}

Input: {{示例3输入}}
Output: {{示例3输出}}

Now, process the following:
Input: {{实际输入}}
Output:`,
    example: `Instruction: 将用户的产品评价转化为5个关键词标签（每个标签2-4字）

Examples:
Input: "这款手机拍照太棒了，夜景模式特别清晰，但是电池续航有点短，一天要充两次"
Output: ["拍照优秀", "夜景清晰", "续航不足", "充电频繁", "整体满意"]

Input: "快递很快，包装完好，咖啡机操作简单，做出来的咖啡很香，就是噪音有点大"
Output: ["物流快速", "包装完好", "操作简单", "咖啡香浓", "噪音偏大"]

Input: "软件界面很乱，找不到功能入口，客服响应慢，但是价格便宜，功能还挺多"
Output: ["界面混乱", "入口难找", "客服慢", "价格实惠", "功能丰富"]

Now, process the following:
Input: "培训课程内容很扎实，老师讲解清晰，但是课程安排太紧凑了，互动时间少，价格有点贵"
Output:`,
  },
  "meta-prompting": {
    name: "元提示",
    nameEn: "Meta-Prompting",
    description: "提示词的提示词——让AI帮你写更好的提示词",
    bestFor: ["prompt-optimization", "prompt-generation", "advanced-users"],
    components: ["Goal(目标)", "Requirements(要求)", "Constraints(约束)", "Output(输出)"],
    template: `Goal: {{你想让AI帮你生成的提示词的目标}}
Requirements: {{对提示词的要求——框架/结构/风格}}
Constraints: {{限制——长度/复杂度}}
Output: {{输出格式——提示词本身+解释}}`,
    example: `Goal: 帮我生成一个提示词，用于让AI扮演一位专业的面试教练
Requirements: 使用LangGPT框架结构，包含角色设定、技能列表、面试流程、评估标准
Constraints: 提示词长度在800-1200字，适合复制粘贴直接使用
Output: 
1. 完整的提示词文本
2. 为什么这个提示词有效的解释（3-5点）
3. 使用建议（如何根据具体岗位调整）`,
  },
  "security-audit": {
    name: "安全审计",
    nameEn: "Security Audit",
    description: "系统化安全评估框架，适用于漏洞扫描、合规检查、风险分析",
    bestFor: [
      "security-audit",
      "compliance",
      "vulnerability-assessment",
      "risk-analysis",
      "penetration-testing",
    ],
    components: [
      "Scope(范围)",
      "Assets(资产)",
      "Threats(威胁)",
      "Findings(发现)",
      "Recommendations(建议)",
      "Remediation(修复)",
    ],
    template: `Scope: {{审计范围——系统/模块/时间周期}}
Assets: {{资产清单——需要保护的资源/数据/接口}}
Threats: {{威胁模型——已知风险/攻击向量/合规要求}}
Findings: {{审计发现——按严重程度分类的问题}}
Recommendations: {{修复建议——优先级排序的解决方案}}
Remediation: {{修复计划——时间表/责任人/验证方式}}`,
    example: `Scope: 对电商平台的支付模块进行安全审计，覆盖API接口、数据库、第三方支付集成
Assets: 
- 用户支付信息（PCI DSS范围）
- 订单交易记录
- 支付网关API密钥
- 退款/对账接口
Threats:
- OWASP API Top 10（ especially BOLA, Broken Auth）
- 支付欺诈和退款滥用
- 数据泄露（符合GDPR/PCI DSS）
Findings:
- [高危] 订单查询接口未做速率限制，可被暴力遍历（IDOR风险）
- [中危] 支付回调未验证签名，存在伪造回调风险
- [低危] 日志中记录了完整的卡号PAN，违反PCI DSS
Recommendations:
1. 订单接口添加用户级权限校验+速率限制（P0，3天）
2. 支付回调增加HMAC-SHA256签名验证（P0，5天）
3. 日志脱敏处理，仅保留卡号后4位（P1，2周）
Remediation:
- 负责人：安全团队+后端团队
- 验证：渗透测试复测+代码审计
- 时间表：高危问题1周内修复，中危2周内，低危1个月内`,
  },
  "multi-translate": {
    name: "跨文化翻译",
    nameEn: "Cross-Cultural Translate",
    description: "超越字面翻译的跨文化本地化框架，适配语境、习惯和文化差异",
    bestFor: [
      "translation",
      "localization",
      "multilingual",
      "content-adaptation",
      "global-marketing",
    ],
    components: [
      "Source(源内容)",
      "Target(目标市场)",
      "Context(语境)",
      "Tone(语气)",
      "Cultural(文化)",
      "Output(输出)",
    ],
    template: `Source: {{原始内容——待翻译的文本/段落/文档}}
Target: {{目标语言和市场——如"日本B2B SaaS市场"}}
Context: {{使用场景——产品界面/营销文案/法律条款/客服话术}}
Tone: {{语气要求——正式/ casual /幽默/权威}}
Cultural: {{文化适配要点——禁忌/双关/本地习惯表达/度量单位}}
Output: {{输出格式——对照表/纯译文/注释版}}`,
    example: `Source: "Get started for free. No credit card required. Upgrade anytime."
Target: 日本B2B SaaS市场（面向中小企业主）
Context: SaaS产品首页CTA按钮文案
Tone: 专业、礼貌、值得信赖，略带紧迫感但不过度推销
Cultural: 
- 避免"免费"过于直接的表述，日本人更信任"お試し"（试用）概念
- "credit card"直译生硬，改用"お支払い情報の登録不要"
- "Upgrade anytime"强调灵活性而非催促，用"いつでもご変更いただけます"
Output: 
| 原文 | 译文 | 备注 |
|------|------|------|
| Get started for free | 無料でお試し開始 | 弱化"免费"，强调"试用" |
| No credit card required | お支払い情報の登録は不要です | 更礼貌的商务表达 |
| Upgrade anytime | いつでもプラン変更が可能です | 强调用户主导权 |`,
  },
  "scientific-experiment": {
    name: "实验设计",
    nameEn: "Scientific Experiment",
    description: "严谨的科研实验设计框架，覆盖假设、变量控制、方法论和结果分析",
    bestFor: [
      "scientific-research",
      "experiment-design",
      "hypothesis-testing",
      "data-analysis",
      "academic-writing",
    ],
    components: [
      "Hypothesis(假设)",
      "Variables(变量)",
      "Methodology(方法)",
      "Protocol(协议)",
      "Analysis(分析)",
      "Conclusion(结论)",
    ],
    template: `Hypothesis: {{研究假设——可证伪的预测}}
Variables:
- Independent(自变量): {{你主动改变的变量}}
- Dependent(因变量): {{你测量的结果}}
- Controlled(控制变量): {{保持不变的变量}}
Methodology: {{研究方法——实验/调查/模拟/文献综述}}
Protocol: {{实验步骤——详细操作流程}}
Analysis: {{数据分析计划——统计方法/工具/显著性水平}}
Conclusion: {{预期结论——如何判断假设成立/不成立}}`,
    example: `Hypothesis: 将个性化推荐算法从协同过滤升级为深度学习模型，可使电商转化率提升至少15%
Variables:
- Independent: 推荐算法类型（协同过滤 vs 深度神经网络）
- Dependent: 转化率（点击购买/浏览商品）、用户停留时长、客单价
- Controlled: 流量来源比例、商品池、UI布局、促销活动
Methodology: A/B测试（随机对照实验），持续4周
Protocol:
1. 将用户随机分为两组（各50%，n≥10000）
2. 对照组使用现有协同过滤算法
3. 实验组使用新DNN模型（Embedding+注意力机制）
4. 每日监控核心指标，第7天进行中期分析
5. 第28天完成最终数据收集
Analysis: 
- 统计方法：双样本t检验比较转化率差异
- 显著性水平：α=0.05
- 工具：Python(scipy.stats) + 内部数据平台
- 额外分析：分群分析（新老用户/高价值用户）
Conclusion: 若实验组转化率提升≥15%且p<0.05，则接受假设并全量上线；若提升5-15%，评估ROI后再决定；若<5%，分析模型缺陷并回退`,
  },
  "medical-diagnosis": {
    name: "临床辅助",
    nameEn: "Clinical Assist",
    description: "结构化临床分析框架，辅助鉴别诊断、检查规划和治疗方案评估（非替代医生）",
    bestFor: [
      "medical-diagnosis",
      "clinical-decision",
      "case-analysis",
      "treatment-planning",
      "health-education",
    ],
    components: [
      "History(病史)",
      "Symptoms(症状)",
      "Differential(鉴别诊断)",
      "Tests(检查建议)",
      "Analysis(分析)",
      "Plan(方案)",
    ],
    template: `History: {{患者基本信息和病史——年龄/性别/既往病史/用药史/过敏史}}
Symptoms: {{主诉和现病史——症状描述/持续时间/严重程度/加重缓解因素}}
Differential: {{鉴别诊断——按可能性排序的候选疾病，含支持点和排除点}}
Tests: {{建议检查——确诊所需的实验室/影像/功能检查}}
Analysis: {{综合分析——最可能的诊断及依据，不确定性说明}}
Plan: {{管理方案——治疗原则/用药建议/随访计划/转诊指征}}`,
    example: `History: 52岁男性，高血压病史5年（服用氨氯地平），2型糖尿病3年（服用二甲双胍），无药物过敏，父亲有冠心病史
Symptoms: 
- 主诉：胸骨后压榨性疼痛3小时，放射至左肩
- 现病史：今晨散步时突发胸痛，伴出汗、恶心，休息未缓解
- 无呼吸困难、无晕厥
Differential:
1. 急性冠脉综合征（STEMI/NSTEMI）— 支持：典型胸痛、放射痛、出汗；排除需ECG+肌钙蛋白
2. 主动脉夹层 — 支持：高血压病史；不支持：疼痛性质为压榨非撕裂、无背部放射
3. 肺栓塞 — 支持：出汗、恶心；不支持：无呼吸困难、无DVT危险因素
4. 胃食管反流 — 不支持：休息不缓解、伴出汗（血管迷走症状）
Tests:
- 紧急：12导联ECG、肌钙蛋白I/T、心肌酶谱、血常规、电解质
- 后续：超声心动图、冠脉CTA（如ECG无ST抬高但肌钙蛋白阳性）
Analysis: 
- 最可能诊断：急性冠脉综合征（NSTEMI可能性大，需ECG确认是否STEMI）
- 依据：典型缺血性胸痛三联征（胸骨后、压榨性、放射左肩）+ 血管迷走症状
- 不确定性：需等待ECG和肌钙蛋白结果区分UA/NSTEMI/STEMI
Plan:
- 立即：阿司匹林300mg嚼服（如无禁忌）、建立静脉通路、心电监护
- 治疗：根据ECG结果决定是否急诊PCI；NSTEMI高危者48小时内冠脉造影
- 随访：出院后心内科门诊，双联抗血小板12个月，血脂目标LDL-C<1.4
- 转诊指征：ECG示ST抬高→立即启动胸痛中心绿色通道`,
  },
  "legal-analysis": {
    name: "法律分析",
    nameEn: "Legal Analysis",
    description: "结构化法律研究框架，适用于案例检索、法规解读、合同审查和合规评估",
    bestFor: [
      "legal-research",
      "case-analysis",
      "contract-review",
      "regulatory-compliance",
      "risk-assessment",
    ],
    components: [
      "Issue(争议焦点)",
      "Rules(法规依据)",
      "Facts(事实梳理)",
      "Analysis(法律分析)",
      "Conclusion(结论)",
      "Recommendation(建议)",
    ],
    template: `Issue: {{法律争议焦点——需要解决的核心法律问题}}
Rules: {{适用法规——法律条文/司法解释/判例/行业规范}}
Facts: {{关键事实——时间线/当事人/行为/证据}}
Analysis: {{法律分析——要件分析/责任认定/风险点识别}}
Conclusion: {{结论——法律意见/责任判断/结果预测}}
Recommendation: {{行动建议——具体措施/风险防范/争议解决路径}}`,
    example: `Issue: 员工离职后利用前雇主客户名单开展竞争业务，是否构成商业秘密侵权？公司可主张哪些救济？
Rules:
- 《反不正当竞争法》第9条（商业秘密定义及侵权行为）
- 《最高人民法院关于审理侵犯商业秘密民事案件适用法律若干问题的规定》
- 判例：(2021)最高法知民终XXX号（客户名单构成商业秘密的认定标准）
Facts:
- 员工A任职销售总监3年，签署保密协议和竞业限制协议（期限2年，补偿金按月支付）
- A离职后1个月内成立竞争公司，6个月内签约原公司15家客户（占原公司该类客户30%）
- 原公司客户名单包含联系方式、交易习惯、价格敏感度等深度信息，存储于CRM系统并有权限控制
Analysis:
1. 客户名单是否构成商业秘密？
   - 秘密性：深度信息非公开渠道可获取 ✓
   - 价值性：能带来竞争优势和交易机会 ✓
   - 保密措施：CRM权限控制+保密协议 ✓
   → 构成商业秘密
2. 员工行为是否构成侵权？
   - 违反保密义务，使用/披露商业秘密 ✓
   - 明知或应知商业秘密仍获取/使用 ✓
3. 竞业限制是否同时适用？
   - 公司已支付补偿金，协议有效
   - 可同时主张违约责任和侵权责任
Conclusion:
- 客户名单构成商业秘密，员工行为构成侵权
- 可同时提起违约之诉（竞业限制）和侵权之诉（商业秘密）
- 预估可主张损害赔偿（实际损失或侵权获利）
Recommendation:
1. 立即：申请行为保全（禁止继续接触客户）、证据保全（冻结CRM操作日志）
2. 诉讼：向知识产权法院提起商业秘密侵权诉讼+竞业限制违约仲裁
3. 取证：委托公证处对竞争公司网站、客户变动进行证据固定
4. 预防：完善离职审计流程，核心岗位增加脱密期管理`,
  },
  "persona-plus": {
    name: "角色增强",
    nameEn: "Persona Plus",
    description: "深度角色扮演框架，支持多角色对话、性格层次和动态情感变化",
    bestFor: [
      "roleplay",
      "creative-writing",
      "storytelling",
      "education",
      "therapy",
      "interview-practice",
    ],
    components: [
      "Identity(身份)",
      "Background(背景)",
      "Personality(性格)",
      "Voice(表达方式)",
      "Goals(目标)",
      "Constraints(约束)",
    ],
    template: `Identity: {{角色身份——姓名/职业/年龄/社会地位}}
Background: {{详细背景——成长经历/教育/关键人生事件/当前处境}}
Personality: {{性格特征——核心特质/优缺点/MBTI/九型人格倾向}}
Voice: {{表达方式——口头禅/语气/语言风格/身体语言/反应模式}}
Goals: {{角色目标——短期动机/长期追求/隐藏 agenda}}
Constraints: {{行为约束——不能做的事/不能说的话/底线/偏见}}`,
    example: `Identity: 李建国，58岁，传统制造业企业老板，家族企业第二代继承人
Background: 
- 18岁进父亲工厂从基层干起，35岁接班
- 工厂从30人发展到800人，主营精密五金件
- 近两年订单下滑30%，儿子留学回来要推动数字化转型，两人冲突不断
- 信奉"实实在在做事"，对互联网和AI持怀疑态度
Personality:
- 核心特质：务实、固执、重人情、面子观念强
- 优点：决策果断、对老员工有情有义、产品质量控
- 缺点：难以接受新事物、容易情绪化、独裁式管理
- 倾向：ESTJ，压力下的反应是强化控制
Voice:
- 口头禅："我做了三十年了...""你们年轻人懂什么""钱不是大风刮来的"
- 语气：嗓门大、语速快、激动时拍桌子
- 身体语言：习惯性叉腰、皱眉、点烟思考
Goals:
- 表面：保住工厂不倒，维持现有订单
- 深层：证明自己的能力，不想在儿子面前"输了"
- 隐藏：害怕被时代淘汰，但绝不承认
Constraints:
- 绝不会在员工面前承认错误或示弱
- 不谈 emotions，认为"男人流血不流泪"
- 不裁员（对老员工承诺过），即使亏损
- 绝不接受完全关闭工厂的任何建议`,
  },
  "compare-contrast": {
    name: "对比分析",
    nameEn: "Compare & Contrast",
    description: "简洁高效的对比框架，适用于方案评估、产品选型、优劣势分析",
    bestFor: [
      "comparison",
      "decision-making",
      "product-evaluation",
      "proposal-review",
      "vendor-selection",
    ],
    components: [
      "Subject A(对象A)",
      "Subject B(对象B)",
      "Criteria(标准)",
      "Comparison(对比)",
      "Verdict(结论)",
    ],
    template: `Subject A: {{第一个比较对象——方案/产品/观点}}
Subject B: {{第二个比较对象}}
Criteria: {{评估标准——按重要性排序的对比维度}}
Comparison: {{逐项对比——相同点/不同点/优劣势}}
Verdict: {{结论——推荐选择及理由/适用场景建议}}`,
    example: `Subject A: 自建 Kubernetes 集群（on-premise）
Subject B: 托管云服务（AWS EKS / Azure AKS）
Criteria: 成本、运维复杂度、扩展性、安全性、合规要求
Comparison:
| 维度 | 自建K8s | 托管EKS/AKS |
|------|---------|-------------|
| 初期成本 | 高（硬件+团队） | 低（按量付费） |
| 运维复杂度 | 高（需专职SRE团队） | 低（托管控制平面） |
| 扩展性 | 灵活但慢（采购周期） | 快（自动扩缩容） |
| 定制化 | 完全可控 | 受限于云厂商能力 |
| 合规 | 适合数据不出境场景 | 需评估云厂商认证 |

相同点：都支持容器编排、服务发现、负载均衡
不同点：责任边界（自建全栈负责 vs 云厂商管控制平面）
Verdict:
- 推荐托管云：初创公司/快速迭代场景/无专职运维团队
- 推荐自建：金融/政府等强合规场景/已有成熟运维团队/成本优化到极致
- 混合方案：核心系统自建，边缘/非核心用托管（渐进式迁移）`,
  },
  brainstorming: {
    name: "头脑风暴",
    nameEn: "Brainstorming",
    description: "创意发散框架，快速生成大量想法并进行初步筛选",
    bestFor: [
      "ideation",
      "creative-thinking",
      "problem-solving",
      "innovation",
      "workshop",
    ],
    components: [
      "Challenge(挑战)",
      "Diverge(发散)",
      "Cluster(聚类)",
      "Evaluate(评估)",
      "Select(选择)",
    ],
    template: `Challenge: {{核心挑战——需要解决什么问题/达成什么目标}}
Diverge: {{发散阶段——尽可能多的想法，不评判}}
Cluster: {{聚类——将相似想法归类/命名}}
Evaluate: {{评估——对每个类别的可行性/影响力/成本打分}}
Select: {{选择——Top 3优先级想法及下一步行动}}`,
    example: `Challenge: 如何让我们SaaS产品的免费用户转化率从5%提升到15%？
Diverge:
1. 在免费版中增加"限时解锁"高级功能体验
2. 推出推荐奖励：推荐1人双方各得1个月高级版
3. 优化 onboarding，在Day 3推送价值提醒
4. 为接近用量上限的用户发个性化升级建议
5. 增加社区功能，付费用户专属社群
6. 推出"团队版"最低档位，降低决策门槛
7. AI助手功能仅限付费版
8. 提供按月付费选项（现为仅年付）
9. 增加退款保障（30天无理由）
10. 与互补产品联合促销
11. 免费用户到期前7天每日邮件提醒
12. 增加客户成功案例在app内展示
Cluster:
- 产品机制类：#1, #3, #7, #12（改变产品本身）
- 定价策略类：#6, #8, #9, #10（改变价格和购买方式）
- 增长营销类：#2, #4, #5, #11（推广和运营手段）
Evaluate:
| 类别 | 可行性 | 影响力 | 成本 | 总分 |
|------|--------|--------|------|------|
| 产品机制 | 7 | 9 | 6 | 22 |
| 定价策略 | 9 | 7 | 5 | 21 |
| 增长营销 | 8 | 6 | 7 | 21 |
Select:
1. 优化onboarding + 用量上限提醒（产品机制，预期+3%转化）
2. 推出月付选项 + 团队版入门档位（定价策略，预期+2.5%转化）
3. 推荐奖励计划（增长营销，预期+1.5%转化）
下一步：两周内完成onboarding优化A/B测试设计`,
  },
  "crisis-response": {
    name: "危机应对",
    nameEn: "Crisis Response",
    description: "系统化危机管理框架，适用于公关危机、安全事件、运营故障等紧急场景",
    bestFor: [
      "crisis-management",
      "pr-response",
      "incident-handling",
      "damage-control",
      "stakeholder-communication",
    ],
    components: [
      "Situation(现状)",
      "Stakeholders(利益相关方)",
      "Response(应对策略)",
      "Messaging(信息传递)",
      "Timeline(时间线)",
      "Recovery(恢复计划)",
    ],
    template: `Situation: {{危机现状——发生了什么/影响范围/已知事实/未知信息}}
Stakeholders: {{利益相关方——受影响的群体及其关切点}}
Response: {{应对策略——立即措施/短期行动/长期修复}}
Messaging: {{信息传递——对外声明口径/对内沟通/社交媒体回应}}
Timeline: {{时间线——关键节点和deadline}}
Recovery: {{恢复计划——如何重建信任/预防措施}}`,
    example: `Situation: 
- 事件：某SaaS公司数据库配置错误导致2000家企业客户数据可公开访问，持续72小时
- 影响：约50万条用户记录（邮箱、公司名、部分手机号）暴露
- 已知：错误配置源于上周部署的缓存优化，安全团队已修复
- 未知：是否有恶意爬取，是否已有数据泄露利用
Stakeholders:
- 客户：数据安全担忧、合规风险（GDPR/SOX）、业务影响
- 媒体：放大报道倾向、竞品可能利用
- 员工：士气、对管理层的信任
- 投资者：股价/估值影响、监管调查风险
- 监管：可能的数据保护调查
Response:
- 立即（0-4h）：修复漏洞、启动内部调查、通知核心客户
- 短期（24h）：发布公开声明、向监管机构报备、提供信用监控服务
- 长期（1-4周）：第三方安全审计、完善DevSecOps流程、客户补偿方案
Messaging:
- 对外："我们发现了配置问题并已立即修复。初步调查显示未发生恶意利用。我们正在通知受影响用户并提供支持。"
- 对内：透明沟通事件原因、不追究个人责任、强调系统性改进
- 社交媒体：主动在Twitter/微博发布，避免被动回应，每条回复2小时内
Timeline:
- T+4h: CEO邮件通知所有客户
- T+24h: 公开博客文章 + 媒体QA准备
- T+72h: 第三方审计启动
- T+2周: 安全改进报告发布
- T+1月: 客户回访和满意度调查
Recovery:
- 信任重建：邀请客户参与安全改进委员会、定期发布透明度报告
- 预防：引入自动化安全配置检查、渗透测试常态化、红蓝对抗演练`,
  },
  "data-storytelling": {
    name: "数据叙事",
    nameEn: "Data Storytelling",
    description: "将数据转化为引人入胜的故事，适合汇报、演讲、洞察传达",
    bestFor: [
      "data-presentation",
      "business-report",
      "insight-communication",
      "executive-summary",
      "dashboard-narrative",
    ],
    components: [
      "Audience(受众)",
      "Hook(钩子)",
      "Data(数据)",
      "Insight(洞察)",
      "Visual(可视化)",
      "Action(行动)",
    ],
    template: `Audience: {{受众画像——决策者/执行层/外部客户/技术团队}}
Hook: {{钩子——吸引注意力的核心发现或反差}}
Data: {{数据支撑——关键指标/趋势/对比/异常点}}
Insight: {{洞察——数据背后的"so what"——原因/影响/机会}}
Visual: {{可视化建议——图表类型/叙事顺序/强调重点}}
Action: {{行动呼吁——基于数据的明确建议}}`,
    example: `Audience: 公司高管团队（CEO、CFO、COO），非技术背景，关注ROI和增长
Hook: "我们的获客成本在过去6个月上升了47%，但有一个渠道的成本反而下降了60%——这是扭转局面的关键"
Data:
- 整体CAC从￥320上升到￥470（+47%）
- 付费搜索CAC从￥280涨到￥520（+86%）
- 内容营销CAC从￥450降到￥180（-60%）
- 内容营销带来的MQL占比从15%提升到35%
- 但内容营销团队只有3人，产能已饱和
Insight:
- 付费搜索竞争加剧（竞品涌入+关键词涨价）是CAC上升主因
- 内容营销展现杠杆效应：高信任度内容降低决策摩擦，带来更高转化
- 机会窗口：如果增加内容产能，理论上可将整体CAC降低20-30%
- 风险：内容见效周期3-6个月，需要短期和长期策略平衡
Visual:
1. 瀑布图：CAC构成变化（展示各渠道贡献）
2. 趋势线：6个月CAC走势（突出拐点）
3. 气泡图：各渠道成本vs量vs增长率（发现内容营销"低垂果实"）
4. 对比柱图：当前vs预测（增加内容投入后的情景分析）
Action:
- 立即：将内容营销团队从3人扩至6人（预算￥150万/年）
- 短期（1月）：启动高管内容IP计划，CEO每周1篇行业洞察
- 中期（3月）：建立内容中台，支持销售团队个性化内容库
- 预期：Q4整体CAC降至￥380，内容渠道占比提升至50%`,
  },
};

export function recommendFramework(
  domain: string,
  complexity: string,
  intent: string,
  slashCmd?: SlashCommand | null,
): FrameworkRecommendation[] {
  const recommendations: FrameworkRecommendation[] = [];

  if (slashCmd) {
    const framework = getFrameworkByKey(slashCmd.defaultFramework);
    if (framework) {
      recommendations.push({
        framework: slashCmd.defaultFramework,
        frameworkName: framework.name,
        confidence: 0.95,
        reason: `基于 /${slashCmd.command.slice(1)} 指令推荐`,
      });
    }
  }

  const intentLower = intent.toLowerCase();
  const baseDomain = domain.split("-")[0];

  for (const [key, framework] of Object.entries(FRAMEWORKS)) {
    let score = 0;

    if (
      framework.bestFor.includes(domain) ||
      framework.bestFor.includes(baseDomain)
    ) {
      score += 3;
    }

    if (complexity === "simple" && ["rtf", "care", "ape", "tag", "compare-contrast", "brainstorming"].includes(key)) {
      score += 2;
    }

    if (
      complexity === "medium" &&
      [
        DEFAULT_FRAMEWORK_KEY,
        "risen",
        "crispe",
        "broke",
        "scqa",
        "bab",
        "smart",
        "prompt",
        "multi-translate",
        "persona-plus",
        "crisis-response",
        "data-storytelling",
      ].includes(key)
    ) {
      score += 2;
    }

    if (
      complexity === "complex" &&
      [
        "chain-of-thought",
        "tree-of-thoughts",
        "react",
        "langgpt",
        "ape-optimized",
        "self-refine",
        "meta-prompting",
        "security-audit",
        "scientific-experiment",
        "medical-diagnosis",
        "legal-analysis",
      ].includes(key)
    ) {
      score += 2;
    }

    if (intentLower.includes("步骤") || intentLower.includes("流程") || intentLower.includes("process")) score += 1;
    if (intentLower.includes("代码") || intentLower.includes("code") || intentLower.includes("编程")) score += 1;
    if (intentLower.includes("分析") || intentLower.includes("analysis")) score += 1;
    if (intentLower.includes("写") || intentLower.includes("write") || intentLower.includes("创作")) score += 1;
    if (intentLower.includes("agent") || intentLower.includes("智能体") || intentLower.includes("工具")) score += 1;
    if (intentLower.includes("优化") || intentLower.includes("改进") || intentLower.includes("迭代")) score += 1;
    if (intentLower.includes("设计") || intentLower.includes("架构")) score += 1;

    if (score > 0) {
      recommendations.push({
        framework: key,
        frameworkName: framework.name,
        confidence: Math.min(score / 8, 0.98),
        reason: framework.description,
      });
    }
  }

  const seen = new Set<string>();
  const unique: FrameworkRecommendation[] = [];

  for (const recommendation of recommendations.sort((a, b) => b.confidence - a.confidence)) {
    if (!seen.has(recommendation.framework)) {
      seen.add(recommendation.framework);
      unique.push(recommendation);
    }
  }

  return unique;
}

export function getAllFrameworks() {
  return Object.entries(FRAMEWORKS).map(([key, framework]) => ({
    key,
    name: framework.name,
    nameEn: framework.nameEn,
    description: framework.description,
    components: framework.components,
    bestFor: framework.bestFor,
  }));
}

export function getFrameworkByKey(key: string): Framework | null {
  return FRAMEWORKS[key] || null;
}

export function getFrameworkCount(): number {
  return Object.keys(FRAMEWORKS).length;
}
