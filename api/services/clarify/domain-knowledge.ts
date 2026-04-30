/**
 * P0-2: 领域知识注入系统 (Domain Knowledge Injection)
 *
 * 每个领域 ≥5 条最佳实践/追问模板，用于指导 Clarify 追问生成。
 */

export interface DomainKnowledge {
  /** 领域最佳实践 */
  bestPractices: string[];
  /** 常见追问模板（追问生成器会参考这些） */
  commonQuestions: string[];
  /** 关键信息点（遗漏这些信息会显著降低输出质量） */
  keyInformation: string[];
  /** 默认框架推荐 */
  defaultFramework: string;
  /** 该领域常见的输出格式 */
  outputFormats: string[];
  /** 领域特定术语（用于提升追问精准度） */
  terminology: string[];
}

const KNOWLEDGE_BASE: Record<string, DomainKnowledge> = {
  "content-marketing": {
    bestPractices: [
      "明确目标受众画像（年龄、性别、职业、兴趣、痛点）",
      "区分内容生命周期（种草期/转化期/复购期）",
      "量化 KPI（曝光量、点击率、转化率、ROI）",
      "匹配平台调性（小红书重颜值/抖音重节奏/B站重深度）",
      "统一品牌声线（专业/亲切/幽默/高端）",
      "设定 CTA 明确（关注/购买/转发/评论）",
      "控制篇幅与信息密度，避免认知过载",
    ],
    commonQuestions: [
      "目标受众是谁？请描述他们的年龄、职业和兴趣",
      "内容发布的平台是什么？不同平台的调性差异很大",
      "这次内容的核心目标是什么（品牌曝光/获客/转化/留存）？",
      "期望的字数或时长范围是多少？",
      "品牌调性偏好是什么（专业/活泼/高端/亲民）？",
      "是否有必须包含的品牌信息或产品卖点？",
    ],
    keyInformation: ["目标受众", "发布平台", "内容目标", "品牌调性", "字数/时长"],
    defaultFramework: "co-star",
    outputFormats: ["社交媒体帖子", "长文案", "短视频脚本", "邮件", "Landing Page"],
    terminology: ["CTA", "KPI", "ROI", "UV", "PV", "CTR", "CVR", "种草", "裂变", "私域"],
  },

  programming: {
    bestPractices: [
      "明确技术栈和版本（语言、框架、库、运行时）",
      "区分生产环境与开发环境约束",
      "考虑性能要求（QPS、响应时间、内存限制）",
      "定义输入输出契约（API 接口、数据格式、边界条件）",
      "遵循团队代码规范（lint、格式化、命名约定）",
      "考虑异常处理和错误恢复策略",
      "评估安全要求（鉴权、加密、防注入）",
    ],
    commonQuestions: [
      "使用什么编程语言和技术栈？请包括版本号",
      "目标运行环境是什么（浏览器/Node.js/移动端/嵌入式）？",
      "有没有性能约束（响应时间、并发量、内存上限）？",
      "输入数据的格式和范围是什么？",
      "需要遵循特定的代码规范或架构模式吗？",
      "异常和错误应该如何处理？",
    ],
    keyInformation: ["技术栈", "运行环境", "性能约束", "输入输出", "代码规范"],
    defaultFramework: "risen",
    outputFormats: ["函数代码", "类/模块", "API 接口定义", "架构文档", "测试用例"],
    terminology: ["REST", "GraphQL", "gRPC", "CI/CD", "TDD", "DDD", "微服务", "API", "SDK", "ORM"],
  },

  education: {
    bestPractices: [
      "明确学习者画像（年龄、先验知识、学习目标）",
      "区分认知层次（记忆/理解/应用/分析/评价/创造）",
      "设计互动环节（提问、练习、讨论、项目）",
      "控制信息粒度（每节课 1-3 个核心概念）",
      "提供多样化学习资源（文字/视频/图表/案例）",
      "设置形成性评估（小测、作业、反馈）",
      "考虑学习场景（线上/线下、同步/异步、时长）",
    ],
    commonQuestions: [
      "目标学习者是谁？他们的年龄和知识水平如何？",
      "教学目标是什么（知识传授/技能训练/态度培养）？",
      "教学场景是什么（线上直播/录播/线下课堂）？",
      "课程时长和频次如何安排？",
      "需要包含哪些互动或评估环节？",
      "是否有必须覆盖的知识点或教材？",
    ],
    keyInformation: ["学习者画像", "教学目标", "教学场景", "时长安排", "评估方式"],
    defaultFramework: "crispe",
    outputFormats: ["教案", "课件大纲", "练习题", "讲义", "微课脚本"],
    terminology: ["Bloom", "形成性评估", "总结性评估", " scaffolding", "差异化教学", "核心素养", "课标"],
  },

  "data-analysis": {
    bestPractices: [
      "明确分析目标和业务问题（不要先做分析再找问题）",
      "定义数据来源、质量和更新频率",
      "区分描述性/诊断性/预测性/规范性分析",
      "选择合适的可视化方式（趋势用折线/对比用柱状/占比用饼图）",
      "关注统计显著性和样本偏差",
      "确保结果可解释、可行动（Actionable Insights）",
      "保护数据隐私和合规要求（脱敏、权限）",
    ],
    commonQuestions: [
      "分析的核心业务问题是什么？",
      "数据来源是什么？数据质量和样本量如何？",
      "分析的时间范围是什么？",
      "期望的输出形式（报表/dashboard/洞察报告）？",
      "结果的使用者是谁？他们的数据素养如何？",
      "有没有需要特别关注的指标或维度？",
    ],
    keyInformation: ["业务问题", "数据来源", "时间范围", "输出形式", "受众"],
    defaultFramework: "risen",
    outputFormats: ["数据报告", "Dashboard", "分析图表", "预测模型", "SQL查询"],
    terminology: ["KPI", "DAU", "MAU", "LTV", "CAC", "ROI", "漏斗", "留存", "A/B测试", "归因", "显著性"],
  },

  legal: {
    bestPractices: [
      "明确适用法律管辖区域（国家/地区/行业）",
      "区分合同类型（买卖/服务/劳动/保密/授权）",
      "识别关键条款（付款、交付、违约、争议解决、知识产权）",
      "考虑不可抗力、终止条件和保密义务",
      "确保条款可执行（不违反强制性法律规定）",
      "注意语言表述的精确性（避免歧义）",
      "评估风险分配和责任上限",
    ],
    commonQuestions: [
      "适用的法律管辖区域是哪里？",
      "合同双方的身份和地位是什么？",
      "合同类型是什么（买卖/服务/劳动/保密）？",
      "付款方式和交付条件是什么？",
      "违约责任和争议解决方式如何约定？",
      "是否有知识产权或保密条款的特殊要求？",
    ],
    keyInformation: ["管辖区域", "合同类型", "双方身份", "付款交付", "违约责任"],
    defaultFramework: "care",
    outputFormats: ["合同条款", "法律意见书", "合规清单", "风险报告", "协议模板"],
    terminology: ["管辖", "违约", "不可抗力", "保密", "知识产权", "争议解决", "免责", "担保", "对价"],
  },

  "image-gen": {
    bestPractices: [
      "明确画面主体和场景描述（人物/物体/环境）",
      "指定艺术风格（写实/卡通/油画/赛博朋克/国风）",
      "控制构图和视角（特写/全景/俯视/仰视）",
      "定义光线和氛围（自然光/逆光/暗调/明亮）",
      "指定色彩和色调（冷暖/饱和度/对比度）",
      "考虑输出用途（线上/印刷/社交媒体头像）",
      "提供参考图或参考艺术家风格",
    ],
    commonQuestions: [
      "画面的主体是什么？请描述人物/物体/场景",
      "期望的艺术风格是什么（写实/卡通/油画/赛博朋克）？",
      "画面的构图和视角偏好是什么？",
      "光线和氛围要求（明亮/暗调/逆光/自然光）？",
      "色彩倾向是什么（暖色/冷色/高饱和/低饱和）？",
      "图片的用途和尺寸要求是什么？",
    ],
    keyInformation: ["画面主体", "艺术风格", "构图视角", "光线氛围", "色彩倾向"],
    defaultFramework: "rtf",
    outputFormats: ["文生图Prompt", "图生图Prompt", "风格描述", "构图说明", "配色方案"],
    terminology: ["Prompt", "Negative Prompt", "CFG Scale", "Seed", "LoRA", "Checkpoint", "ControlNet", "Inpainting"],
  },

  "video-gen": {
    bestPractices: [
      "明确视频类型和用途（宣传片/教程/娱乐/Vlog）",
      "控制时长和信息密度（短视频 15-60s/中视频 1-5min）",
      "设计开场钩子（前 3 秒抓住注意力）",
      "规划节奏和转场（快剪/慢节奏/跳切/淡入淡出）",
      "统一视觉风格（色调、字体、动效规范）",
      "考虑音频设计（旁白/音乐/音效/字幕）",
      "适配目标平台（横屏/竖屏/方形）",
    ],
    commonQuestions: [
      "视频的类型和用途是什么（宣传片/教程/Vlog）？",
      "目标时长是多少？",
      "目标受众是谁？",
      "视频风格偏好是什么（快节奏/舒缓/专业/娱乐）？",
      "是否有品牌元素需要融入（logo/配色/字体）？",
      "输出格式和分辨率要求是什么？",
    ],
    keyInformation: ["视频类型", "时长", "目标受众", "风格偏好", "平台要求"],
    defaultFramework: "risen",
    outputFormats: ["视频脚本", "分镜脚本", "拍摄计划", "剪辑大纲", "配音稿"],
    terminology: ["分镜", "转场", "B-roll", "画外音", "蒙太奇", "关键帧", "帧率", "分辨率", "画幅"],
  },

  "creative-writing": {
    bestPractices: [
      "明确体裁和风格（科幻/奇幻/悬疑/言情/现实主义）",
      "设定核心冲突和主题（人物想要什么/阻碍是什么）",
      "设计有弧光的角色（起点→转变→终点）",
      "控制叙事视角（第一人称/第三人称有限/全知）",
      "规划故事结构（三幕式/英雄之旅/起承转合）",
      "营造独特的世界氛围（视觉、听觉、嗅觉细节）",
      "考虑目标读者和出版平台（网文/实体/杂志）",
    ],
    commonQuestions: [
      "作品的体裁和风格是什么（科幻/悬疑/言情/现实主义）？",
      "核心冲突和主题是什么？",
      "主要角色的特点和成长弧线是什么？",
      "故事的时代背景和世界观设定是什么？",
      "目标读者群体和预期字数是多少？",
      "叙事视角偏好（第一人称/第三人称）？",
    ],
    keyInformation: ["体裁风格", "核心冲突", "角色设定", "世界观", "目标读者"],
    defaultFramework: "co-star",
    outputFormats: ["故事大纲", "人物小传", "章节细纲", "对话片段", "世界观设定"],
    terminology: ["三幕式", "英雄之旅", "人物弧光", "伏笔", "高潮", "叙事视角", "世界观", "节奏", "张力"],
  },

  "product-management": {
    bestPractices: [
      "从用户痛点出发，而非功能列表",
      "定义清晰的成功指标（北极星指标+辅助指标）",
      "区分 MVP 和完整版的功能边界",
      "考虑多端一致性（Web/App/小程序/H5）",
      "评估技术可行性和资源约束",
      "设计数据埋点以支持后续迭代决策",
      "规划灰度发布和回滚策略",
    ],
    commonQuestions: [
      "解决的核心用户痛点是什么？",
      "目标用户是谁？使用场景是什么？",
      "产品的核心功能和非核心功能分别是什么？",
      "成功指标（北极星指标）是什么？",
      "技术约束和资源限制有哪些？",
      "发布策略是什么（MVP/灰度/全量）？",
    ],
    keyInformation: ["用户痛点", "目标用户", "核心功能", "成功指标", "技术约束"],
    defaultFramework: "co-star",
    outputFormats: ["PRD", "用户故事", "原型说明", "数据埋点文档", "竞品分析"],
    terminology: ["MVP", "北极星指标", "OKR", "用户故事", "敏捷", "迭代", "灰度", "A/B测试", "漏斗", "留存"],
  },

  research: {
    bestPractices: [
      "明确研究问题和假设（可检验、可证伪）",
      "选择合适的研究方法（定量/定性/混合）",
      "确保样本代表性和统计功效",
      "遵循学术伦理（知情同意、隐私保护、利益冲突声明）",
      "规范引用和参考文献管理（APA/GB/T 7714）",
      "区分研究发现、讨论和结论的层次",
      "考虑研究的局限性和未来方向",
    ],
    commonQuestions: [
      "研究问题和核心假设是什么？",
      "采用什么研究方法（定量/定性/混合）？",
      "研究对象和样本量是什么？",
      "数据来源和收集方式是什么？",
      "论文的格式要求和引用规范是什么？",
      "研究的预期贡献和创新点是什么？",
    ],
    keyInformation: ["研究问题", "研究方法", "样本数据", "格式规范", "预期贡献"],
    defaultFramework: "chain-of-thought",
    outputFormats: ["文献综述", "研究方法", "数据分析", "论文初稿", "答辩PPT大纲"],
    terminology: ["假设", "变量", "信度", "效度", "显著性", "p值", "效应量", "样本量", "meta分析", "盲法"],
  },

  "customer-service": {
    bestPractices: [
      "明确服务场景和渠道（电话/在线聊天/邮件/社交媒体）",
      "统一服务语气和品牌调性（专业/亲切/高效）",
      "预设常见问题和标准答案（FAQ/SOP）",
      "设计情绪安抚和升级机制",
      "确保信息准确性和时效性（产品信息、政策更新）",
      "建立服务质量监控和反馈闭环",
      "考虑多语言和多地区服务需求",
    ],
    commonQuestions: [
      "服务场景和渠道是什么（电话/在线/邮件）？",
      "目标客户的特征和常见诉求是什么？",
      "服务语气和品牌调性偏好是什么？",
      "需要覆盖的常见问题和业务流程有哪些？",
      "是否有特殊的合规或隐私要求？",
      "服务响应时间和解决时效要求是什么？",
    ],
    keyInformation: ["服务渠道", "客户特征", "品牌调性", "常见问题", "时效要求"],
    defaultFramework: "care",
    outputFormats: ["客服话术", "FAQ文档", "SOP流程", "邮件模板", "投诉处理方案"],
    terminology: ["SLA", "NPS", "CSAT", "首次响应时间", "解决时长", "升级", "工单", "知识库", "话术"],
  },

  general: {
    bestPractices: [
      "明确任务的核心目标和预期产出",
      "定义目标受众和使用场景",
      "提供相关背景信息和约束条件",
      "说明期望的格式和长度",
      "指定风格偏好（正式/ casual /创意）",
    ],
    commonQuestions: [
      "你希望解决什么问题或完成什么任务？",
      "目标受众是谁？",
      "有什么必须遵守的约束或要求？",
      "期望的输出格式和长度是多少？",
      "风格偏好是什么（正式/ casual /创意）？",
    ],
    keyInformation: ["核心目标", "目标受众", "约束条件", "格式长度", "风格偏好"],
    defaultFramework: "co-star",
    outputFormats: ["文本", "列表", "表格", "结构化数据", "Markdown"],
    terminology: [],
  },
};

/**
 * 获取领域知识
 */
export function getDomainKnowledge(domain: string): DomainKnowledge {
  return KNOWLEDGE_BASE[domain] || KNOWLEDGE_BASE.general;
}

/**
 * 根据已有信息，找出缺失的关键信息
 */
export function findMissingInfo(
  domain: string,
  existingAnswers: Record<string, string>,
): string[] {
  const knowledge = getDomainKnowledge(domain);
  return knowledge.keyInformation.filter((key) => {
    const keyLower = key.toLowerCase();
    return !Object.keys(existingAnswers).some((answerKey) =>
      answerKey.toLowerCase().includes(keyLower) || keyLower.includes(answerKey.toLowerCase()),
    );
  });
}

/**
 * 获取所有领域知识条目数量（用于统计验证）
 */
export function getKnowledgeStats(): { domains: number; totalPractices: number; totalQuestions: number } {
  let totalPractices = 0;
  let totalQuestions = 0;
  for (const [domain, knowledge] of Object.entries(KNOWLEDGE_BASE)) {
    if (domain === "general") continue;
    totalPractices += knowledge.bestPractices.length;
    totalQuestions += knowledge.commonQuestions.length;
  }
  return {
    domains: Object.keys(KNOWLEDGE_BASE).length - 1, // exclude general
    totalPractices,
    totalQuestions,
  };
}
