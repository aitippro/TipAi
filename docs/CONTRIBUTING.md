# 贡献指南

欢迎参与 TipAi 项目。

---

## 接受的贡献

| 类型 | 途径 |
|------|------|
| Bug 报告 | [Issues](https://github.com/aitippro/TipAi/issues) |
| 文档勘误 | Issue 或 PR |
| 安全漏洞 | 直接联系维护者（勿公开提交） |

---

## 不接受的贡献

- 核心代码修改（AI 生成链路、认证系统、数据库 schema）
- 依赖替换或技术栈变更
- 商业推广内容

---

## 开发环境

### 技术栈

| 层级 | 技术 |
|------|------|
| 桌面 | Electron 41 |
| 前端 | React 19 · TypeScript 5.9 · Vite 7 · Tailwind CSS 3 · shadcn/ui |
| API | Hono 4 · tRPC 11 |
| 数据库 | SQLite · Drizzle ORM |
| 测试 | Vitest 4 |
| CI | GitHub Actions |

### 开发工作流

本项目使用 **cc-workspace** 多智能体编排工作流：

```
需求 → team-lead 制定计划 → implementer 实现 → reviewer 审查 → security-auditor 审计 → 合并
```

所有代码变更经过 CI 管线验证：

```bash
npm run check     # tsc -b 类型检查
npm run lint      # ESLint
npm run test      # Vitest
npm run build     # 生产构建
```

### Commit 规范

```
feat:    新功能
fix:     修复
docs:    文档
chore:   工程配置
test:    测试
security: 安全修复
refactor: 重构
```

---

## 代码风格

- TypeScript 严格模式 (`strict: true`)
- 遵循项目已有的代码模式和架构约定
- 禁止硬编码密钥、本地路径、IP 地址
- API Key 通过 AES-256-GCM 加密存储
- `.claude/` 目录禁止推送

---

## 行为准则

- 尊重开源社区和学术诚信
- 不得用于商业竞争或恶意抄袭
- 不得用于训练商业 AI 模型

项目维护者保留所有贡献的审核权和拒绝权。
