# TipAi 架构重建迭代方案 (rust-dev)

> **版本**: v1.2.2 → v2.0.0  
> **分支**: `rust-dev`  
> **目标**: 用 Rust Native Addon 替代 JS 后端，实现零端口、零序列化、AI 不阻塞 UI

---

## 一、当前状态（rust-dev 已完成的 6 个 commit）

```
0ae9c8d feat(electron): 集成 Native Addon IPC + Playwright脚本
dfc3332 test(qa): 新增 UI/后端 QA 测试套件
c16f64a test(e2e): 新增 Playwright Electron E2E 测试套件
a3c8744 feat(native): 新增 Rust Native Addon 核心 (Phase 1)
c97a030 fix(backend): 动态模型推断 + 修复 generation 测试
449f9fc fix(ui): 修复首页标题截断 + 模板市场单列布局 + 恢复HowItWorksSection
```

### 1.1 rust-dev 已交付

| 模块 | 内容 | 状态 |
|------|------|------|
| **UI Bug 修复** | 首页截断、模板市场单列、HowItWorksSection 恢复 | ✅ 已合并 |
| **模型 Fallback** | 动态推断默认模型（deepseek>kimi>openai>claude） | ✅ 已合并 |
| **Native Addon (Phase 1)** | Rust 工程骨架 + 6 张表 CRUD + AI HTTP + AES-256-GCM | ✅ 代码完成 |
| **Electron IPC** | 15 个 IPC handler + preload 暴露 + fallback 设计 | ✅ 代码完成 |
| **Playwright E2E** | 25 个测试，覆盖 smoke/生成/设置/模板市场 | ✅ 代码完成 |
| **QA 测试** | 后端 54 项 + UI 24 项 + DeepSeek 6 项 | ✅ 全部通过 |

### 1.2 已知阻塞

- **Rust 工具链安装**: 网络下载速度不稳定，需要手动执行 `rustup toolchain install stable`
- **Native Addon 构建**: 待 Rust 安装完成后执行 `npm run native:build`
- **better-sqlite3 ABI**: 当前为 Node.js 编译，Electron 41 需要重建（`npx electron-rebuild`）

---

## 二、迭代路线图

### Phase 2: 核心 CRUD 迁移（3-4 天）

**目标**: 将 `api/queries/` 和 `api/services/` 中的数据库操作逐步替换为 Native Addon 调用。

#### Week 1 - Day 1~2: 用户 + 设置层

| 任务 | 文件 | 操作 |
|------|------|------|
| 替换用户查询 | `api/queries/users.ts` | 改为 `nativeAddon.userFindByUnionId()` / `userUpsert()` |
| 替换设置查询 | `api/services/promptforge/settings.ts` | 改为 `nativeAddon.settingsGet()` / `settingsUpdate()` / `settingsGetApiKey()` |
| 验证加密一致性 | `native/src/crypto/mod.rs` | 确保 Rust AES-256-GCM 与 JS crypto.ts 加密结果互通 |
| 双写验证 | 新增临时测试 | JS 和 Rust 同时读写同一条记录，对比结果 |

#### Week 1 - Day 3~4: Prompt + Template 层

| 任务 | 文件 | 操作 |
|------|------|------|
| 替换 Prompt Library | `api/queries/prompts.ts` | 改为 `nativeAddon.promptList()` / `promptCreate()` / `promptDelete()` |
| 替换 Templates | `api/queries/templates.ts` | 改为 `nativeAddon.templateListPublic()` / `templateListByUser()` |
| 验证排序/过滤 | 新增单元测试 | 确保 Rust 查询结果与 Drizzle ORM 一致 |

#### Week 1 - Day 5: Project + Steps 层

| 任务 | 文件 | 操作 |
|------|------|------|
| 替换 Projects | `api/queries/projects.ts` | 改为 `nativeAddon.projectList()` / `projectCreate()` |
| 替换 Steps | `api/queries/steps.ts` | 改为 `nativeAddon.stepList()` / `stepUpdate()` |
| 关联查询验证 | 新增测试 | project + steps 联查结果一致性 |

**Phase 2 验收标准**:
- [ ] 所有 `api/queries/*.ts` 已替换为 Native Addon 调用
- [ ] Vitest 单元测试全部通过（237+ 项）
- [ ] Playwright E2E 冒烟测试全部通过
- [ ] Electron 打包后功能正常

---

### Phase 3: AI 调用下沉 + 加密下沉（2-3 天）

**目标**: 将 `api/lib/ai-service-v3/client.ts` 的 HTTP 调用和 `api/lib/crypto.ts` 的加密逻辑迁移到 Rust。

#### Week 2 - Day 1: 加密层迁移

```
api/lib/crypto.ts  (删除或保留fallback)
    ↓
native/src/crypto/mod.rs  (主路径)
```

- 验证 JS `encrypt()` 输出能被 Rust `decrypt()` 解密（反之亦然）
- `settingsGetApiKey()` 已在 Rust 层自动解密，JS 层不再接触密文
- 删除 `api/lib/crypto.ts` 或标记为 deprecated

#### Week 2 - Day 2~3: AI HTTP 调用迁移

```
api/lib/ai-service-v3/client.ts  (删除)
    ↓
native/src/ai/client.rs  (主路径)
```

| 功能 | JS 实现 | Rust 实现 | 验证方式 |
|------|---------|-----------|----------|
| 单路 AI 调用 | `callAISingle()` | `ai_call()` | 对比返回内容一致性 |
| Self-Consistency | `runSelfConsistencyCallAI()` | `ai_call_self_consistency()` | 5路并行 vs 5路串行 |
| Provider 配置 | 硬编码 MODEL_CONFIGS | 动态 baseUrl + modelId | 支持自定义 endpoint |
| 超时处理 | `fetchWithTimeout()` | `reqwest` + tokio timeout | 模拟慢网络 |
| 错误处理 | 返回 null + console.error | 返回 `AiCallResponse.error` | 测试无效 key |

**关键改进**:
- Self-Consistency 从串行 15s → 并行 3s（tokio 并发）
- AI 调用不阻塞 Node.js event loop（主线程保持 60fps）
- 支持自定义 `modelId` 和 `baseUrl`（通用化 AI 配置）

#### Week 2 - Day 3 下午: 性能基准测试

```bash
# 对比测试脚本
node scripts/benchmark-db.mjs      # better-sqlite3 vs rusqlite
node scripts/benchmark-ai.mjs      # JS fetch vs Rust reqwest
```

| 指标 | 当前 (JS) | 目标 (Rust) | 验收 |
|------|-----------|-------------|------|
| SQLite 单条查询 | ~0.3ms | ~0.05ms | ✅ ≥5x 提升 |
| Self-Consistency 5路 | ~15s | ~3s | ✅ ≥4x 提升 |
| AI 调用 UI 卡顿 | 明显 | 无感知 | ✅ 60fps 保持 |

---

### Phase 4: 清理 + 打包配置 + 零端口（1-2 天）

#### Week 2 - Day 4: 删除旧依赖

```bash
npm uninstall better-sqlite3 @types/better-sqlite3
npm uninstall drizzle-orm  # 如果完全迁移
npm uninstall @hono/node-server hono  # 如果去掉 HTTP server
```

删除的文件:
- `api/queries/*.ts` (已迁移的 Drizzle query)
- `api/lib/crypto.ts` (加密已下沉)
- `api/lib/ai-service-v3/client.ts` (AI 调用已下沉)
- `api/boot.ts` 中的 `serve()` 调用 (零端口)

#### Week 2 - Day 4~5: Electron Builder 配置

```json
{
  "build": {
    "files": [
      "dist/**/*",
      "electron/**/*",
      "native/*.node",
      "db/migrations/**/*"
    ],
    "extraResources": [
      { "from": "native/${os}-${arch}.node", "to": "native/tipai_core.node" }
    ]
  }
}
```

- Windows x64: `native/tipai_core-win32-x64-msvc.node`
- macOS arm64: `native/tipai_core-darwin-arm64.node`
- macOS x64: `native/tipai_core-darwin-x64.node`

#### Week 2 - Day 5: CI/CD 改造

```yaml
# .github/workflows/build.yml
jobs:
  build:
    strategy:
      matrix:
        os: [windows-latest, macos-latest]
    steps:
      - uses: actions/checkout@v4

      - name: Install Rust
        uses: dtolnay/rust-action@stable

      - name: Build Native Addon
        run: cd native && npm run build

      - name: Build Electron
        run: npm run build:desktop
```

#### Week 2 - Day 5 下午: 零端口验证

```bash
# 验证没有 TCP 端口监听
npm run build:desktop:win
# 启动 App
# 在 PowerShell 中执行: Get-NetTCPConnection -LocalPort 0-65535 | Where { $_.OwningProcess -eq <pid> }
# 预期: 除了可能的 updater 连接外，没有 localhost 端口
```

**Phase 4 验收标准**:
- [ ] `better-sqlite3` 已卸载，App 仍能正常运行
- [ ] `npm run build:desktop:win` 成功，产物包含 `.node` 文件
- [ ] 启动后 `netstat` / `Get-NetTCPConnection` 无本地端口占用
- [ ]  Smoke E2E 测试通过

---

## 三、通用化 AI 配置（可并行进行）

**背景**: 当前 `MODEL_CONFIGS` 硬编码了 provider + modelId 绑定，用户无法自定义模型。

### 方案 A: 最小改法（保留现有表结构）

给 `user_settings` 增加 `xxxModelId` 字段：

```sql
ALTER TABLE user_settings ADD COLUMN deepseek_model_id TEXT DEFAULT 'deepseek-chat';
ALTER TABLE user_settings ADD COLUMN openai_model_id TEXT DEFAULT 'gpt-4o-mini';
ALTER TABLE user_settings ADD COLUMN kimi_model_id TEXT DEFAULT 'moonshot-v1-8k';
ALTER TABLE user_settings ADD COLUMN claude_model_id TEXT DEFAULT 'claude-3-sonnet-20240229';
ALTER TABLE user_settings ADD COLUMN custom_base_url TEXT;
```

Rust `ai_call()` 接口已支持 `modelId` 和 `baseUrl` 参数，只需前端设置页增加输入框。

### 方案 B: 彻底改法（新增 provider 配置表）

```sql
CREATE TABLE ai_providers (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,        -- 显示名: "我的 DeepSeek"
  provider TEXT NOT NULL,    -- "deepseek" | "openai" | "custom"
  base_url TEXT,
  model_id TEXT NOT NULL,
  api_key TEXT,              -- 加密存储
  is_default INTEGER DEFAULT 0,
  created_at INTEGER
);
```

**建议**: Phase 2 期间做方案 A（1 天工作量），后续版本再做方案 B。

---

## 四、里程碑与时间线

```
Week 1
├─ Day 1~2: Phase 2a — 用户/设置层迁移 + 加密一致性验证
├─ Day 3~4: Phase 2b — Prompt/Template/Project/Steps 迁移
├─ Day 5:   Phase 2c — 联调 + 双写验证 + 单元测试
│
Week 2
├─ Day 1:   Phase 3a — 加密层完全下沉
├─ Day 2~3: Phase 3b — AI HTTP 调用下沉 + Self-Consistency 并行化
├─ Day 3 PM: 性能基准测试
├─ Day 4:   Phase 4a — 删除旧依赖 + 代码清理
├─ Day 4~5: Phase 4b — Electron Builder 配置 + CI/CD
├─ Day 5 PM: Phase 4c — 零端口验证 + 最终 E2E 测试
│
Week 3 (缓冲/并行)
├─ 通用化 AI 配置 (方案 A)
├─ Playwright E2E 补充测试
├─ 性能优化（Rust 层缓存、连接池调优）
```

**总计**: 10-12 工作日（含缓冲）

---

## 五、风险与回滚策略

| 风险 | 概率 | 影响 | 对策 |
|------|------|------|------|
| Rust 编译器版本兼容性 | 低 | 高 | 锁定 `rustc 1.75+`，CI 固定版本 |
| Native Addon 跨平台构建失败 | 中 | 高 | 保留 better-sqlite3 fallback，渐进迁移 |
| 加密格式不互通 | 低 | 高 | Phase 2 专门验证，不互通则双写过渡期 |
| AI 调用返回格式差异 | 中 | 中 | 保持 JS response-parser 层，只替换 HTTP client |
| 团队 Rust 学习曲线 | 中 | 低 | Phase 2 保留 JS 业务逻辑，Rust 只做 DB/HTTP |

**回滚策略**:
- 每个 Phase 都有独立分支: `rust-dev-phase2`, `rust-dev-phase3`
- 任何时候 `main` 分支都可独立发布（JS 全栈版本）
- Native Addon 加载失败自动 fallback 到 JS 实现

---

## 六、验收 checklist（v2.0.0 发布前）

- [ ] `npm run build:desktop:win` 成功，产物 < 200MB
- [ ] `npm run test` 通过（Vitest 237+ 项）
- [ ] `npm run test:e2e` 通过（Playwright 25 项）
- [ ] 启动后 `Get-NetTCPConnection` 无 localhost 端口
- [ ] AI Self-Consistency 5路并行 < 5s
- [ ] 设置页可配置任意 modelId（如 `deepseek-v4-pro`）
- [ ] 卸载 better-sqlite3 后 App 正常运行
- [ ] Windows / macOS 双平台打包通过 CI
- [ ] 数据迁移：旧用户数据无损升级
- [ ] 文档更新：README + 开发指南

---

## 七、Git 分支策略

```
main (v1.2.x) ── 稳定发布分支
  │
  ├─ rust-dev ── 架构重建开发分支（当前）
  │   │
  │   ├─ rust-dev-phase2 ── Phase 2 增量分支
  │   ├─ rust-dev-phase3 ── Phase 3 增量分支
  │   └─ rust-dev-phase4 ── Phase 4 增量分支
  │
  └─ feature/xxx ── 其他功能分支
```

**提交规范**:
- `feat(native): xxx` — Rust 新功能
- `feat(electron): xxx` — Electron 集成
- `refactor(api): xxx` — JS 层迁移
- `test(e2e): xxx` — E2E 测试
- `chore(deps): xxx` — 依赖清理

---

## 八、立即执行的下一步

1. **安装 Rust 工具链**（网络恢复后）
   ```bash
   rustup toolchain install stable
   ```

2. **构建并验证 Native Addon**
   ```bash
   cd ~/projects/TipAi
   npm run native:build
   node -e "console.log(require('./native/tipai_core.node').version())"
   ```

3. **切出 Phase 2 分支**
   ```bash
   git checkout -b rust-dev-phase2 rust-dev
   ```

4. **开始迁移 Users + Settings 层**
   - 修改 `api/queries/users.ts` → 调用 `nativeAddon`
   - 修改 `api/services/promptforge/settings.ts` → 调用 `nativeAddon`
   - 验证双写一致性
