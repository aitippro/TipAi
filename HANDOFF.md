# 开发任务交接文档

> 生成时间: 2026-04-28 09:59 CST
> 交接人: 小龙坎 (主代理)
> 接收人: 新 Dev Agent

---

## 1. 仓库基础信息

| 项目 | 值 |
|------|-----|
| 仓库 | https://github.com/aitippro/TipAi.git |
| 分支 | main |
| 最新提交 | `468bf8a` |
| 项目路径 | `/root/.openclaw/workspace/github-maint/AI-prompt/` |

---

## 2. 已完成功能

| 任务 | 提交 | 文件数 | 说明 |
|------|------|--------|------|
| AI-1 多模型接入 | (早期提交) | — | DeepSeek/OpenAI/Gemini/Kimi 统一抽象层 |
| E1-E5 Electron 基础 | `3f21825` | — | 架构 + Apple 设计系统 + 窗口导航 + SQLite + 打包 |
| F1 Clarify 需求澄清 | `35a666c` | 19 files | 多轮对话、需求摘要、Projects/ProjectDetail 页面 |
| F2 Prompt Optimizer | `fb1fedc` | 10 files | 策略选择、Diff 对比、优化历史 |
| F3 Batch Export | `1953382` | 7 files | JSON/Markdown 导出、筛选过滤、下载 |
| 开发计划文件入仓 | `468bf8a` | 3 files | DEV_TASKS.md + ROADMAP.md 纳入版本控制 |

---

## 3. 待办队列 (按优先级)

### P1 — 核心功能 (Phase 2 剩余)

- [ ] **F4. 本地 API Key 管理**
  - 加密存储 (AES-256-GCM)
  - 多模型支持 (Kimi/OpenAI/Claude/DeepSeek)
  - Key 有效性检测
  - 参考: `src/pages/Settings.tsx` 已有 API Key 输入界面框架

- [ ] **F5. 离线模式支持**
  - 本地模型接入 (Ollama)
  - 缓存策略
  - 离线状态提示

### P2 — 测试与优化 (Phase 4)

- [ ] **T1. 单元测试覆盖**
- [ ] **T2. E2E 测试**
- [ ] **T3. 性能优化**

### P3 — 技术债务

- [ ] **D1. 移除 mysql2 依赖**
- [ ] **D2. 清理废弃代码**
- [ ] **D3. 更新文档**
- [ ] **D4. TypeScript 严格模式**

---

## 4. 代码规范与陷阱

### 4.1 Zod v4 语法变化
```typescript
// ❌ Zod v3 写法
z.record(z.string())
z.string().max(100)

// ✅ Zod v4 正确写法
z.record(z.string(), z.unknown())
// .max() 行为有变化，需验证
```

### 4.2 tRPC 自定义类型转换
自定义类型无法直接传给 tRPC mutation，需要 `as unknown as Record<string, unknown>`:
```typescript
questionData: currentQuestion as unknown as Record<string, unknown>,
```

### 4.3 Apple 设计系统
- CSS 变量定义在 `src/index.css`
- 圆角规范: `0.625rem` (`rounded-xl`)
- 阴影: `--apple-shadow`, `--apple-shadow-lg`
- 毛玻璃: `backdrop-filter: blur(20px) saturate(180%)`
- 字体栈: SF Pro Display / SF Pro Text

### 4.4 项目结构
```
src/           — React + TypeScript + Tailwind 前端
api/           — tRPC 后端路由
  services/    — 业务逻辑
  services/ai/ — AI 模型接入 (AI-1)
db/            — SQLite + Drizzle ORM
contracts/     — 共享类型定义
```

### 4.5 构建检查
```bash
npm run check   # tsc -b (项目引用构建)
npm run lint    # ESLint
npm run build   # Vite 构建
```

### 4.6 开发任务文件规则
- `DEV_TASKS.md` 只存在本地，**不要推送到远程**
- 但用户已允许，当前已纳入 git 追踪
- 代码本身正常推送

---

## 5. 已知技术债务

| 文件 | 问题 | 类型 |
|------|------|------|
| `db/backup.ts` | `Property 'exec' does not exist on type 'Database'` | 旧类型错误 |
| `db/init.ts` | `Property 'exec' does not exist on type 'Database'` | 旧类型错误 |
| `db/migrate.ts` | `Property 'transaction' does not exist` | 旧类型错误 |
| `db/seed.ts` | `'rawDb' is assigned but never used` | lint 警告 |
| `ai-service-v2.ts` | `'insertStmt' is assigned but never used` | lint 警告 |

> 这些错误**非阻塞**，`src/` 和 `api/` 目录代码已全绿。

---

## 6. 子代理使用经验

### ⚠️ 重要经验

F1、F2、F3 三个子代理均出现 **"声称完成但实际未提交代码"** 问题。

**正确流程**:
1. 子代理声称完成 → **不要直接信任**
2. 主代理执行 `git status` 验证是否真有修改
3. 运行 `npm run check` 和 `npm run lint`
4. 修复残留错误（子代理经常遗留 lint/type 错误）
5. `git add -A && git commit -m "feat: XX" && git push origin main`
6. 更新 `DEV_TASKS.md` 标记完成
7. 向用户汇报

**子代理超时**: 30 分钟 (`runTimeoutSeconds: 1800`)

---

## 7. 下一步建议

建议按顺序推进:
1. **F4 API Key 管理** — 用户多模型需求迫切，Settings 页面已有框架
2. **F5 离线模式** — Ollama 接入
3. **D1-D4 技术债务** — 清理后再进入测试阶段

---

## 8. 快速上手

```bash
cd /root/.openclaw/workspace/github-maint/AI-prompt/
git pull origin main
npm install        # 如需要
npm run check      # 确认类型检查通过
npm run lint       # 确认 lint 通过
```

---

*文档由主代理自动生成，供新 Dev Agent 接手使用。*
