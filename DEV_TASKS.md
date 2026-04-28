# TipAi 开发任务清单
# 由 AI 团队按顺序执行，每小时检查一次
# 格式: [ ] 待办 | [~] 进行中 | [x] 已完成

## 🔥 最高优先级

- [x] AI-1. 多模型 AI 接入协议适配
  - DeepSeek API 对话补全 + 流式输出适配 ✅
  - Gemini API 多模态输入支持 ✅
  - OpenAI API GPT-4/3.5 function calling ✅
  - Kimi API 现有协议统一封装 ✅
  - 统一 AIModelProvider 抽象层 ✅
  - 模型能力自动检测 ✅
  - 智能路由（按任务类型选模型）✅
  - 错误处理与自动降级 ✅
  - 流式输出统一格式 ✅
  - Token 消耗统计 ✅

---

## Phase 1: Electron 桌面端基础 (Windows 优先)

- [x] E1. Electron 架构搭建
  - 主进程 (main.js) + 预加载脚本 (preload.js) ✅
  - SQLite 本地数据库 (better-sqlite3) ✅
  - 打包配置 (electron-builder) ✅
  - Windows .exe 构建配置 ✅

- [x] E2. Apple 设计系统 UI 改造
  - 全局 CSS 变量 → Apple 配色 (蓝/灰/白) ✅
  - Tailwind 配置扩展 (apple shadow, font, easing) ✅
  - 组件样式统一: glass-card, material-card, sidebar-apple ✅
  - 圆角规范: 0.625rem 统一 ✅
  - 字体: SF Pro Display / SF Pro Text ✅

- [x] E3. 窗口与导航改造
  - macOS 风格标题栏 (hiddenInset) ✅
  - 侧边栏导航 (macOS Finder 风格) ✅
  - 毛玻璃效果 (backdrop-blur) ✅
  - 响应式布局适配 ✅

- [x] E4. 本地数据层完成
  - db/connection.ts 适配 SQLite
  - db/seed.ts 去 MySQL 化
  - 数据库迁移脚本
  - 数据备份/导出功能

- [x] E5. Windows 打包与发布
  - NSIS 安装包 (.exe)
  - Portable 绿色版
  - 自动更新机制 (electron-updater)
  - 代码签名 (未来)

## Phase 2: 核心功能开发 (按 ROADMAP v0.2.0)

- [x] F1. Clarify 需求澄清对话
  - AI 引导式需求收集 ✅
  - 多轮对话保存到项目 ✅
  - 需求摘要生成 ✅

- [x] F2. Prompt Optimizer 一键优化
  - 策略选择 (通用/结构化/精简) ✅
  - Diff 对比组件 ✅
  - 优化历史记录 ✅

- [x] F3. Batch Export 批量导出
  - JSON / Markdown 格式 ✅
  - 筛选过滤 ✅
  - 导出进度指示 ✅

- [ ] F4. 本地 API Key 管理
  - 加密存储 (AES-256-GCM)
  - 多模型支持 (Kimi/OpenAI/Claude/DeepSeek)
  - Key 有效性检测

- [ ] F5. 离线模式支持
  - 本地模型接入 (Ollama)
  - 缓存策略
  - 离线状态提示

- [ ] F6. 动态提示词生成 (Dynamic Prompt Generation)
  - 需求 → 动态提示词选项生成
  - 用户选择/修改 → AI 实时重生成
  - 迭代精修控制 (两层系统: 响应级 + 会话级)
  - 适配视频剪辑、图像生成等动态需求场景
  - 参考: Microsoft Dynamic Prompt Middleware (CHIWORK 2025)

## Phase 3: 云端同步预留 (未来)

- [ ] C1. 云端提示词库接口
  - 远程 URL 配置
  - 拉取/合并策略
  - 版本冲突解决

- [ ] C2. 用户中央数据库
  - 提示词中央仓库架构
  - 客户端选取拉取机制
  - 权限控制

## Phase 4: 测试与优化

- [ ] T1. 单元测试覆盖
  - API 路由测试
  - 数据库操作测试
  - 工具函数测试

- [ ] T2. E2E 测试
  - Electron 主进程测试
  - 渲染进程交互测试
  - 打包验证

- [ ] T3. 性能优化
  - 启动速度优化
  - 内存占用优化
  - 打包体积优化

## 技术债务

- [ ] D1. 移除 mysql2 依赖
- [ ] D2. 清理废弃代码
- [ ] D3. 更新文档 (README, CONTRIBUTING)
- [ ] D4. TypeScript 严格模式检查

---

## 当前执行中

任务: E3. 窗口与导航改造
开始: 2026-04-27
负责人: Dev Agent
状态: 已完成

## 已完成

- [x] E1. Electron 架构搭建 - 核心代码已完成
- [x] E2. Apple 设计系统 UI 改造 - 核心组件样式已完成
- [x] E3. 窗口与导航改造 - 已完成
  - macOS hiddenInset 标题栏 + Windows 标准标题栏
  - macOS Finder 风格侧边栏 (220px, 毛玻璃)
  - 侧边栏可折叠 (桌面端)
  - 移动端顶部导航栏 + Sheet 侧边抽屉
  - backdrop-filter: blur(20px) saturate(180%)
  - 响应式布局: md 断点适配
- [x] 数据库 SQLite 迁移
- [x] Electron main.js + preload.js
- [x] package.json 构建配置
- [x] Apple CSS 设计系统初版
