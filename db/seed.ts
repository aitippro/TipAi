/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

/**
 * Database Seed Script
 * Uses Native Addon for seeding (P5 migrated)
 */

// ── Native Addon ─────────────────────────────────────────
let native: any = null;
try {
  native = require("../native");
} catch {
  throw new Error("Native addon is required for seeding. Run `npm run native:build` first.");
}

import { hashPasswordSync } from "../api/lib/password";

export function seed() {
  // Seed admin user (for dev/test environments only)
  if (process.env.NODE_ENV !== "production") {
    const adminPassword = hashPasswordSync("admin");
    const existingAdmin = native.userFindByUsername("admin");

    if (!existingAdmin) {
      native.userUpsert({
        union_id: "local:admin",
        username: "admin",
        password: adminPassword,
        name: "Administrator",
        role: "admin",
      });
    }
    console.log("✅ Seeded admin user (admin/admin)");
  }

  // Seed domain packages
  const domains = [
    {
      key: "content-marketing",
      name: "内容营销",
      description: "营销工作流通常遵循：市场洞察→策略制定→内容创作→渠道执行→效果优化的漏斗模型",
      icon: "megaphone",
      category: "marketing",
      prompt: "你是一位资深内容营销专家，擅长将营销目标拆解为可执行的AI提示词工作流。",
    },
    {
      key: "programming",
      name: "编程开发",
      description: "开发工作流通常遵循：需求理解→架构设计→模块划分→编码实现→测试验证→文档完善的瀑布-敏捷混合模型",
      icon: "code",
      category: "tech",
      prompt: "你是一位资深软件架构师和技术顾问，擅长将开发需求拆解为可执行的AI提示词工作流。",
    },
    {
      key: "education",
      name: "教育教学",
      description: "教学设计通常遵循ADDIE模型：分析→设计→开发→实施→评估",
      icon: "graduation-cap",
      category: "education",
      prompt: "你是一位资深教育专家和教学设计顾问，擅长将教学目标拆解为可执行的AI提示词工作流。",
    },
    {
      key: "data-analysis",
      name: "数据分析",
      description: "数据分析通常遵循：问题定义→数据理解→清洗准备→探索分析→建模分析→结果解释→报告呈现",
      icon: "bar-chart",
      category: "tech",
      prompt: "你是一位资深数据科学家和分析顾问，擅长将分析需求拆解为可执行的AI提示词工作流。",
    },
    {
      key: "legal",
      name: "法律分析",
      description: "法律分析通常遵循：事实梳理→法律检索→要件分析→风险评估→方案设计→文书起草的严谨流程",
      icon: "scale",
      category: "professional",
      prompt: "你是一位资深法律顾问，擅长将法律需求拆解为可执行的AI提示词工作流。",
    },
    {
      key: "general",
      name: "通用任务",
      description: "通用任务拆解遵循：目标澄清→信息收集→方案设计→执行计划→质量检查的通用模型",
      icon: "zap",
      category: "general",
      prompt: "你是一位任务拆解和流程优化专家，擅长将任意目标拆解为清晰、可执行的AI提示词工作流。",
    },
  ];

  for (const domain of domains) {
    native.domainPackageUpsert(domain);
  }
  console.log(`✅ Seeded ${domains.length} domain packages`);

  // Seed default templates
  const defaultTemplates = [
    {
      user_id: 1,
      title: "小红书爆款文案生成",
      description: "输入产品信息，自动生成小红书风格的种草文案，含标题、卖点和hashtag",
      framework: "co-star",
      domain: "content-marketing",
      content: `Context: 你是一位小红书资深博主，擅长撰写高转化的种草文案
Objective: 为{{产品名称}}撰写一则小红书帖子
Style: 轻松自然、有洞察力、带emoji、口语化
Tone: 像朋友推荐好物，真诚不套路
Audience: 18-30岁一二线城市女性，注重品质和颜值
Response: 
- 标题（含emoji，20字内）
- 正文（3-5段，每段1-2句，自然融入产品卖点）
- 3-5个核心卖点（bullet points + emoji）
- 8-10个相关hashtag`,
      tags: "小红书,文案,种草,营销",
      is_public: 1,
    },
    {
      user_id: 1,
      title: "Python数据分析脚本",
      description: "生成完整的数据分析Python脚本，包含数据清洗、可视化和洞察输出",
      framework: "risen",
      domain: "data-analysis",
      content: `Role: 你是一位数据科学家，精通Python数据分析全流程
Task: 为{{数据集描述}}编写完整的Python分析脚本
Format: 
1. 先给出分析思路概述
2. 完整可运行的Python代码（含import）
3. 每个代码块附注释说明
4. 最后给出3-5条数据洞察

要求：
- 使用pandas + matplotlib/seaborn
- 处理缺失值和异常值
- 生成至少2种可视化图表
- 代码可以直接复制运行`,
      tags: "Python,数据分析,代码",
      is_public: 1,
    },
    {
      user_id: 1,
      title: "教学教案设计",
      description: "为任意知识点设计完整的教学教案，包含目标、活动、评估",
      framework: "crispe",
      domain: "education",
      content: `Capacity+Role: 你是一位有15年经验的教育学教授，擅长教学设计
Insight: 学生是{{年级}}学生，{{学科}}基础{{水平}}，对{{知识点}}感到困惑
Instruction: 设计一份45分钟的完整教案
Personality: 耐心、鼓励、善于用类比和互动
Experiment: 如果某个环节不适合，主动提供替代方案

教案结构：
1. 教学目标（知识/能力/情感三维）
2. 导入（5分钟，生活化场景引入）
3. 新知讲解（15分钟，含2个类比/案例）
4. 互动练习（10分钟，小组/个人活动）
5. 总结与作业（5分钟）
6. 差异化支持（学困生/学优生分别的辅导策略）`,
      tags: "教案,教学,教育",
      is_public: 1,
    },
    {
      user_id: 1,
      title: "Midjourney图像提示词",
      description: "将自然语言描述转化为专业的Midjourney英文提示词",
      framework: "rtf",
      domain: "content-marketing",
      content: `Role: 你是一位Midjourney提示词专家，精通光影、构图和风格描述
Task: 为"{{图像描述}}"生成专业英文提示词
Format: 以结构化格式输出：

**主体描述**: ...
**环境/背景**: ...
**光影效果**: ...
**风格参考**: ...
**色彩方案**: ...
**构图视角**: ...

**完整提示词**:
[整合以上要素的完整英文提示词，150-300词]

**负面提示词**:
[列出应避免的元素]

**参数建议**:
--ar {{比例}} --v 6 --s {{风格化程度}}`,
      tags: "Midjourney,图像,AI绘画",
      is_public: 1,
    },
    {
      user_id: 1,
      title: "RESTful API设计文档",
      description: "根据业务需求自动生成完整的RESTful API设计文档",
      framework: "ape-optimized",
      domain: "programming",
      content: `Role: 你是一位资深后端架构师，主导过多个大型系统设计
Instructions: 为{{业务场景}}设计完整的RESTful API
Steps:
1. 分析业务实体和关系，定义资源模型
2. 设计核心API端点列表（GET/POST/PUT/DELETE/PATCH）
3. 定义请求/响应DTO（含字段类型、校验规则、示例JSON）
4. 设计错误码规范（HTTP状态码+业务错误码）
5. 提供分页、过滤、排序策略
6. 给出安全建议（认证/授权/限流）
End goal: 可直接进入开发评审的完整API设计文档
Narrowing: 遵循RESTful最佳实践，使用OpenAPI 3.0格式，支持10000 QPS`,
      tags: "API,后端,架构",
      is_public: 1,
    },
    {
      user_id: 1,
      title: "短视频脚本生成",
      description: "为抖音/快手/TikTok生成15-60秒短视频的完整脚本",
      framework: "risen",
      domain: "content-marketing",
      content: `Role: 你是一位短视频编剧，擅长抓人眼球的前3秒
Task: 为"{{主题}}"创作一条{{时长}}秒的短视频脚本

脚本格式：
| 时间 | 画面 | 台词/字幕 | 音效/音乐 | 备注 |
|------|------|-----------|-----------|------|
| 0-3s | ... | 黄金3秒钩子 | ... | 必须抓住注意力 |
| ... | ... | ... | ... | ... |

附加要求：
- 前3秒必须有强烈的情绪钩子
- 每5秒一个节奏变化（转折/惊喜/疑问）
- 结尾有明确的CTA（关注/点赞/评论引导）
- 标注需要的拍摄镜头类型`,
      tags: "短视频,脚本,抖音",
      is_public: 1,
    },
  ];

  for (const tmpl of defaultTemplates) {
    try {
      native.templateCreate(tmpl);
    } catch (e) {
      // Template may already exist, skip
    }
  }
  console.log(`✅ Seeded ${defaultTemplates.length} default templates`);
  console.log("\n🎉 Database seeding completed!");
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  seed();
}
