<div align="center">



# ✨ TipAi

**智能提示词工程平台**

> 将任何规模的模糊需求转化为精准可用的提示词 —— 
> 从一句话到百页文档的工程化项目，全链路覆盖

[![CI](https://github.com/aitippro/AI-prompt/actions/workflows/ci.yml/badge.svg)](https://github.com/aitippro/AI-prompt/actions/workflows/ci.yml)
![License](https://img.shields.io/badge/License-Non--Commercial-red?style=flat-square)
![Node](https://img.shields.io/badge/Node-22+-green?style=flat-square)
![Electron](https://img.shields.io/badge/Electron-v35+-9feaf9?style=flat-square&logo=electron)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript)

[🚀 快速开始](#快速开始) · [📖 文档](#文档) · [🛣️ 路线图](#路线图) · [🤝 贡献](#贡献指南) · [⚖️ 许可](#许可证)

</div>

---

## 🎯 项目简介

**TipAi** 是一个专注于提示词工程（Prompt Engineering）的**桌面端应用**，帮助用户系统化地生成、优化和管理 AI 提示词。

### 为什么选择 TipAi？

| 🎨 Apple 设计系统 | 🔒 本地优先 | 🤖 AI 驱动 |
|:---|:---|:---|
| 毛玻璃效果、精致圆角、SF Pro 字体 | SQLite 本地存储，数据完全可控 | Kimi API 智能生成与优化 |

### 核心能力

- **需求理解** — AI 引导式需求澄清，自动探测意图
- **智能生成** — 基于 20+ 成熟框架一键生成高质量提示词
- **一键优化** — Diff 对比、策略选择、历史追踪
- **模板市场** — 6 大领域精选模板，开箱即用
- **工程化管理** — 项目级工作空间、版本控制、变更追踪

> ⚠️ **本项目采用 [非商业使用许可](./LICENSE.md)**，禁止用于任何商业目的。

---

## ✨ 核心功能

### 🏗️ v0.1.1 当前版本

| 功能 | 状态 | 描述 |
|------|------|------|
| **Prompt Forge** | ✅ | 20+ 框架提示词生成（CO-STAR、LangGPT、Chain-of-Thought 等）|
| **Template Market** | ✅ | 6 大领域精选模板市场 |
| **本地登录** | ✅ | 用户名密码登录（bcrypt 哈希，开发环境）|
| **Kimi OAuth** | ✅ | 一键登录集成 |
| **Apple 设计系统** | ✅ | 毛玻璃 UI、精致圆角、SF Pro 字体 |
| **SQLite 本地数据库** | ✅ | better-sqlite3，零配置启动 |

### 🔮 即将推出

- 🎯 **Clarify** — AI 引导式需求澄清对话
- ⚡ **Prompt Optimizer** — 一键优化 + Diff 对比
- 📦 **Batch Export** — JSON/Markdown 批量导出
- 🔄 **Prompt Chain** — 多步骤提示词链
- 📊 **Requirement Drift Detection** — 需求漂移检测

[查看完整路线图 →](#路线图)

---

## 🖥️ 桌面端应用

TipAi 是**原生桌面应用**，不是 Web 应用。

```
┌─────────────────────────────────────────┐
│  TipAi                              [_] │  ← macOS 风格标题栏
├─────────────────────────────────────────┤
│  📁 生成  📚 库  🏪 模板  ⚙️ 设置  ℹ️  │  ← 侧边栏导航
├─────────────────────────────────────────┤
│                                         │
│   ┌─────────────────────────────────┐   │
│   │  ✨ 输入你的需求...              │   │  ← 毛玻璃卡片
│   │                                  │   │
│   │  [生成提示词]                     │   │
│   └─────────────────────────────────┘   │
│                                         │
│   ┌────────────┐  ┌──────────────────┐  │
│   │ CO-STAR    │  │ Chain-of-Thought │  │  ← 模板选择
│   │ LangGPT    │  │ ReAct            │  │
│   │ ...        │  │ ...              │  │
│   └────────────┘  └──────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

### 下载

| 平台 | 状态 | 下载 |
|------|------|------|
| Windows (.exe) | 🔄 开发中 | — |
| macOS (.dmg) | 📋 计划中 | — |
| Linux (.AppImage) | 📋 计划中 | — |

当前可通过源码构建运行（见[快速开始](#快速开始)）。

---

## 🛠️ 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| **桌面端** | Electron 35 | 跨平台桌面应用框架 |
| **前端** | React 19 + TypeScript 5.9 | UI 框架 |
| **构建** | Vite 7 | 构建工具 |
| **样式** | Tailwind CSS 3 + Apple Design System | CSS 框架 |
| **后端** | Hono 4 + tRPC 11 | Web 框架与类型安全 API |
| **数据库** | Drizzle ORM + SQLite (better-sqlite3) | 本地数据库 |
| **测试** | Vitest 4 | 单元测试框架 |
| **CI/CD** | GitHub Actions | 自动化检查与构建 |

---

## 🚀 快速开始

### 环境要求
- Node.js ≥ 22
- npm ≥ 10

### 1. 克隆仓库

```bash
git clone https://github.com/aitippro/AI-prompt.git
cd AI-prompt
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 填入真实配置（开发环境可保持默认值）
```

关键环境变量：

| 变量 | 说明 | 必填 |
|------|------|------|
| `APP_ID` | Kimi OAuth App ID | 生产 ✅ |
| `APP_SECRET` | Kimi OAuth App Secret | 生产 ✅ |
| `OWNER_UNION_ID` | 管理员 unionId | 生产 ✅ |
| `API_KEY_SECRET` | API Key 加密密钥 | 生产 ✅ |

### 4. 数据库初始化

```bash
# 推送 schema（SQLite 自动创建文件）
npm run db:push

# 运行种子数据（创建 admin 测试用户、默认模板）
# 注意：仅在开发环境执行
npm run db:seed
```

测试账号：`admin` / `admin`

### 5. 启动开发服务器

```bash
# Web 模式（浏览器访问）
npm run dev

# Electron 桌面模式
npm run dev:electron
```

### 6. 构建桌面应用

```bash
# Windows .exe
npm run build:desktop:win

# macOS .dmg
npm run build:desktop:mac

# Linux .AppImage
npm run build:desktop:linux
```

---

## 🧪 测试

```bash
# 类型检查
npm run check

# ESLint
npm run lint

# 单元测试
npm run test
```

---

## 🛣️ 路线图

| 版本 | 主题 | 核心功能 | 状态 |
|------|------|----------|------|
| **v0.1.1** | Electron 桌面端 | 本地 SQLite、Apple 设计系统、Windows 打包 | 🔄 进行中 |
| **v0.2.0** | 需求理解与单提示词 | Clarify、Intent Analyzer、Prompt Optimizer | 📋 规划中 |
| **v0.2.1** | 体验与数据流通 | 主题系统、批量导出/导入、移动端适配 | 📋 规划中 |
| **v0.3.0** | 多步骤工程化 | Prompt Chain、阶段里程碑、自动框架匹配 | 📋 规划中 |
| **v0.3.1** | 验证与验收 | 验收标准、A/B 测试、质量门禁 | 📋 规划中 |
| **v0.4.0** | 项目级管理 | 工作空间、版本控制、需求漂移检测 | 📋 规划中 |
| **v0.4.1** | 交付与协作 | 交付物生成、客户门户、交互式手册 | 📋 规划中 |
| **v0.5.0** | 持续演进 + 生态 | 实时监控、自动进化、API 开放接口 | 📋 规划中 |

**总计 53 项功能**。

---

## 📚 文档

| 文档 | 说明 |
|------|------|
| [ATTRIBUTION.md](./ATTRIBUTION.md) | 致谢与引用 — 20+ 提示词框架来源 |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | 贡献指南 |
| [CHANGELOG.md](./CHANGELOG.md) | 版本记录 |
| [LICENSE.md](./LICENSE.md) | 非商业使用许可 |

---

## 🙏 致谢

核心参考：

- [Prompt-Engineering-Guide](https://github.com/dair-ai/Prompt-Engineering-Guide) by DAIR.AI
- [LangGPT](https://github.com/EmbraceAGI/LangGPT) — 结构化提示词编程框架
- [awesome-prompts](https://github.com/ai-boost/awesome-prompts) — 精选提示词资源库

完整引用列表见 [ATTRIBUTION.md](./ATTRIBUTION.md)。

---

## 🤝 贡献指南

欢迎 Bug 报告、文档勘误、翻译贡献！

详见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

---

## ⚖️ 许可证

**本项目采用 [非商业使用许可](./LICENSE.md)**。

- ✅ 允许：个人学习、研究、教学、非盈利项目
- 🚫 禁止：商业使用、转售、嵌入商业产品

商业授权请联系项目维护者。

---

<div align="center">

**使用本软件即表示您已阅读、理解并同意遵守 [LICENSE.md](./LICENSE.md) 的所有条款。**

*Built with ❤️ by TipAi Team | 2026*

</div>
