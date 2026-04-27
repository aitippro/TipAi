# 产品路线图 (Product Roadmap)

> **TipAi** 功能开发规划 — 按版本分阶段交付

---

## 📌 版本规划总览

| 版本 | 主题 | 功能数量 | 目标时间 |
|------|------|----------|----------|
| **v0.1.0** | 基础版 | 6 个核心模块 | ✅ 已完成 (2026-04-27) |
| **v0.2.0** | 个人增强 | A + B + D + G + H | 规划中 |
| **v0.3.0** | 团队协作 | C + E | 规划中 |
| **v0.4.0** | 开发者生态 | F | 规划中 |

---

## ✅ v0.1.0 — 已完成 (2026-04-27)

- [x] Prompt Forge — 20+ 框架提示词生成
- [x] Template Market — 6 大领域模板市场
- [x] 用户系统 — OAuth + 本地登录
- [x] AI 集成 — Kimi API v3 流式输出
- [x] CI/CD — GitHub Actions 自动化
- [x] 安全增强 — Rate Limiting / CORS / bcrypt

---

## 🚀 v0.2.0 — 个人增强版（计划中）

### A. Prompt Optimizer（提示词优化器）🔥 P1
- 输入现有提示词，AI 自动分析并输出优化版本
- 支持 3 种优化策略：通用优化 / 结构化优化 / 精简压缩
- diff 对比视图（原提示词 vs 优化后）
- 一键应用优化结果或放弃
- 优化历史记录与版本回溯
- 每日限流 50 次/用户

**技术要点**：
- 前端：编辑器旁新增"AI 优化"按钮 + diff 组件 + 策略选择器
- 后端：`prompt.optimize` tRPC 路由 + AI 优化 prompt template + 24h 缓存
- 数据库：`optimization_logs` 表

---

### B. Batch Export（批量导出）🔥 P1
- 批量导出提示词为 JSON / Markdown 格式
- 支持按标签、文件夹、创建时间范围筛选后导出
- 导出数量 > 10 条或单条 > 100KB 时自动 ZIP 压缩
- JSON 导出含完整字段：id, title, content, tags, description, created_at, updated_at
- Markdown 导出含 YAML frontmatter + 代码块包裹

**技术要点**：
- 前端：列表页复选框 + 全选 + 浮动导出栏 + 预览弹窗
- 后端：`prompt.export` tRPC 路由 + 异步大文件导出任务
- 数据结构：`tipai-export-v1` 标准 JSON Schema

---

### D. Prompt Import（提示词导入）✨ 补充
- 导入外部 JSON / Markdown 提示词文件
- 与 Batch Export 形成闭环（可进可出）
- 支持拖拽上传 + 解析预览 + 冲突检测（同名提示词）
- 导入后自动分类到指定文件夹

**技术要点**：
- 前端：拖拽上传组件 + 预览表格 + 冲突解决弹窗
- 后端：`prompt.import` tRPC 路由 + 文件解析 + 批量插入
- 复用 Batch Export 的 JSON Schema 反向解析

---

### G. Theme System（主题系统）✨ 补充
- 完善暗黑/亮色主题切换
- 支持自定义配色（主色、强调色、背景色）
- 主题配置持久化到用户设置
- 跟随系统主题自动切换

**技术要点**：
- 前端：CSS 变量系统 + 主题配置面板 + localStorage 持久化
- 后端：`userSettings` 表扩展 `theme` 字段

---

### H. Mobile Responsive（移动端适配）✨ 补充
- 响应式布局优化，手机端可用
- 编辑器移动端适配（简化工具栏 + 手势支持）
- 底部导航栏替代侧边栏
- 触摸友好的按钮和表单

**技术要点**：
- 前端：Tailwind 响应式断点 + 移动端专用组件 + 手势库
- 优先级：低，可与其他功能并行

---

## 🚀 v0.3.0 — 团队协作版（计划中）

### C. Team Collaboration（团队协作）🔥 P2
- 创建 Team/Project，邀请成员加入
- 团队项目下提示词多成员协作编辑
- 评论功能：添加评论、@成员、回复、解决线程
- 版本历史：每次编辑保存生成新版本，支持 diff 对比 + 一键回滚
- 四级权限：Owner / Editor / Commenter / Viewer
- 站内通知系统（邀请/提及/评论/编辑）

**技术要点**：
- 前端：Team 导航入口 + 成员管理 + 评论面板 + 版本时间轴
- 后端：新增 `team`, `team_member`, `team_project`, `prompt_version`, `comment` 表
- 权限中间件：`teamPermissionMiddleware`
- 通知：SSE 长连接或轮询

---

### E. Prompt Evaluation（提示词评估）✨ 补充
- 给生成的提示词打分（1-5 星）
- 填写反馈：哪里好、哪里不好
- AI 根据评分和反馈迭代优化
- 统计个人提示词平均分、历史趋势
- 社区热门提示词排行榜

**技术要点**：
- 前端：评分组件 + 反馈表单 + 趋势图表
- 后端：`prompt.evaluate` tRPC 路由 + 评分聚合
- 数据库：`evaluations` 表扩展

---

## 🚀 v0.4.0 — 开发者生态版（计划中）

### F. API Open Interface（API 开放接口）🔥 P2
- 给个人开发者提供 REST API
- 调用提示词生成、优化、导出能力
- API Key 管理（生成、撤销、限流）
- 调用统计与用量计费基础
- Webhook 支持（生成完成回调）

**技术要点**：
- 后端：Hono REST 路由 + API Key 中间件 + 用量统计
- 数据库：`api_keys` 表（加密存储）
- 文档：OpenAPI / Swagger 自动生成

---

## 📊 功能优先级矩阵

| 功能 | 用户价值 | 技术复杂度 | 开发周期 | 版本 |
|------|----------|------------|----------|------|
| A. Prompt Optimizer | ⭐⭐⭐⭐⭐ | 中 | 2 周 | v0.2.0 |
| B. Batch Export | ⭐⭐⭐⭐⭐ | 低 | 1 周 | v0.2.0 |
| D. Prompt Import | ⭐⭐⭐⭐ | 低 | 3 天 | v0.2.0 |
| G. Theme System | ⭐⭐⭐ | 低 | 3 天 | v0.2.0 |
| H. Mobile Responsive | ⭐⭐⭐ | 中 | 1 周 | v0.2.0 |
| C. Team Collaboration | ⭐⭐⭐⭐⭐ | 高 | 4 周 | v0.3.0 |
| E. Prompt Evaluation | ⭐⭐⭐⭐ | 中 | 1 周 | v0.3.0 |
| F. API Open Interface | ⭐⭐⭐⭐ | 中 | 2 周 | v0.4.0 |

---

## 🎯 下个 Sprint 建议（v0.2.0）

**第一阶段（2 周）**：
1. A. Prompt Optimizer — 核心增值功能
2. B. Batch Export — 数据可携带性

**第二阶段（1 周）**：
3. D. Prompt Import — 与 Export 形成闭环
4. G. Theme System — 体验优化

**第三阶段（1 周）**：
5. H. Mobile Responsive — 移动端可用

---

## 📝 变更记录

| 日期 | 版本 | 变更 |
|------|------|------|
| 2026-04-27 | v0.1.0 | 初始版本发布 |
| 2026-04-27 | roadmap | 用户确认"全要"，写入 8 项功能规划 |

---

> **决策记录**：2026-04-27，用户确认全部 8 项功能纳入开发计划，按 v0.2.0 → v0.3.0 → v0.4.0 分阶段交付。

---

*TipAi Team | 2026*
