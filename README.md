<div align="center">

<img src="public/logo.png" alt="TipAi" width="96">

# ✨ TipAi

**智能提示词工程平台 · Electron 桌面端**

> 从模糊需求到精准提示词，全链路 AI 驱动

<a href="https://github.com/aitippro/TipAi/actions/workflows/ci.yml"><img src="https://github.com/aitippro/TipAi/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
<a href="https://github.com/aitippro/TipAi/releases"><img src="https://img.shields.io/github/v/release/aitippro/TipAi?style=flat-square" alt="Release"></a>
<img src="https://img.shields.io/badge/License-Non--Commercial-red?style=flat-square" alt="License">
<img src="https://img.shields.io/badge/Electron-41-9feaf9?style=flat-square&logo=electron" alt="Electron">
<img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React">
<img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript" alt="TS">
<img src="https://img.shields.io/badge/SQLite-local-003B57?style=flat-square&logo=sqlite" alt="SQLite">

</div>

---

## 简介

**TipAi** 是一款本地优先的桌面端提示词工程工具。输入模糊需求，AI 自动分析意图、生成调优选项、输出精准可用的提示词。所有数据存储在本地 SQLite，无需注册账号。

### 亮点

| 🎨 Apple 风格 | 🔒 本地优先 | 🤖 多模型 AI |
|:---|:---|:---|
| 毛玻璃、SF Pro 字体、弹性动画 | SQLite 存储，无需联网 | Kimi · OpenAI · Claude · DeepSeek · Gemini · Ollama |

---

## 功能

### AI 模型层
- **6 个 AI Provider** — 统一接口，支持 Kimi / OpenAI / Claude / DeepSeek / Gemini / Ollama
- **智能路由** — 按任务类型自动选最优模型，故障自动降级
- **离线模式** — Ollama 本地模型，断网也能用

### 核心功能
- **Clarify** — AI 引导式多轮对话，将模糊需求转化为结构化摘要
- **Optimizer** — 策略选择 + Diff 对比，一键优化提示词
- **Export** — JSON / Markdown 批量导出，支持筛选过滤
- **API Key 管理** — AES-256-GCM 加密存储到本地数据库
- **动态提示词生成** — 两层控件系统，实时重生成
- **提示词生命周期** — 六阶段流水线管理

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面 | Electron 41 |
| 前端 | React 19 · TypeScript 5.9 · Vite 7 · Tailwind CSS 3 · shadcn/ui |
| API | Hono 4 · tRPC 11 |
| 数据库 | SQLite (better-sqlite3) · Drizzle ORM |
| 加密 | AES-256-GCM · jose JWT · bcryptjs |
| 测试 | Vitest 4 |
| 打包 | Electron Builder (Portable / DMG) |
| CI/CD | GitHub Actions |

---

## 快速开始

### 环境要求
- Node.js ≥ 22，npm ≥ 10
- Windows 10+ / macOS 13+

### 安装

```bash
git clone https://github.com/aitippro/TipAi.git
cd TipAi
npm install
npm run db:push
npm run dev              # Web 模式
npm run dev:electron     # 桌面模式
```

### 生产构建

```bash
npm run build              # 构建
npm run build:desktop:win  # Windows (.exe)
npm run build:desktop:mac  # macOS (.dmg)
```

---

## 项目结构

```
src/              React 前端
  components/ui/  shadcn/ui 组件库
  components/     clarify / optimizer / export / dynamic-prompt
api/              tRPC 路由 + 服务层
  services/ai/    6 个 AI Provider
db/               Drizzle schema + 迁移
electron/         主进程 + preload
contracts/        共享类型定义
docs/             项目文档
```

---

## 开发

```bash
npm run check     # tsc 类型检查
npm run lint      # ESLint
npm run test      # Vitest
npm run build     # 生产构建
```

CI 管线：`check` → `lint` → `test` → `build`

---

## 文档

| 文档 | 说明 |
|------|------|
| [许可协议](LICENSE.md) | 非商业使用许可 |
| [贡献指南](docs/CONTRIBUTING.md) | 如何参与 |
| [版本记录](docs/CHANGELOG.md) | 变更日志 |
| [致谢引用](docs/ATTRIBUTION.md) | 论文与框架来源 |
| [安全检查](docs/SECURITY_CHECKLIST.md) | 安全清单 |
| [路线图](docs/ROADMAP.md) | 未来规划 |
| [迭代进度](docs/ITERATION_PROGRESS.md) | 开发进度 |

---

## 致谢

- [Prompt-Engineering-Guide](https://github.com/dair-ai/Prompt-Engineering-Guide) by DAIR.AI
- [LangGPT](https://github.com/EmbraceAGI/LangGPT)
- [Dynamic Prompt Middleware](https://arxiv.org/pdf/2412.02357) by Microsoft Research

---

## 许可证

本项目采用**非商业使用许可**。允许个人学习、研究、教学、非盈利使用。禁止商业使用、转售、嵌入商业产品。详见 [LICENSE.md](LICENSE.md)。

<div align="center">

*Built by TipAi Team · 2026*

</div>
