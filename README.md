<div align="center">

<img src="./public/logo.png" alt="TipAi Logo" width="120">

<h1>✨ TipAi</h1>

**智能提示词工程平台 · Electron 桌面端**

> 从模糊需求到精准提示词的全链路工程化工具

<p>
  <a href="https://github.com/aitippro/TipAi/actions/workflows/ci.yml"><img src="https://github.com/aitippro/TipAi/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/License-Non--Commercial-red?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/Node-22+-green?style=flat-square" alt="Node">
  <img src="https://img.shields.io/badge/Electron-v41+-9feaf9?style=flat-square&logo=electron" alt="Electron">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite" alt="SQLite">
</p>

</div>

---

## 项目简介

**TipAi** 是一款 Electron 桌面端提示词工程工具。输入模糊需求，AI 引导式 → 动态生成调优选项 → 一键输出精准可用的提示词。

### 亮点

| 🎨 Apple 风格 | 🔒 本地优先 | 🤖 多模型 AI |
|:---|:---|:---|
| 毛玻璃、SF Pro 字体、精致动画 | SQLite 存储，数据完全可控 | Kimi · OpenAI · Claude · DeepSeek · Gemini · Ollama |

---

## 已实现功能

### AI 模型层

| 功能 | 说明 |
|------|------|
| **多模型 AI 接入** | 统一 `AIModelProvider` 抽象层，支持 Kimi / OpenAI / Claude / DeepSeek / Gemini |
| **智能路由** | 按任务类型自动选最优模型，故障自动降级 |
| **Ollama 离线模式** | 本地模型接入，断网也能用 |

### 核心功能

| 功能 | 说明 |
|------|------|
| **Clarify 需求澄清** | AI 引导式多轮对话，将模糊需求转化为结构化摘要 |
| **Prompt Optimizer** | 策略选择 + Diff 对比，一键优化提示词 |
| **Batch Export** | JSON / Markdown 批量导出，支持筛选过滤 |
| **API Key 管理** | AES-256-GCM 加密存储，多模型 Key 管理 |
| **动态提示词生成** | 基于 Microsoft Dynamic PRC 的两层控件系统，实时重生成 |

### 平台与工程

| 功能 | 说明 |
|------|------|
| **Electron 桌面端** | Windows/macOS 跨平台，NSIS 安装包 + Portable 绿色版 |
| **Apple 设计系统** | 毛玻璃、SF Pro 字体、圆角 0.625rem、层级阴影 |
| **SQLite 本地存储** | Drizzle ORM + better-sqlite3，事务安全 |
| **用户认证** | JWT (jose) + bcrypt 12 rounds，支持本地登录 |
| **CI/CD** | GitHub Actions：tsc → lint → test → build |

---

## 技术栈

| 层级 | 技术 |
|------|------|
| **桌面** | Electron 41 |
| **前端** | React 19 · TypeScript 5.9 · Vite 7 · Tailwind CSS 3 · shadcn/ui (Radix) |
| **API** | Hono 4 · tRPC 11 |
| **数据库** | SQLite (better-sqlite3) · Drizzle ORM |
| **AI** | OpenAI SDK 兼容 · SSE 流式 · jose JWT · bcryptjs |
| **测试** | Vitest 4 |
| **打包** | Electron Builder (NSIS / DMG) |
| **CI** | GitHub Actions |

---

## 快速开始

```bash
git clone https://github.com/aitippro/TipAi.git
cd TipAi

# 安装依赖（跳过 Electron 二进制下载可加速）
ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm install

# 配置环境变量
cp .env.example .env

# 初始化数据库
npm run db:push

# 启动开发
npm run dev            # Web 模式
npm run dev:electron   # 桌面模式
```

### 环境要求

- Node.js ≥ 22
- npm ≥ 10

---

## 项目结构

```
src/              React 前端（页面、组件、hooks、providers）
  components/
    ui/           shadcn/ui 组件库
    clarify/      F1 需求澄清
    optimizer/    F2 提示词优化
    export/       F3 批量导出
    dynamic-prompt/ F6 动态提示词生成
api/              tRPC 后端路由 + 服务层
  services/ai/    多模型 Provider（kimi/openai/claude/deepseek/gemini/ollama）
  lib/            工具库（加密、离线检测、AI 客户端）
db/               Drizzle schema + 迁移 + 种子
electron/         Electron 主进程 + 预加载
contracts/        共享类型定义
```

---

## 开发

```bash
npm run check     # TypeScript 类型检查
npm run lint      # ESLint
npm run test      # Vitest 单元测试
npm run build     # 生产构建
```

CI 管线：`tsc -b` → `eslint` → `vitest` → `build`

---

## 路线图

已完成的全部功能请参阅 [DEV_TASKS.md](./DEV_TASKS.md)，未来规划请参阅 [ROADMAP.md](./ROADMAP.md)。

---

## 文档

| 文档 | 说明 |
|------|------|
| [CONTRIBUTING.md](./CONTRIBUTING.md) | 贡献指南 |
| [CHANGELOG.md](./CHANGELOG.md) | 版本记录 |
| [ATTRIBUTION.md](./ATTRIBUTION.md) | 致谢与引用 |
| [LICENSE.md](./LICENSE.md) | 许可协议 |
| [SECURITY_CHECKLIST.md](./SECURITY_CHECKLIST.md) | 安全检查清单 |

---

## 致谢

- [Prompt-Engineering-Guide](https://github.com/dair-ai/Prompt-Engineering-Guide) by DAIR.AI
- [LangGPT](https://github.com/EmbraceAGI/LangGPT)
- [Dynamic Prompt Middleware](https://arxiv.org/pdf/2412.02357) by Microsoft Research

完整引用见 [ATTRIBUTION.md](./ATTRIBUTION.md)。

---

## 许可证

本项目采用**非商业使用许可**。详见 [LICENSE.md](./LICENSE.md)。

- 允许：个人学习、研究、教学、非盈利使用
- 禁止：商业使用、转售、嵌入商业产品

---

<div align="center">

*Built by TipAi Team · 2026*

</div>
