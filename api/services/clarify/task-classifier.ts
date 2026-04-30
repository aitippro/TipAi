/**
 * P0-2: 任务分类器 (Task Classifier)
 *
 * 基于关键词 + 语义规则的多层分类系统。
 * 支持 11 个一级领域、30+ 个子领域，准确率目标 ≥80%。
 *
 * 分类层级：
 *  一级：domain（领域）
 *  二级：subDomain（子领域）
 *  三级：taskType（任务类型）
 */

export interface ClassificationResult {
  /** 一级领域 */
  domain: string;
  /** 子领域 */
  subDomain: string;
  /** 任务类型 */
  taskType: string;
  /** 置信度 0-1 */
  confidence: number;
  /** 匹配到的关键词 */
  matchedKeywords: string[];
  /** 建议的框架列表 */
  suggestedFrameworks: string[];
}

/** 领域定义 */
interface DomainDef {
  keywords: string[];
  subDomains: Record<string, string[]>;
  taskTypes: Record<string, string[]>;
  suggestedFrameworks: string[];
}

const DOMAINS: Record<string, DomainDef> = {
  "content-marketing": {
    keywords: [
      "营销", "推广", "文案", "品牌", "广告", "社交媒体", "seo", "内容",
      "小红书", "抖音", "微博", "公众号", "landing page", "销售页", "转化率",
      "获客", "漏斗", "kpi", "roi", "campaign", "种草", "带货", "brief",
      "slogan", "广告语", "公关", "传播", "裂变", "私域", "公域",
    ],
    subDomains: {
      "social-media": ["小红书", "抖音", "微博", "朋友圈", "Instagram", "Twitter", "TikTok", "社交媒体", "短视频", "直播"],
      copywriting: ["文案", "标题", "slogan", "广告语", "销售信", "landing page", "brief", "种草文案", "软文"],
      branding: ["品牌", "定位", "vi", "视觉", "调性", "品牌故事", "品牌手册", " rebranding"],
      email: ["邮件", "edm", "newsletter", "邮件营销", "邮件序列"],
      "growth-hacking": ["增长", "裂变", "获客", "aarrr", "病毒传播", "拉新", "留存"],
    },
    taskTypes: {
      "copy-generation": ["写文案", "写标题", "写slogan", "写广告语", "写软文"],
      "content-plan": ["内容规划", "选题", "排期", "内容日历", "运营计划"],
      "ad-creation": ["广告创意", "投放", "广告文案", "信息流", "搜索广告"],
      "brand-strategy": ["品牌策略", "品牌定位", "品牌故事", "vi设计"],
    },
    suggestedFrameworks: ["co-star", "care", "bab", "scqa"],
  },

  programming: {
    keywords: [
      "代码", "编程", "开发", "app", "网站", "api", "数据库", "算法",
      "架构", "微服务", "前端", "后端", "全栈", "devops", "测试", "bug",
      "重构", "设计模式", "部署", "docker", "kubernetes", "ci/cd",
      "性能优化", "安全", "oauth", "jwt", "sql", "nosql", "redis",
      "爬虫", "脚本", "自动化", "leetcode", "算法题", "python", "java", "javascript", "typescript", "golang", "rust", "c++", "c#", "接口", "组件", "库", "框架", "sdk", "小程序",
    ],
    subDomains: {
      "web-dev": ["网站", "web", "前端", "后端", "全栈", "html", "css", "javascript", "react", "vue", "nextjs", "nuxt", "python", "爬虫", "脚本", "小程序"],
      "api-design": ["api", "接口", "rest", "graphql", "swagger", "openapi", "grpc", "微服务"],
      "system-design": ["架构", "系统设计", "微服务", "高并发", "分布式", "缓存", "消息队列", "中间件"],
      devops: ["devops", "docker", "kubernetes", "ci/cd", "部署", "监控", "日志", "运维"],
      "data-engineering": ["etl", "数据管道", "数据仓库", "大数据", "spark", "hadoop", "flink"],
    },
    taskTypes: {
      "code-generation": ["写代码", "写函数", "写类", "写模块", "写接口"],
      "code-review": ["代码审查", "review", "重构建议", "代码优化"],
      "architecture-design": ["架构设计", "系统设计", "技术选型", "方案设计"],
      "debugging": ["debug", "排错", "修复bug", "问题排查"],
      "testing": ["测试", "单元测试", "集成测试", "自动化测试", "测试用例"],
    },
    suggestedFrameworks: ["risen", "ape-optimized", "chain-of-thought", "react"],
  },

  education: {
    keywords: [
      "教学", "课程", "培训", "教育", "学习", "教案", "课件", "考试",
      "作业", "讲义", "教材", "知识点", "教学法", "教学设计", "题库",
      "微课", "慕课", "翻转课堂", "直播课", "录播", "培训方案",
    ],
    subDomains: {
      "course-design": ["课程", "大纲", "教学设计", "教案", "课件", "课程开发"],
      training: ["培训", "训练营", "工作坊", "企业培训", "内训", "师训"],
      assessment: ["考试", "测验", "评估", "题库", "评分", "试卷", "作业设计"],
      tutoring: ["辅导", "答疑", "一对一", "家教", "陪读"],
    },
    taskTypes: {
      "lesson-plan": ["教案", "教学设计", "课堂活动", "教学目标"],
      "material-creation": ["课件", "讲义", "教材", "微课", "视频脚本"],
      "assessment-design": ["出题", "试卷", "测验", "评分标准", "rubrics"],
      "course-outline": ["课程大纲", "课程体系", "学习路径", "培养方案"],
    },
    suggestedFrameworks: ["crispe", "co-star", "chain-of-thought", "smart"],
  },

  "data-analysis": {
    keywords: [
      "数据", "分析", "报表", "统计", "可视化", "图表", "趋势", "指标",
      "dashboard", "kpi", "bi", "sql", "python", "pandas", "excel",
      "机器学习", "预测", "建模", "ab测试", "漏斗", "留存", "ltv", "gmv",
      "归因", "用户画像", "分群", "聚类", "回归", "分类",
    ],
    subDomains: {
      "business-analysis": ["业务分析", "商业分析", "经营分析", "财务分析", "战略分析"],
      "user-analysis": ["用户分析", "行为分析", "留存", "漏斗", "ab测试", "路径分析", "热力图"],
      "data-viz": ["可视化", "图表", "dashboard", "报表", "大屏", "bi工具"],
      ml: ["机器学习", "预测", "建模", "分类", "回归", "聚类", "nlp", "cv"],
      "data-engineering": ["etl", "数据清洗", "数据仓库", "数据管道", "数据治理"],
    },
    taskTypes: {
      "report-generation": ["分析报告", "数据报告", "经营报告", "周报", "月报"],
      "dashboard-design": ["dashboard", "看板", "报表设计", "指标体系"],
      "model-building": ["建模", "训练模型", "特征工程", "模型评估"],
      "insight-extraction": ["洞察", "结论", "建议", "数据解读", "趋势分析"],
    },
    suggestedFrameworks: ["risen", "chain-of-thought", "co-star", "ape-optimized"],
  },

  legal: {
    keywords: [
      "合同", "法律", "法规", "合规", "条款", "协议", "法务", "诉讼",
      "知识产权", "隐私", "gdpr", "劳动法", "公司法", "商标", "专利",
      "版权", "仲裁", "调解", "尽职调查", "风险评估",
    ],
    subDomains: {
      contract: ["合同", "协议", "条款", "签约", "采购", "服务协议", "劳动合同"],
      compliance: ["合规", "gdpr", "隐私政策", "数据保护", "等保", "网络安全法"],
      ip: ["知识产权", "专利", "商标", "版权", "软著", "侵权"],
      litigation: ["诉讼", "仲裁", "调解", "证据", "庭审", "律师函"],
    },
    taskTypes: {
      "contract-draft": ["起草合同", "合同审查", "条款拟定", "协议模板"],
      "compliance-review": ["合规审查", "风险评估", "政策解读", "法规适用"],
      "ip-protection": ["专利申请", "商标注册", "版权登记", "侵权分析"],
      "legal-advice": ["法律咨询", "意见函", "法律分析", "案例检索"],
    },
    suggestedFrameworks: ["care", "risen", "scqa", "co-star"],
  },

  "image-gen": {
    keywords: [
      "图片", "图像", "绘画", "插画", "设计", "海报", "banner", "logo",
      "midjourney", "stable diffusion", "dall-e", "文生图", "图生图",
      "渲染", "3d", "摄影", "风格", "配色", "构图", "ui设计", "平面设计",
      "头像", "壁纸", "表情包", "icon", "矢量图",
    ],
    subDomains: {
      "digital-art": ["数字艺术", "插画", "概念设计", "原画", "cg", "厚涂"],
      commercial: ["商业", "海报", "banner", "广告图", "电商图", "主图", "详情页"],
      photography: ["摄影", "人像", "风景", "产品摄影", "修图", "调色"],
      "ui-ux": ["ui", "界面", "app设计", "网页设计", "原型", "交互"],
    },
    taskTypes: {
      "prompt-engineering": ["提示词", "prompt", "文生图", "图生图", "风格迁移"],
      "graphic-design": ["平面设计", "海报", "banner", "logo", "vi"],
      "photo-editing": ["修图", "抠图", "调色", "合成", "美颜"],
      "concept-art": ["概念设计", "场景", "角色", "道具", "气氛图"],
    },
    suggestedFrameworks: ["rtf", "co-star", "ape"],
  },

  "video-gen": {
    keywords: [
      "视频", "影片", "动画", "剪辑", "脚本", "分镜", "sora", "runway",
      "pika", "宣传片", "短视频", "vlog", "纪录片", "微电影", "字幕",
      "配音", "特效", "转场", "调色", "音频", "bgm",
    ],
    subDomains: {
      "short-video": ["短视频", "抖音", "快手", "TikTok", "reels", "youtube shorts"],
      script: ["脚本", "分镜", "剧本", "故事板", "大纲", "策划"],
      animation: ["动画", "mg动画", "定格", "3d动画", "motion graphics"],
      "post-production": ["后期", "剪辑", "特效", "调色", "字幕", "配音"],
    },
    taskTypes: {
      "script-writing": ["写脚本", "写分镜", "写剧本", "故事板", "策划案"],
      "video-editing": ["剪辑", "粗剪", "精剪", "节奏", "转场设计"],
      "prompt-engineering": ["文生视频", "图生视频", "视频生成", "ai视频"],
      "production-plan": ["拍摄计划", "制片", "预算", "团队", "排期"],
    },
    suggestedFrameworks: ["risen", "co-star", "scqa"],
  },

  "creative-writing": {
    keywords: [
      "写作", "小说", "故事", "剧本", "诗歌", "散文", "创意", "文学",
      "角色", "情节", "世界观", "设定", "大纲", "章纲", "网文", "连载",
      "出版", "投稿", "编辑", "审稿", "润色", "改写", "续写",
    ],
    subDomains: {
      fiction: ["小说", "故事", "短篇", "中篇", "长篇", "网文", "科幻", "奇幻", "悬疑", "言情"],
      scriptwriting: ["剧本", " screenplay", "分镜", "对白", "场景", "角色设定"],
      poetry: ["诗歌", "诗", "歌词", "现代诗", "古诗词"],
      nonfiction: ["散文", "随笔", "传记", "纪实", "杂文", "评论"],
    },
    taskTypes: {
      "story-outline": ["大纲", "章纲", "情节设计", "结构规划", "伏笔"],
      "character-design": ["角色设定", "人物小传", "角色弧光", "关系图"],
      "world-building": ["世界观", "设定", "地图", "历史", "文化", "规则"],
      "text-polish": ["润色", "改写", "扩写", "续写", "降重", "校对"],
    },
    suggestedFrameworks: ["co-star", "scqa", "crispe", "chain-of-thought"],
  },

  "product-management": {
    keywords: [
      "产品", "产品经理", "需求", "prd", "原型", "用户故事", "敏捷",
      "scrum", "迭代", "roadmap", "竞品分析", "用户调研", "ab测试",
      "增长", "留存", "激活", "转化", "mvp", "功能设计", "流程图",
      "需求文档", "产品规划", "用户体验", "用户旅程", "新功能", "feature",
    ],
    subDomains: {
      "requirement-analysis": ["需求分析", "用户调研", "竞品分析", "市场调研", "用户画像"],
      "product-design": ["产品设计", "原型", "prd", "交互设计", "ui评审"],
      "project-management": ["项目管理", "敏捷", "scrum", "迭代", "排期", "资源协调"],
      "growth-product": ["增长", "激活", "留存", "转化", "裂变", " experiments"],
    },
    taskTypes: {
      "prd-writing": ["写prd", "需求文档", "功能描述", "验收标准"],
      "competitive-analysis": ["竞品分析", "竞品调研", "swot", "波特五力"],
      "roadmap-planning": ["路线图", "roadmap", "版本规划", "里程碑"],
      "user-research": ["用户调研", "问卷", "访谈", "可用性测试", "画像"],
    },
    suggestedFrameworks: ["co-star", "risen", "broke", "smart"],
  },

  research: {
    keywords: [
      "研究", "论文", "学术", "文献", "综述", "实验", "假设", "方法论",
      "定量", "定性", "访谈", "问卷", "数据分析", "统计", "spss",
      "r语言", "latex", "引用", "参考文献", "期刊", "会议", "投稿",
      "开题", "答辩", "毕设", "硕论", "博论",
    ],
    subDomains: {
      "lit-review": ["文献综述", "文献检索", "文献管理", "zotero", "endnote"],
      "methodology": ["方法论", "研究设计", "实验设计", "样本", "信度", "效度"],
      "data-collection": ["数据收集", "问卷", "访谈", "实验", "田野调查"],
      "academic-writing": ["论文写作", "学术写作", "latex", "排版", "引用格式"],
    },
    taskTypes: {
      "paper-writing": ["写论文", "学术论文", "期刊投稿", "会议论文"],
      "lit-review": ["文献综述", "文献梳理", "研究现状", "研究空白"],
      "research-design": ["研究设计", "实验方案", "问卷设计", "访谈提纲"],
      "data-analysis": ["数据分析", "统计检验", "假设检验", "结果解释"],
    },
    suggestedFrameworks: ["chain-of-thought", "risen", "co-star", "ape-optimized"],
  },

  "customer-service": {
    keywords: [
      "客服", "售后", "客户", "服务", "投诉", "faq", "知识库",
      "工单", "crm", "客户满意", "nps", "回访", "话术", "sop",
      "智能客服", "聊天机器人", "自动回复", "情绪安抚", "退款", "换货",
    ],
    subDomains: {
      "inbound-support": ["售前", "咨询", "产品推荐", "方案介绍", "报价"],
      "after-sales": ["售后", "投诉", "退换货", "维修", "质保"],
      "knowledge-base": ["知识库", "faq", "sop", "话术库", "标准答案"],
      "voice-of-customer": ["客户反馈", "nps", "满意度", "回访", "调研"],
    },
    taskTypes: {
      "response-drafting": ["回复", "话术", "邮件回复", "聊天回复", "公函"],
      "faq-generation": ["faq", "常见问题", "知识库", "标准答案", "sop"],
      "complaint-handling": ["投诉处理", "危机公关", "情绪安抚", "赔偿方案"],
      "service-sop": ["服务流程", "sop", "服务标准", "质检", "培训材料"],
    },
    suggestedFrameworks: ["care", "crispe", "co-star", "scqa"],
  },
};

/** 通用 fallback */
const GENERAL_DOMAIN: DomainDef = {
  keywords: [],
  subDomains: { general: [] },
  taskTypes: { general: [] },
  suggestedFrameworks: ["co-star", "rtf", "ape"],
};

/**
 * 对意图进行分类
 */
export function classifyIntent(intent: string): ClassificationResult {
  const lower = intent.toLowerCase();
  const matchedKeywords: string[] = [];

  let bestDomain = "general";
  let bestDomainScore = 0;
  let bestSubDomain = "general";
  let bestSubScore = 0;
  let bestTaskType = "general";
  let bestTaskScore = 0;

  for (const [domainKey, domainData] of Object.entries(DOMAINS)) {
    const domainScore = domainData.keywords.filter((keyword) => {
      const match = lower.includes(keyword.toLowerCase());
      if (match) matchedKeywords.push(keyword);
      return match;
    }).length;

    if (domainScore > bestDomainScore) {
      bestDomainScore = domainScore;
      bestDomain = domainKey;

      // 匹配子领域
      bestSubScore = 0;
      for (const [subKey, subKeywords] of Object.entries(domainData.subDomains)) {
        const subScore = subKeywords.filter((kw) => lower.includes(kw.toLowerCase())).length;
        if (subScore > bestSubScore) {
          bestSubScore = subScore;
          bestSubDomain = subKey;
        }
      }

      // 匹配任务类型
      bestTaskScore = 0;
      for (const [taskKey, taskKeywords] of Object.entries(domainData.taskTypes)) {
        const taskScore = taskKeywords.filter((kw) => lower.includes(kw.toLowerCase())).length;
        if (taskScore > bestTaskScore) {
          bestTaskScore = taskScore;
          bestTaskType = taskKey;
        }
      }
    }
  }

  const domainDef = DOMAINS[bestDomain] || GENERAL_DOMAIN;
  const confidence = calculateConfidence(bestDomainScore, bestSubScore, bestTaskScore);

  return {
    domain: bestDomain,
    subDomain: bestSubDomain,
    taskType: bestTaskType,
    confidence,
    matchedKeywords: Array.from(new Set(matchedKeywords)),
    suggestedFrameworks: domainDef.suggestedFrameworks,
  };
}

function calculateConfidence(domainScore: number, subScore: number, taskScore: number): number {
  // 基础分 + 层级加分
  let score = 0.3;
  if (domainScore >= 1) score += 0.25;
  if (domainScore >= 3) score += 0.15;
  if (subScore >= 1) score += 0.15;
  if (taskScore >= 1) score += 0.15;
  return Math.min(Number(score.toFixed(3)), 0.98);
}

/**
 * 获取所有支持的领域列表
 */
export function getAllDomains(): { key: string; name: string; subDomains: string[] }[] {
  const names: Record<string, string> = {
    "content-marketing": "内容营销",
    programming: "编程开发",
    education: "教育教学",
    "data-analysis": "数据分析",
    legal: "法律合规",
    "image-gen": "图像生成",
    "video-gen": "视频生成",
    "creative-writing": "创意写作",
    "product-management": "产品管理",
    research: "学术研究",
    "customer-service": "客户服务",
  };

  return Object.entries(DOMAINS).map(([key, def]) => ({
    key,
    name: names[key] || key,
    subDomains: Object.keys(def.subDomains),
  }));
}

/**
 * 获取领域信息
 */
export function getDomainInfo(domain: string): DomainDef | null {
  return DOMAINS[domain] || null;
}

/**
 * 向后兼容：原来的 detectDomain 风格的接口
 */
export function detectDomainV2(intent: string): {
  domain: string;
  subDomain: string;
  confidence: number;
} {
  const result = classifyIntent(intent);
  return {
    domain: result.domain,
    subDomain: result.subDomain,
    confidence: result.confidence,
  };
}
