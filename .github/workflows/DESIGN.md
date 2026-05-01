# TipAi CI/CD 工作流设计

## 现状盘点

现有 5 个 workflow，覆盖基础 CI、桌面端构建、发布、依赖审计、CodeQL 安全扫描。

**痛点：**
- PR 阶段没有独立 workflow，混在 push CI 里
- 无多 Node 版本矩阵测试
- 无 e2e / 冒烟测试集成
- 无覆盖率上报
- 无自动 changelog / 版本号管理
- 无 staging 部署流程
- 桌面端构建只有手动触发，无 nightly

---

## 目标架构：7 大工作流

```
┌─────────────────────────────────────────────────────────────┐
│  开发阶段 (PR)                                               │
│  ├─ ci.yml          → 多矩阵测试 + lint + TS检查 + 构建      │
│  ├─ pr-checks.yml   → PR 标题规范 + 文件大小检测 + lockfile  │
│  └─ preview.yml     → PR 预览环境部署 (可选)                  │
├─────────────────────────────────────────────────────────────┤
│  合并后 (main)                                               │
│  ├─ ci.yml          → 同上，合并后跑一遍                     │
│  ├─ nightly.yml     → 每晚构建桌面端 + 跑 e2e 测试            │
│  └─ deploy-staging.yml → 自动部署 staging (可选)              │
├─────────────────────────────────────────────────────────────┤
│  发布阶段 (tag)                                              │
│  ├─ release.yml     → CI → 桌面端构建 → GitHub Release        │
│  └─ changelog.yml    → 自动生成 changelog (可选)                │
├─────────────────────────────────────────────────────────────┤
│  持续维护                                                    │
│  ├─ audit.yml       → 每周依赖审计 + 自动提 PR               │
│  ├─ codeql.yml      → 安全扫描 (保留)                        │
│  └─ stale.yml       → 自动清理过期 issue/PR                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 工作流清单

### 1. ci.yml — 核心 CI（增强版）

**触发：** push(main), pull_request(main)

**任务矩阵：**
- OS: ubuntu-latest, windows-latest, macos-latest
- Node: 20, 22 (LTS + Current)

**步骤：**
1. Checkout
2. Setup Node (矩阵版本)
3. Cache npm + 额外 cache (vite, tsc)
4. `npm ci`
5. `npm run check` (TS 类型检查)
6. `npm run lint` (ESLint)
7. `npm run test` (Vitest + 覆盖率)
8. `npm run build` (Vite + esbuild)
9. Upload coverage to Codecov (可选)

**优化点：**
- 并行 job：lint / test / build 可以拆成独立 job 缩短总时长
- 条件跳过：仅前端文件变更时跳过后端 build，反之亦然

---

### 2. pr-checks.yml — PR 质量控制

**触发：** pull_request (opened, synchronize, reopened)

**检查项：**
- PR 标题规范 (conventional commits 格式)
- 文件数量预警 (>50 files 警告)
- 单文件大小检查 (>500KB 警告)
- lockfile 完整性 (package-lock.json 与 package.json 同步)
- 无 console.log / debugger 残留 (前端代码)

---

### 3. nightly.yml — 夜间构建

**触发：** schedule (cron: '0 2 * * *') + workflow_dispatch

**任务：**
- 全矩阵 CI
- 桌面端构建 (Win/Mac/Linux 如有需要)
- e2e 冒烟测试 (Playwright 或自定义)
- 生成 nightly 版本 artifact
- 上传到 artifact storage

**价值：**
- 提前发现跨平台构建问题
- 为 QA 提供每日测试包
- 桌面端构建耗时久，不适合放在每次 CI

---

### 4. release.yml — 发布流程（增强版）

**触发：** push (tags: v*)

**流程：**
1. CI Check (复用 ci.yml 结果或重新跑)
2. 生成 changelog (from git log)
3. 构建桌面端 (Win + Mac)
4. 创建 GitHub Release + 上传 artifact
5. 自动打 `latest` tag (可选)

**优化点：**
- 增加 release notes 自动生成
- 支持预发布版本 (prerelease)
- 桌面端构建并行化 (Win/Mac 同时跑)

---

### 5. audit.yml — 依赖安全审计

**触发：** schedule (每周一) + workflow_dispatch

**任务：**
- `npm audit` — 高危漏洞阻断
- `npm outdated` — 生成依赖更新报告
- 如发现高危漏洞，自动创建 issue

---

### 6. codeql.yml — 安全扫描（保留增强）

**触发：** push(main), schedule(每周一)

**保留现有配置，增加：**
- 扫描路径限定 (src/, api/)
- 排除 node_modules, dist, release

---

### 7. stale.yml — 仓库维护

**触发：** schedule (每天)

**任务：**
- 标记 30 天无活动 issue 为 stale
- 关闭 7 天后仍无响应的 stale issue
- 标记 14 天无活动 PR 需要 review

---

## 文件结构

```
.github/
├── workflows/
│   ├── ci.yml              # 核心 CI (增强矩阵)
│   ├── pr-checks.yml       # PR 质量控制
│   ├── nightly.yml         # 夜间构建
│   ├── release.yml         # 发布流程
│   ├── audit.yml           # 依赖审计
│   ├── codeql.yml          # 安全扫描
│   └── stale.yml           # 过期清理
└── actions/
    └── setup-tipai/        # 复用 action (可选)
        ├── action.yml
        └── setup.sh
```

---

## 实施优先级

| 优先级 | 工作流 | 工作量 | 收益 |
|--------|--------|--------|------|
| P0 | ci.yml 增强 | 小 | 跨平台兼容性 |
| P0 | pr-checks.yml | 小 | PR 质量守门 |
| P1 | nightly.yml | 中 | 提前发现构建问题 |
| P1 | release.yml 增强 | 小 | 发布体验 |
| P2 | stale.yml | 极小 | 仓库整洁 |
| P2 | audit.yml 增强 | 小 | 安全合规 |

---

## 关键配置项

### 环境变量 (repo secrets)
- `CODECOV_TOKEN` — 覆盖率上报 (可选)
- `GITHUB_TOKEN` — 自动创建 issue/release (内置)

### 条件跳过规则 (paths-filter)
```yaml
- uses: dorny/paths-filter@v3
  id: filter
  with:
    filters: |
      frontend: ['src/**', 'index.html', 'vite.config.ts']
      backend: ['api/**', 'db/**']
```

---

*设计完成，开始生成实际 workflow 文件。*
