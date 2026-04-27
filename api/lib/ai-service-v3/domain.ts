export function detectDomain(intent: string): {
  domain: string;
  subDomain: string;
  confidence: number;
} {
  const lower = intent.toLowerCase();
  const domains: Record<
    string,
    { keywords: string[]; subDomains: Record<string, string[]> }
  > = {
    "content-marketing": {
      keywords: ["营销", "推广", "文案", "品牌", "广告", "社交媒体", "seo", "内容", "小红书", "抖音", "微博", "公众号", "landing page", "销售页", "转化率", "获客", "漏斗", "kpi", "roi", "campaign", "种草", "带货", "种草文案", "brief", "slogan", "广告语", "公关", "传播"],
      subDomains: {
        "social-media": ["小红书", "抖音", "微博", "朋友圈", "Instagram", "Twitter", "TikTok", "社交媒体", "短视频", "直播"],
        copywriting: ["文案", "标题", "slogan", "广告语", "销售信", "landing page", "brief", "种草文案"],
        branding: ["品牌", "定位", "vi", "视觉", "调性", "品牌故事", "品牌手册"],
        email: ["邮件", "edm", "newsletter", "邮件营销"],
      },
    },
    programming: {
      keywords: ["代码", "编程", "开发", "app", "网站", "api", "数据库", "算法", "架构", "微服务", "前端", "后端", "全栈", "devops", "测试", "bug", "重构", "设计模式", "部署", "docker", "kubernetes", "ci/cd", "性能优化", "安全", "oauth", "jwt"],
      subDomains: {
        "web-dev": ["网站", "web", "前端", "后端", "全栈", "html", "css", "javascript", "react", "vue", "nextjs"],
        "api-design": ["api", "接口", "rest", "graphql", "swagger", "openapi"],
        "system-design": ["架构", "系统设计", "微服务", "高并发", "分布式", "缓存", "消息队列"],
        devops: ["devops", "docker", "kubernetes", "ci/cd", "部署", "监控"],
      },
    },
    education: {
      keywords: ["教学", "课程", "培训", "教育", "学习", "教案", "课件", "考试", "作业", "讲义", "教材", "知识点", "教学法", "教学设计", "题库", "微课", "慕课", "翻转课堂"],
      subDomains: {
        "course-design": ["课程", "大纲", "教学设计", "教案", "课件"],
        training: ["培训", "训练营", "工作坊", "企业培训", "内训"],
        assessment: ["考试", "测验", "评估", "题库", "评分", "试卷"],
      },
    },
    "data-analysis": {
      keywords: ["数据", "分析", "报表", "统计", "可视化", "图表", "趋势", "指标", "dashboard", "kpi", "bi", "sql", "python", "pandas", "excel", "机器学习", "预测", "建模", "ab测试", "漏斗", "留存", "ltv", "gmv"],
      subDomains: {
        "business-analysis": ["业务分析", "商业分析", "经营分析", "财务分析"],
        "user-analysis": ["用户分析", "行为分析", "留存", "漏斗", "ab测试", "路径分析"],
        "data-viz": ["可视化", "图表", "dashboard", "报表", "大屏"],
        ml: ["机器学习", "预测", "建模", "分类", "回归", "聚类"],
      },
    },
    legal: {
      keywords: ["合同", "法律", "法规", "合规", "条款", "协议", "法务", "诉讼", "知识产权", "隐私", "gdpr", "劳动法", "公司法", "知识产权", "商标", "专利", "版权"],
      subDomains: {
        contract: ["合同", "协议", "条款", "签约", "采购", "服务协议"],
        compliance: ["合规", "gdpr", "隐私政策", "数据保护", "等保"],
        ip: ["知识产权", "专利", "商标", "版权"],
      },
    },
    "image-gen": {
      keywords: ["图片", "图像", "绘画", "插画", "设计", "海报", "banner", "logo", "midjourney", "stable diffusion", "dall-e", "文生图", "图生图", "渲染", "3d", "摄影", "风格", "配色"],
      subDomains: {
        "digital-art": ["数字艺术", "插画", "概念设计", "原画"],
        commercial: ["商业", "海报", "banner", "广告图", "电商图"],
        photography: ["摄影", "人像", "风景", "产品摄影"],
      },
    },
    "video-gen": {
      keywords: ["视频", "影片", "动画", "剪辑", "脚本", "分镜", "sora", "runway", "pika", "宣传片", "短视频", "vlog", "纪录片", "微电影", "字幕", "配音"],
      subDomains: {
        "short-video": ["短视频", "抖音", "快手", "TikTok", "reels"],
        script: ["脚本", "分镜", "剧本", "故事板"],
        animation: ["动画", "mg动画", "定格", "3d动画"],
      },
    },
  };

  let bestDomain = "general";
  let bestScore = 0;
  let bestSubDomain = "general";

  for (const [domainKey, domainData] of Object.entries(domains)) {
    const score = domainData.keywords.filter((keyword) =>
      lower.includes(keyword),
    ).length;
    if (score > bestScore) {
      bestScore = score;
      bestDomain = domainKey;
      let subScore = 0;
      for (const [subKey, subKeywords] of Object.entries(domainData.subDomains)) {
        const candidateScore = subKeywords.filter((keyword) =>
          lower.includes(keyword),
        ).length;
        if (candidateScore > subScore) {
          subScore = candidateScore;
          bestSubDomain = subKey;
        }
      }
    }
  }

  return {
    domain: bestScore >= 1 ? bestDomain : "general",
    subDomain: bestSubDomain,
    confidence: Math.min(bestScore * 0.3 + 0.4, 0.95),
  };
}
