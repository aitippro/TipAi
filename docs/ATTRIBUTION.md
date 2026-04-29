# ATTRIBUTION.md — 致谢与引用

**TipAi** 项目的设计、功能逻辑和提示词框架体系，参考和借鉴了以下开源项目、学术论文与社区资源。按照学术诚信和开源社区规范，特此致谢。

---

## 一、核心参考项目

### 1. Prompt-Engineering-Guide by DAIR.AI
- **仓库**: https://github.com/dair-ai/Prompt-Engineering-Guide
- **作者**: Elvis Saravia, DAIR.AI 社区
- **引用**: Saravia, Elvis. "Prompt Engineering Guide." https://github.com/dair-ai/Prompt-Engineering-Guide, 2022.
- **说明**: 提示词工程领域最权威的社区指南，涵盖了 Chain-of-Thought、Tree of Thoughts、ReAct、Self-Consistency、Constitutional AI、Few-Shot Prompting 等几乎所有主流技术的详细解释与代码示例。本项目 20+ 提示词框架的分类体系和设计思想，核心参考来源。

### 2. LangGPT
- **仓库**: https://github.com/EmbraceAGI/LangGPT
- **论文**: Ming Wang, Yuanzhong Liu, Xiaoming Zhang, Songlian Li, Yijie Huang, Chi Zhang, Daling Wang, Shi Feng, Jigang Li. "LangGPT: Rethinking Structured Reusable Prompt Design." arXiv:2402.16929, 2024.
- **社区**: https://www.langgpt.ai/
- **说明**: 结构化提示词编程框架 LangGPT 的原创团队。本项目代码中直接实现了 LangGPT 框架（Profile/Rules/Skills/Workflow/Initialization），其双层提示设计规范为复杂 Agent 场景提供了标准模板。

### 3. awesome-prompts by AI Boost
- **仓库**: https://github.com/ai-boost/awesome-prompts
- **说明**: 精选提示词资源库，覆盖 Coding、DevOps、Data Engineering、Product Management 等领域。为本项目模板市场的分类设计和内容组织方式提供了参考。

### 4. awesome-prompt-engineering by Tyson Cung
- **仓库**: https://github.com/tysoncung/awesome-prompt-engineering
- **说明**: 提示词工程资源列表，包含 Techniques、Frameworks、Tools & Libraries 等分类。帮助本项目梳理了提示词框架的层次分类体系。

### 5. prompt-architect by nati112
- **仓库**: https://github.com/nati112/prompt-architect
- **说明**: 基于 OpenAI 最佳实践的结构化提示词工程 Agent。其"分析 → 选择框架 → 生成提示词"的工作流，为本项目的自动框架推荐机制提供了产品逻辑参考。

---

## 二、提示词框架来源

以下框架来自提示词工程社区的最佳实践、公开发表的研究或经典方法论：

| 框架 | 来源 | 说明 |
|------|------|------|
| **CO-STAR** | Sheila Teo, *How I Won Singapore's GPT-4 Prompt Engineering Competition* | 6维度沟通框架 |
| **RISEN** | 社区最佳实践 | Role + Instructions + Steps + End goal + Narrowing |
| **RTF** (Role-Task-Format) | 社区最佳实践 | 极简3要素框架 |
| **CRISPE** | 社区最佳实践 | Capacity + Insight + Instruction + Personality + Experiment |
| **APE** (Action-Purpose-Expectation) | 社区最佳实践 | 行动导向框架 |
| **BROKE** | 社区最佳实践 | Background + Role + Objectives + Key Results + Evolve |
| **CARE** | 社区最佳实践 | Context + Ask + Rules + Examples |
| **Chain-of-Thought** | Wei, Jason, et al. "Chain-of-thought prompting elicits reasoning in large language models." NeurIPS 2022. | 逐步推理框架 |
| **Tree of Thoughts** | Yao, Shunyu, et al. "Tree of thoughts: Deliberate problem solving with large language models." NeurIPS 2023. | 多路径探索决策 |
| **ReAct** | Yao, Shunyu, et al. "ReAct: Synergizing reasoning and acting in language models." ICLR 2023. | 推理+行动框架 |
| **LangGPT** | Wang, Ming, et al. "LangGPT: Rethinking Structured Reusable Prompt Design." arXiv:2402.16929, 2024. | 结构化提示词编程 |
| **Self-Refine** | Madaan, Aman, et al. "Self-refine: Iterative refinement with self-feedback." NeurIPS 2023. | 迭代自优化 |
| **Few-Shot Prompting** | Brown, Tom, et al. "Language models are few-shot learners." NeurIPS 2020. | 少样本学习 |
| **Meta-Prompting** | 社区最佳实践 | 提示词的提示词 |
| **PROMPT** | 社区最佳实践 | 7要素深度创作框架 |
| **SCQA** | 麦肯锡咨询方法论 | Situation + Complication + Question + Answer |
| **BAB** | 销售文案经典结构 | Before + After + Bridge |
| **SMART** | 目标管理经典方法论 | Specific + Measurable + Achievable + Relevant + Time-bound |
| **TAG** | 社区最佳实践 | Task + Action + Goal |
| **APE+** | 社区最佳实践 | APE + Constraints + Validation（扩展版）|

> 完整的技术引用和论文列表，请参考 [dair-ai/Prompt-Engineering-Guide](https://github.com/dair-ai/Prompt-Engineering-Guide) 的 Papers 章节。

---

## 三、技术栈致谢

| 项目 | 仓库 | 用途 |
|------|------|------|
| **React** | https://github.com/facebook/react | UI 框架 |
| **Vite** | https://github.com/vitejs/vite | 构建工具 |
| **Tailwind CSS** | https://github.com/tailwindlabs/tailwindcss | CSS 框架 |
| **shadcn/ui** | https://github.com/shadcn/ui | UI 组件库 |
| **Hono** | https://github.com/honojs/hono | 后端 Web 框架 |
| **tRPC** | https://github.com/trpc/trpc | 端到端类型安全 API |
| **Drizzle ORM** | https://github.com/drizzle-team/drizzle-orm | 类型安全 ORM |
| **React Query** | https://github.com/TanStack/query | 服务端状态管理 |
| **Zod** | https://github.com/colinhacks/zod | 运行时类型校验 |
| **SuperJSON** | https://github.com/blitz-js/superjson | JSON 序列化 |

---

## 五、品牌资产

### TipAi Logo
- **文件**: `public/logo.png`, `assets/branding/logo.png`
- **来源**: Logo generated with the assistance of ChatGPT by OpenAI
- **说明**: 本项目 Logo 由 ChatGPT (OpenAI) 辅助生成，经人工调整后的最终版本。版权归属 TipAi 团队，允许在项目及相关宣传材料中使用。

---

## 六、免责声明

本项目为独立开发的教育/工具型项目，与上述参考项目的作者或维护团队无直接关联。所有框架定义和模板内容均基于公开文献和社区共识，仅供学习和研究使用。

如发现引用遗漏或错误，欢迎提交 PR 或 Issue 指正。
