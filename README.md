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

### 环境要求

- **Node.js** ≥ 22
- **npm** ≥ 10
- **Windows 10+** / macOS 13+ (Windows 为主要目标平台)

### 安装

```bash
git clone https://github.com/aitippro/TipAi.git
cd TipAi

# 推荐：跳过 Electron 二进制下载以加速安装（Electron 二进制较大且可能被墙）
ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm install

# 如果需要打包桌面应用，再单独安装 Electron
# npx electron-rebuild 2>/dev/null
```

### 配置

```bash
cp .env.example .env
# 编辑 .env，按需填入 AI 模型 API Key
```

### 初始化数据库

```bash
npm run db:push
```

### 启动开发

| 命令 | 模式 | 说明 |
|------|------|------|
| `npm run dev` | Web 开发 | Vite 在 `localhost:5173` 启动，API 由 Vite 内置代理处理 |
| `npm run dev:electron` | 桌面开发 | Electron 窗口 + Vite HMR，**API 走 IPC 不占用额外端口** |

> **Windows 注意**: Electron 桌面模式采用 IPC 架构 — 主进程直接调用 Hono 应用处理 API 请求，无需启动独立 HTTP 服务。前端仅通过 `preload` 暴露的 `window.electronAPI.fetch()` 与后端通信，避免了端口占用和本地网络暴露。

### 生产构建

```bash
npm run build              # 构建前端 + 后端
npm run start              # 生产模式启动 (cross-env 兼容 Windows)
npm run build:desktop:win  # 打包 Windows 桌面应用 (.exe portable)
npm run build:desktop:mac  # 打包 macOS 桌面应用 (.dmg)
```

### 项目结构

```
src/              React 前端（页面、组件、hooks、providers）
  components/
    ui/           shadcn/ui 组件库
    clarify/      需求澄清
    optimizer/    提示词优化
    export/       批量导出
    dynamic-prompt/ 动态提示词生成
api/              tRPC 后端路由 + 服务层
  services/ai/    多模型 Provider（kimi/openai/claude/deepseek/gemini/ollama）
  lib/            工具库（加密、离线检测、AI 客户端）
db/               Drizzle schema + 迁移 + 种子数据
electron/         Electron 主进程 + preload + 自动更新
contracts/        共享类型定义
```

### 架构

```
┌─ Electron 桌面模式 ─────────────────────────┐
│                                              │
│  Renderer (React)                            │
│    │ window.electronAPI.fetch()              │
│    ▼                                         │
│  IPC (ipcMain.handle 'api:fetch')            │
│    │                                          │
│    ▼                                         │
│  Main Process ── Hono App (进程内调用)       │
│    ├─ tRPC Router                            │
│    ├─ Drizzle ORM → SQLite (better-sqlite3)  │
│    └─ AI Providers (Kimi/OpenAI/DeepSeek…)   │
│                                              │
│  🚫 无 HTTP 端口暴露 (API 走 IPC)           │
│  🔒 仅 127.0.0.1 回环 (静态资源服务)        │
└──────────────────────────────────────────────┘

┌─ Web 开发模式 ───────────────────────────────┐
│  Vite Dev Server (localhost:5173)            │
│    ├─ React HMR (热模块替换)                  │
│    └─ @hono/vite-dev-server (API 代理)       │
└──────────────────────────────────────────────┘
```

---

## 开发

```bash
npm run check     # TypeScript 类型检查
npm run lint      # ESLint
npm run test      # Vitest 单元测试
npm run build     # 生产构建
npm run db:push   # 同步数据库 Schema
npm run db:seed   # 填充种子数据
```

CI 管线：`tsc -b` → `eslint` → `vitest` → `build`

### Windows 平台注意事项

- 数据目录：`%APPDATA%/TipAi/`（数据库、备份、导出均在此目录下）
- 数据库：`%APPDATA%/TipAi/data.db`（SQLite WAL 模式）
- 快捷键：`Ctrl+K` 打开命令面板（macOS 上为 `Cmd+K`）
- 生产构建使用 `cross-env` 确保跨平台兼容
- 推荐使用 Git Bash 或 PowerShell 运行脚本

---

## 路线图

已完成的全部功能请参阅 [DEV_TASKS.md](./DEV_TASKS.md)，未来规划请参阅 [ROADMAP.md](./ROADMAP.md)。

---

## 文档

| 文档 | 说明 |
|------|------|
| [LICENSE.md](./LICENSE.md) | 许可协议 |
| [贡献指南](./docs/CONTRIBUTING.md) | 如何贡献 |
| [版本记录](./docs/CHANGELOG.md) | 变更日志 |
| [致谢引用](./docs/ATTRIBUTION.md) | 论文与框架来源 |
| [安全检查](./docs/SECURITY_CHECKLIST.md) | 安全清单 |
| [路线图](./docs/ROADMAP.md) | 未来规划 |
| [迭代计划](./docs/ITERATION_PROGRESS.md) | 开发进度 |

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
