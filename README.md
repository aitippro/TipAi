# TipAi — AI 提示词工程平台

> 一个面向提示词工程师和 AI 应用开发者的结构化提示词生成与管理系统。

[![CI](https://github.com/aitippro/AI-prompt/actions/workflows/ci.yml/badge.svg)](https://github.com/aitippro/AI-prompt/actions/workflows/ci.yml)
![License](https://img.shields.io/badge/License-Non--Commercial-red)
![Node](https://img.shields.io/badge/Node-22+-green)

---

## 🎯 项目简介

**TipAi** 是一个专注于提示词工程（Prompt Engineering）的开源工具平台，帮助用户：

- **快速生成** — 基于 20+ 成熟框架（CO-STAR、LangGPT、Chain-of-Thought 等）一键生成高质量提示词
- **智能推荐** — 根据用户输入自动匹配最优提示词框架
- **模板市场** — 覆盖内容营销、编程开发、教育教学、数据分析、法律分析等 6 大领域的精选模板
- **安全管理** — 完整的 OAuth 认证、Rate Limiting、CORS 白名单、bcrypt 密码哈希

**适用场景**：个人学习、教学演示、研究项目、非盈利工具开发。

> ⚠️ **本项目采用 [非商业使用许可](./LICENSE.md)**，禁止用于任何商业目的。详见 [LICENSE.md](./LICENSE.md)。

---

## ✨ 核心功能

### 1. Prompt Forge 提示词工坊
- 支持 **20+ 提示词框架**：CO-STAR、RISEN、RTF、CRISPE、LangGPT、Chain-of-Thought、ReAct、Tree of Thoughts、Self-Refine 等
- **自动框架推荐**：基于用户意图匹配最佳框架
- 实时预览与一键生成
- 提示词历史记录与管理

### 2. Template Market 模板市场
- 6 大领域精选模板（内容营销、编程开发、教育教学、数据分析、法律分析、通用任务）
- 社区评分与使用统计
- 模板收藏与复用

### 3. 用户与认证
- **Kimi OAuth** 登录集成
- **本地用户名密码登录**（bcrypt 哈希，仅限开发/测试环境）
- JWT Session 管理（7 天有效期）
- 角色权限控制（user / admin）

### 4. AI 服务集成
- Kimi API v3 多轮对话支持
- 流式输出（SSE）
- 模型选择（kimi / kimi-k2）
- 温度/长度参数调节

### 5. 安全增强
- ✅ CORS 白名单校验（生产环境）
- ✅ 全局 Rate Limiting（30 次/分钟）
- ✅ AI 端点专项限流（5 次/分钟）
- ✅ OAuth state HMAC 签名 + nonce
- ✅ bcrypt 12 rounds 密码哈希
- ✅ npm audit: **0 vulnerabilities**

---

## 🛠️ 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| **前端** | React 19 + TypeScript ~5.9 | UI 框架 |
| **构建** | Vite 7 | 构建工具与开发服务器 |
| **样式** | Tailwind CSS 3 + shadcn/ui | CSS 框架与组件库 |
| **后端** | Hono 4 + tRPC 11 | Web 框架与类型安全 API |
| **数据库** | Drizzle ORM + MySQL | 类型安全 ORM |
| **测试** | Vitest 4 | 单元测试框架 |
| **CI/CD** | GitHub Actions | 自动化检查与构建 |

---

## 🚀 快速开始

### 环境要求
- Node.js ≥ 22
- MySQL ≥ 8.0

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
# 编辑 .env 填入真实配置
```

关键环境变量：

| 变量 | 说明 | 必填 |
|------|------|------|
| `APP_ID` | Kimi OAuth App ID | ✅ |
| `APP_SECRET` | Kimi OAuth App Secret | ✅ |
| `DATABASE_URL` | MySQL 连接字符串 | ✅ |
| `KIMI_AUTH_URL` | Kimi 认证地址 | ✅（生产环境）|
| `KIMI_OPEN_URL` | Kimi Open API 地址 | ✅（生产环境）|
| `OWNER_UNION_ID` | 管理员 unionId | ✅ |
| `API_KEY_SECRET` | API Key 加密密钥 | ✅（生产环境）|

### 4. 数据库初始化

```bash
# 推送 schema 到数据库
npm run db:push

# 运行种子数据（创建 admin 测试用户、默认模板）
# 注意：仅在开发环境执行
npm run db:seed
```

测试账号：`admin` / `admin`

### 5. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:3000`

### 6. 构建生产版本

```bash
npm run build
npm start
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

# 安全审计
npm audit
```

---

## 📚 项目文档

| 文档 | 说明 |
|------|------|
| [ATTRIBUTION.md](./ATTRIBUTION.md) | 致谢与引用 — 20+ 提示词框架来源、技术栈致谢 |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | 贡献指南 — Bug 报告、引用勘误、文档翻译 |
| [CHANGELOG.md](./CHANGELOG.md) | 版本记录 — v0.1.0 功能清单与规划 |
| [LICENSE.md](./LICENSE.md) | 非商业使用许可 — 禁止商用、转售、嵌入商业产品 |

---

## 🙏 致谢

本项目的设计思想和提示词框架体系，核心参考了：

- [Prompt-Engineering-Guide](https://github.com/dair-ai/Prompt-Engineering-Guide) by DAIR.AI
- [LangGPT](https://github.com/EmbraceAGI/LangGPT) — 结构化提示词编程框架
- [awesome-prompts](https://github.com/ai-boost/awesome-prompts) — 精选提示词资源库

完整引用列表见 [ATTRIBUTION.md](./ATTRIBUTION.md)。

---

## ⚠️ 许可证

**本项目采用 [非商业使用许可](./LICENSE.md)**。

- ✅ 允许：个人学习、研究、教学、非盈利项目
- 🚫 禁止：商业使用、转售、嵌入商业产品、数据训练

商业授权请联系项目维护者。

---

## 📬 联系与反馈

- Issues: [https://github.com/aitippro/AI-prompt/issues](https://github.com/aitippro/AI-prompt/issues)
- 安全漏洞报告：请直接联系项目维护者（勿通过公开 Issue）

---

**使用本软件即表示您已阅读、理解并同意遵守 [LICENSE.md](./LICENSE.md) 的所有条款。**

---

*Built with ❤️ by TipAi Team | 2026*
