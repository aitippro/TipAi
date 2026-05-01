# 更新日志 (Changelog)

本项目采用 [语义化版本](https://semver.org/lang/zh-CN/)（SemVer）管理版本号。

---

## [1.2.2] - 2026-04-30

### 框架扩展
- 框架目录从 20 个扩展至 **30 个**，新增 10 个细分场景框架：
  - Security-Audit（安全审计）、Multi-Translate（跨文化翻译）
  - Scientific-Experiment（实验设计）、Medical-Diagnosis（临床辅助）
  - Legal-Analysis（法律分析）、Persona+（角色增强）
  - Compare-Contrast（对比分析）、Brainstorming（头脑风暴）
  - Crisis-Response（危机应对）、Data-Storytelling（数据叙事）

### 代码质量
- 修复全部 **48 个 ESLint 错误和警告**（0 errors / 0 warnings）
- 修复 React Hooks 严重错误：useSpring / useMagnetic / useTilt / CommandPalette 等
- 消除所有 `no-explicit-any`、`no-useless-escape`、`no-unused-vars`
- 测试：**221/221 通过**，零回归

---

## [1.2.0] - 2026-04-29

### 第四期：生态扩展
- **REST API 开放** — 6 端点（生成/优化/多模态/ToT/学术引用/文档）+ Python/TS SDK 示例
- **Agent Swarm** — 5 角色 × 3 协作模式（顺序/并行/层级）
- **学术合作工具** — 5 种引用格式（APA/MLA/GB7714/IEEE/Chicago）+ 实验复现报告

---

## [1.1.0] - 2026-04-28

### 第三期：工程化闭环
- **质量门禁系统** — 12 项检查点 + 评分 + 改进建议
- **反馈闭环系统** — 5 维评分 + 趋势分析 + 进化建议
- **Drift Detection** — 词频向量 + Cosine 相似度 + 需求漂移趋势告警

### 第二期：前沿追赶
- **多模态提示词引擎** — 文生图/图生文/视频分镜
- **智能框架匹配引擎** — 20 框架知识图谱 + 5 维度评分 + Canvas 可视化
- **Tree of Thoughts 推理引擎** — BFS/DFS + SVG 树形可视化

---

## [1.0.0] - 2026-04-27

### 第一期：学术 Debt 清零
- **OPRO 自动优化引擎** — 多轮迭代 + LLM-as-Judge 六维评分
- **Clarify 策略路由** — 11 领域分类器（81.8% 准确率）+ 策略追问
- **Decode 策略层** — greedy/sampling/self-consistency 三种策略

### 基础版本
- Prompt Forge 提示词工坊（20+ 框架）
- Template Market 模板市场（6 大领域）
- 用户系统（OAuth + 本地登录 + JWT）
- 6 个 AI Provider（Kimi/OpenAI/Claude/DeepSeek/Gemini/Ollama）
- Apple 设计系统 UI + 弹性动画

---

> **注意**: 本项目遵循 [非商业使用许可](../LICENSE.md)。任何商业使用、转售、嵌入商业产品均需获得书面授权。
