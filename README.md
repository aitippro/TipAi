<div align="center">

<img src="public/logo.png" alt="TipAi" width="96">

# ✨ TipAi

**智能提示词工程平台 v2.0**

> 从模糊需求到精准提示词，全链路 AI 驱动 · Rust Native Addon 高性能架构

<a href="https://github.com/aitippro/TipAi/releases"><img src="https://img.shields.io/github/v/release/aitippro/TipAi?style=flat-square" alt="Release"></a>
<img src="https://img.shields.io/badge/License-Non--Commercial-red?style=flat-square" alt="License">
<img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React">
<img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript" alt="TS">
<img src="https://img.shields.io/badge/Rust-1.85-orange?style=flat-square&logo=rust" alt="Rust">
<img src="https://img.shields.io/badge/Electron-41-47848F?style=flat-square&logo=electron" alt="Electron">
<img src="https://img.shields.io/badge/Frameworks-30-blue?style=flat-square" alt="Frameworks">

</div>

---

## 简介

**TipAi** 是一款本地优先、高性能的提示词工程工具。输入模糊需求，AI 自动分析意图、多轮澄清、匹配最优框架、输出精准可用的提示词。

### 架构升级 v2.0

| 🔥 Rust Native Addon | 🚀 零端口架构 | 🛡️ AES-256-GCM | 🌐 多模型 |
|:---|:---|:---|:---|
| 数据库操作 + AI HTTP + 加密全部下沉到 Rust | 无后端服务端口，Electron 直接加载 .node | 本地 AES-256-GCM 加密，密钥隔离存储 | Kimi · OpenAI · Claude · DeepSeek · Gemini · Ollama |

### 核心亮点

| 🤖 AI 驱动 | 🎨 30+ 框架 | 🔒 本地优先 | ⚡ 高性能 |
|:---|:---|:---|:---|
| 意图分析 → 策略路由 → 自动优化 | 从 RTF 到 ReAct，覆盖简单/中等/复杂全场景 | SQLite 存储，Rust 层 AES-256-GCM 加密 | Rust Native Addon，零序列化，AI 不阻塞 UI |

---

## 功能全景

### 一期：学术 Debt 清零
- **OPRO 自动优化引擎** — 多轮迭代优化提示词，LLM-as-Judge 六维评分，自动 early stopping
- **Clarify 策略路由** — 11 领域 × 30+ 子领域分类，AI 引导式多轮澄清
- **Decode 策略层** — greedy / sampling / self-consistency 三种解码策略，任务类型自动推荐

### 二期：前沿追赶
- **多模态提示词引擎** — 文生图 / 图生文 / 视频分镜，支持 Midjourney / DALL-E / Sora / Runway
- **智能框架匹配引擎** — 30 框架知识图谱 + 5 维度评分 + Canvas 力导向图可视化
- **Tree of Thoughts 推理引擎** — BFS/DFS 多路径探索 + SVG 树形可视化

### 三期：工程化闭环
- **质量门禁系统** — 12 项检查点（完整性/安全性/格式一致性/语言混合等）
- **反馈闭环系统** — 5 维评分 + 趋势分析 + 进化建议
- **Drift Detection** — 词频向量 + Cosine 相似度 + 需求漂移趋势告警

### 四期：生态扩展
- **REST API 开放** — 6 端点（生成/优化/多模态/ToT/学术引用/文档）+ Python/TS SDK 示例
- **Agent Swarm** — 5 角色（规划/执行/审校/优化/协调）× 3 协作模式（顺序/并行/层级）
- **学术合作工具** — APA/MLA/GB7714/IEEE/Chicago 五种引用格式 + 实验复现报告

---

## 30 个提示词框架

| 复杂度 | 框架 |
|--------|------|
| **简单** (6) | RTF · APE · TAG · CARE · BAB · SMART · Compare-Contrast · Brainstorming |
| **中等** (10) | CO-STAR · RISEN · CRISPE · BROKE · SCQA · PROMPT · Few-Shot · Multi-Translate · Persona+ · Crisis-Response · Data-Storytelling |
| **复杂** (10) | Chain-of-Thought · Tree-of-Thoughts · ReAct · LangGPT · APE+ · Self-Refine · Meta-Prompting · Security-Audit · Scientific-Experiment · Medical-Diagnosis · Legal-Analysis |

> 每个框架包含完整定义：适用场景、组件结构、模板、示例，以及框架间的关系网络（相似/互补/升级路径）。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 · TypeScript 5.9 · Vite 7 · Tailwind CSS 3 · shadcn/ui · Framer Motion |
| API | tRPC 11 · Hono 4 |
| 数据库 | **Rust Native Addon** (SQLite 内核) · 纯 TypeScript 类型定义 |
| 原生层 | **Rust 1.85** · NAPI-RS · AES-256-GCM · 异步 AI HTTP |
| 加密 | AES-256-GCM · jose JWT · bcryptjs |
| 测试 | Vitest 4 · Playwright E2E |
| 构建 | Vite · esbuild · electron-builder · napi-rs |
| CI/CD | GitHub Actions |

### 架构重建里程碑

```
v1.2.2 (原架构)          v2.0.0 (新架构)
├─ JS 后端 (Hono)         ├─ Rust Native Addon
├─ better-sqlite3           ├─ SQLite (Rust 层)
├─ Drizzle ORM              ├─ 纯 TS 类型定义
├─ 后端服务端口             ├─ 零端口 (Electron IPC)
└─ 序列化开销               └─ 零序列化 (内存直传)
```

---

## 快速开始

### 环境要求
- Node.js ≥ 22，npm ≥ 10
- **Rust 1.85+** (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
- Windows 10+ / macOS 13+ / Linux

### 安装

```bash
git clone https://github.com/aitippro/TipAi.git
cd TipAi
npm install
npm run native:build    # 构建 Rust Native Addon（首次必需）
npm run dev             # 开发模式
```

### 常用命令

```bash
npm run check              # TypeScript 类型检查
npm run lint               # ESLint
npm run test               # Vitest 单元测试
npm run test:e2e           # Playwright E2E 测试
npm run build              # 生产构建（前端 + 后端）
npm run build:desktop      # 构建桌面应用（当前平台）
npm run build:desktop:win  # 构建 Windows 安装包
npm run build:desktop:mac  # 构建 macOS 安装包
```

---

## 项目结构

```
src/                      React 前端
  components/             UI 组件 + 特效组件
  pages/                  页面路由（11 个功能页面）
  hooks/                  自定义 Hooks（动画/交互）
  lib/animation/          弹簧动画系统

api/                      tRPC 路由 + 服务层
  lib/ai-service-v3/      30 框架目录中心 + AI Provider
  services/ai/            6 个 AI Provider + 解码策略 + ToT
  services/clarify/       任务分类器 + 领域知识 + 策略路由
  services/promptforge/   OPRO 引擎 + LLM-as-Judge + 生成服务
  services/framework/     框架知识图谱 + 匹配引擎
  services/agent/         Agent Swarm 协作引擎
  services/multimodal/    多模态提示词引擎
  services/quality/       质量门禁 + Drift Detection
  services/academic/      学术引用 + 实验复现报告
  services/projects/      项目 CRUD + 生命周期
  rest-router.ts          REST API 开放端点

native/                   Rust Native Addon
  src/                    Rust 源码
    db/                   SQLite 数据库 + CRUD
    crypto/               AES-256-GCM 加密
    ai/                   AI HTTP 客户端
    lib.rs                NAPI-RS 导出
  index.d.ts              TypeScript 类型定义
  Cargo.toml              Rust 配置

db/                       纯 TypeScript 类型定义（原 Drizzle Schema）
  schema.ts               所有表结构的 TS 接口
electron/                 Electron 主进程 + preload + IPC
```

---

## 质量指标

| 指标 | 状态 |
|------|------|
| 单元测试 | **300** 项通过 |
| E2E 测试 | **25** 项通过（Playwright Electron）
| 类型检查 | ✅ 通过 |
| 生产构建 | ✅ 通过 |
| 框架分类准确率 | **81.8%** (9/11) |

---

## 文档

| 文档 | 说明 |
|------|------|
| [LICENSE](LICENSE.md) | 非商业使用许可 |
| [CHANGELOG](docs/CHANGELOG.md) | 版本变更日志 |
| [CONTRIBUTING](docs/CONTRIBUTING.md) | 贡献指南 |
| [ATTRIBUTION](docs/ATTRIBUTION.md) | 论文与框架来源 |
| [SECURITY](docs/SECURITY_CHECKLIST.md) | 安全检查清单 |
| [docs/TASKS_ATOMIC.md](docs/TASKS_ATOMIC.md) | 原子任务清单与迭代路线图 |

---

## 致谢

本项目的设计思想和提示词框架体系，参考和借鉴了以下开源项目、学术论文与社区资源：

### 开源项目
- [Prompt-Engineering-Guide](https://github.com/dair-ai/Prompt-Engineering-Guide) by DAIR.AI — 提示词工程领域最权威的社区指南
- [LangGPT](https://github.com/EmbraceAGI/LangGPT) — 结构化提示词编程框架
- [awesome-prompts](https://github.com/ai-boost/awesome-prompts) by AI Boost
- [awesome-prompt-engineering](https://github.com/tysoncung/awesome-prompt-engineering) by Tyson Cung
- [prompt-architect](https://github.com/nati112/prompt-architect) by nati112

### 学术论文
- [OPRO: Large Language Models as Optimizers](https://arxiv.org/abs/2309.03409) — Yang et al., Google DeepMind, 2023
- [Tree of Thoughts: Deliberate Problem Solving with Large Language Models](https://arxiv.org/abs/2305.10601) — Yao et al., NeurIPS 2023
- [Self-Consistency Improves Chain of Thought Reasoning in LLMs](https://arxiv.org/abs/2203.11171) — Wang et al., ICLR 2023
- [Chain-of-Thought Prompting Elicits Reasoning in Large Language Models](https://arxiv.org/abs/2201.11903) — Wei et al., NeurIPS 2022
- [ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629) — Yao et al., ICLR 2023
- [Self-Refine: Iterative Refinement with Self-Feedback](https://arxiv.org/abs/2303.17651) — Madaan et al., NeurIPS 2023
- [Language Models are Few-Shot Learners](https://arxiv.org/abs/2005.14165) — Brown et al., NeurIPS 2020
- [LangGPT: Rethinking Structured Reusable Prompt Design](https://arxiv.org/abs/2402.16929) — Wang et al., 2024

> 完整的引用列表、框架来源说明与技术栈致谢，请查阅 [docs/ATTRIBUTION.md](docs/ATTRIBUTION.md)。

---

## 许可证

本项目采用**非商业使用许可**。允许个人学习、研究、教学、非盈利使用。禁止商业使用、转售、嵌入商业产品。详见 [LICENSE](LICENSE.md)。

<div align="center">

*Built by TipAi Team · 2026*

</div>
