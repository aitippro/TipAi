# TipAi v2.0.0 原子任务清单

> 从 `feature/rust-native-addon` 分支继续，目标：Rust Native Addon 完全替代 JS 后端  
> 每个任务独立可交付，半天~1天工作量，按依赖顺序排列。

---

## 基础设施（0 天，已就绪）

| 状态 | 项目 | 说明 |
|------|------|------|
| ✅ | Rust 工程 | `native/` 已初始化，napi-rs + rusqlite + tokio |
| ✅ | 表结构 | `migrations/0001_initial_schema.sql` 已创建（users/settings/prompts/templates/projects/steps） |
| ✅ | Native Addon 编译 | `npm run native:build` 可生成 `.node`，Release 4.1MB |
| ✅ | Electron IPC | `electron/main.cjs` 已添加 15 个 IPC handler + fallback |
| ✅ | E2E 测试框架 | Playwright 25 个测试已就绪 |

---

## Phase 2: 核心 CRUD 迁移

### T2.1 用户查询层迁移
**前置**: 无  
**文件**: `api/queries/users.ts`  
**工时**: 0.5 天

**操作步骤**:
1. 打开 `api/queries/users.ts`，找到 `findUserByUnionId()` 和 `upsertUser()`
2. 改为调用 `window.electronAPI.userFindByUnionId(unionId)` 和 `userUpsert(data)`
3. 返回类型从 Drizzle `User` 改为 Native Addon `User`（字段名已 camelCase 转换）
4. 删除 `db.prepare()` / `db.run()` 相关代码

**验收标准**:
- [ ] 登录流程正常（OAuth 回调 → userUpsert → 跳转首页）
- [ ] `api/queries/users.ts` 不再 import `better-sqlite3`
- [ ] Vitest 用户相关测试通过

---

### T2.2 设置查询层迁移
**前置**: T2.1  
**文件**: `api/services/promptforge/settings.ts`  
**工时**: 0.5 天

**操作步骤**:
1. 替换 `getUserSettings(userId)` → `window.electronAPI.settingsGet(userId)`
2. 替换 `updateUserSettings()` → `window.electronAPI.settingsUpdate(userId, data)`
3. 替换 `getApiKey()` → `window.electronAPI.settingsGetApiKey(userId, provider)`
4. 注意：`settingsGetApiKey` 已在 Rust 层解密，JS 层不再调用 `crypto.ts`

**验收标准**:
- [ ] 设置页加载正常，默认值（kimi/auto/zh）正确
- [ ] 保存 API Key 后重新加载页面，值能正确回显
- [ ] `settings.ts` 不再 import `crypto.ts`

---

### T2.3 加密互通验证
**前置**: T2.2  
**文件**: `native/src/crypto/mod.rs`, `scripts/verify-crypto.mjs`（新建）  
**工时**: 0.5 天

**操作步骤**:
1. 在 JS 端用旧 `crypto.ts` 加密一条测试数据
2. 在 Node 脚本中用 `native.decrypt()` 解密，验证结果一致
3. 反向验证：Rust `encrypt()` → JS `decrypt()`
4. 若不一致，调整 Rust 或 JS 的格式（salt/nonce 拼接顺序、base64 编码）

**验收标准**:
- [ ] 双向加解密结果完全一致
- [ ] 脚本 `node scripts/verify-crypto.mjs` 输出 "PASS"
- [ ] 旧用户已加密的 API Key 能被 Rust 正确解密

---

### T2.4 Prompt Library 查询迁移
**前置**: T2.1  
**文件**: `api/queries/prompts.ts`  
**工时**: 0.5 天

**操作步骤**:
1. 替换 `listPrompts()` → `window.electronAPI.promptList(userId, opts)`
2. 替换 `createPrompt()` → `window.electronAPI.promptCreate(data)`
3. 替换 `deletePrompt()` → `window.electronAPI.promptDelete(id, userId)`
4. 替换 `updateFavorite()` → `window.electronAPI.promptUpdateFavorite(id, userId, isFavorite)`
5. `promptList` 的 `opts` 参数：`{ limit, offset, domain, isFavorite, search }`

**验收标准**:
- [ ] Prompt Library 页面加载正常，列表/搜索/收藏切换正常
- [ ] 新建 prompt 后出现在列表顶部
- [ ] 删除 prompt 后列表刷新

---

### T2.5 Templates 查询迁移
**前置**: T2.1  
**文件**: `api/queries/templates.ts`  
**工时**: 0.5 天

**操作步骤**:
1. 替换 `listPublicTemplates()` → `window.electronAPI.templateListPublic()`
2. 替换 `listUserTemplates()` → `window.electronAPI.templateListByUser(userId)`
3. 替换 `createTemplate()` → `window.electronAPI.templateCreate(data)`
4. 替换 `deleteTemplate()` → `window.electronAPI.templateDelete(id, userId)`

**验收标准**:
- [ ] Template Market 页面加载正常
- [ ] 搜索过滤正常
- [ ] 我的模板页正常

---

### T2.6 Projects 查询迁移
**前置**: T2.1  
**文件**: `api/queries/projects.ts`  
**工时**: 0.5 天

**操作步骤**:
1. 替换 `listProjects()` → `window.electronAPI.projectList(userId)`
2. 替换 `createProject()` → `window.electronAPI.projectCreate(data)`
3. 替换 `deleteProject()` → `window.electronAPI.projectDelete(id, userId)`

**验收标准**:
- [ ] Project 列表页加载正常
- [ ] 新建 project 正常
- [ ] 删除 project 正常

---

### T2.7 Steps 查询迁移
**前置**: T2.6  
**文件**: `api/queries/steps.ts`  
**工时**: 0.5 天

**操作步骤**:
1. 替换 `listSteps()` → `window.electronAPI.stepList(projectId)`
2. 替换 `updateStep()` → `window.electronAPI.stepUpdate(id, data)`

**验收标准**:
- [ ] Project Detail 页 steps 列表正常加载
- [ ] Step 状态更新正常

---

### T2.8 双写一致性验证
**前置**: T2.1 ~ T2.7 全部完成  
**文件**: `scripts/dual-write-test.mjs`（新建）  
**工时**: 0.5 天

**操作步骤**:
1. 写一个脚本：用旧 Drizzle API 和新的 Native Addon 同时读写同一条记录
2. 对比两边返回的 JSON 是否完全一致（字段值、类型、顺序）
3. 重点验证：`createdAt` / `updatedAt` 时间戳格式、空值处理（null vs undefined）

**验收标准**:
- [ ] 脚本输出 "All dual-write tests PASSED"
- [ ] 不一致项列出差异并修复

---

### T2.9 Phase 2 回归测试
**前置**: T2.1 ~ T2.8  
**工时**: 0.5 天

**验收标准**:
- [ ] `npm run test`（Vitest 237+ 项）全部通过
- [ ] Playwright E2E smoke 测试通过（首页加载/导航/设置页）
- [ ] Electron 打包后功能正常（`npm run build:desktop:win`）

---

## Phase 3: AI 调用 + 加密完全下沉

### T3.1 加密层完全下沉
**前置**: T2.3（加密互通验证通过）  
**文件**: `api/lib/crypto.ts`, `native/src/crypto/mod.rs`  
**工时**: 0.5 天

**操作步骤**:
1. 确认 `settingsGetApiKey()` 已在 Rust 层自动解密
2. 将所有 JS 层调用 `decrypt()` 改为调用 `nativeAddon.decrypt()`
3. 删除 `api/lib/crypto.ts` 中的重复实现，或标记为 `@deprecated`
4. 保留文件但改为 re-export：`export const { encrypt, decrypt } = window.electronAPI`

**验收标准**:
- [ ] `api/lib/crypto.ts` 不再包含实际加解密逻辑
- [ ] 设置页 API Key 回显正常
- [ ] 新建用户时默认设置插入正常（密码为空的情况）

---

### T3.2 AI 单路调用下沉
**前置**: T2.9  
**文件**: `api/lib/ai-service-v3/client.ts`  
**工时**: 0.5 天

**操作步骤**:
1. 找到 `callAISingle()` 函数
2. 改为调用 `window.electronAPI.aiCall({ provider, apiKey, modelId, baseUrl, systemPrompt, userMessage, temperature, maxTokens, timeoutMs })`
3. 返回 `AiCallResponse { content, error }`，与现有 JS 返回格式对齐
4. 保留 JS 层的 response-parser（只是替换 HTTP client）

**验收标准**:
- [ ] 首页输入 intent，点击生成，正常返回 prompt
- [ ] 无效 API Key 返回 `error` 字段而非抛异常
- [ ] 超时设置生效（timeoutMs 参数）

---

### T3.3 Self-Consistency 并行化
**前置**: T3.2  
**文件**: `api/lib/ai-service-v3/client.ts`  
**工时**: 0.5 天

**操作步骤**:
1. 找到 `runSelfConsistencyCallAI()`
2. 改为调用 `window.electronAPI.aiCallSelfConsistency(req, sampleCount)`
3. Rust 层已用 `tokio::spawn` 实现 5 路并行，JS 层不再需要手动串行
4. 删除 JS 层的循环调用逻辑

**验收标准**:
- [ ] 复杂 intent 触发 clarification 时，5 路采样并行完成
- [ ] 耗时从 ~15s 降到 ~3s（可用 `console.time` 测量）
- [ ] 结果投票逻辑与原来一致（取最多票数的结果）

---

### T3.4 AI 调用 fallback 验证
**前置**: T3.2, T3.3  
**文件**: `electron/main.cjs`  
**工时**: 0.5 天

**操作步骤**:
1. 临时修改 `electron/main.cjs`，让 `nativeAddon` 加载失败（重命名 `.node` 文件）
2. 验证 Electron 自动 fallback 到 JS HTTP 调用
3. 恢复 `.node` 文件，确认 Native Addon 路径重新生效

**验收标准**:
- [ ] Native Addon 加载失败时，AI 调用仍可用（走 JS fetch）
- [ ] 加载成功时，AI 调用走 Rust 路径

---

### T3.5 性能基准测试
**前置**: T3.1 ~ T3.4  
**文件**: `scripts/benchmark-db.mjs`, `scripts/benchmark-ai.mjs`（新建）  
**工时**: 0.5 天

**操作步骤**:
1. DB 基准：对比 `better-sqlite3` vs `rusqlite` 的 1000 次查询耗时
2. AI 基准：对比 JS 串行 vs Rust 并行 Self-Consistency 的耗时
3. UI 基准：用 DevTools Performance 面板验证 AI 调用期间主线程 60fps

**验收标准**:
- [ ] SQLite 查询 ≥5x 提升
- [ ] Self-Consistency 5 路 ≥4x 提升
- [ ] AI 调用期间 UI 无卡顿

---

## Phase 4: 清理 + 打包 + 零端口

### T4.1 删除旧数据库依赖
**前置**: T2.9（所有查询已迁移）  
**工时**: 0.5 天

**操作步骤**:
```bash
npm uninstall better-sqlite3 @types/better-sqlite3
```

1. 删除 `api/queries/*.ts` 中已迁移的文件（保留未迁移的）
2. 删除 `db/schema.ts` 中已迁移的表定义（或标记为 `@deprecated`）
3. 确认 `drizzle.config.ts` 不再需要（如果全部迁移完）

**验收标准**:
- [ ] `node_modules/better-sqlite3` 不存在
- [ ] `npm run build` 成功（无 missing module 错误）
- [ ] App 正常运行

---

### T4.2 删除 HTTP Server（零端口）
**前置**: T3.4  
**文件**: `api/boot.ts`, `electron/main.cjs`  
**工时**: 0.5 天

**操作步骤**:
1. 删除 `api/boot.ts` 中的 `serve()` 调用和 Hono server 初始化
2. 删除 `api/lib/server.ts`（如果有）
3. `electron/main.cjs` 中移除 `startBackend()` 的 HTTP server 部分
4. 保留 IPC handler，因为前端 API 调用已走 IPC

**验收标准**:
- [ ] 启动 App 后，`Get-NetTCPConnection -OwningProcess <pid>` 无 localhost 端口
- [ ] 前端 API 调用仍正常（走 IPC 而非 HTTP）

---

### T4.3 Electron Builder 打包配置
**前置**: T4.1, T4.2  
**文件**: `package.json` (build 字段)  
**工时**: 0.5 天

**操作步骤**:
1. 确保 `package.json` 的 `build.files` 包含 `native/*.node`
2. 确保 `extraResources` 把 `.node` 复制到 `resources/native/tipai_core.node`
3. 测试 `npm run build:desktop:win`
4. 验证产物 `dist/` 中包含 `.node` 文件

**验收标准**:
- [ ] `npm run build:desktop:win` 成功
- [ ] 产物大小 < 200MB
- [ ] 安装后 `resources/native/tipai_core.node` 存在

---

### T4.4 CI/CD 改造
**前置**: T4.3  
**文件**: `.github/workflows/build.yml`  
**工时**: 0.5 天

**操作步骤**:
1. GitHub Actions 中增加 Rust 安装步骤：`dtolnay/rust-action@stable`
2. 在 `npm run build` 之前执行 `cd native && npm run build`
3. Matrix 构建：Windows x64 + macOS arm64
4. 产物上传：`.exe`, `.dmg`, `.zip`

**验收标准**:
- [ ] CI 中 Windows 构建成功
- [ ] CI 中 macOS 构建成功（如果可用）
- [ ] Release Assets 包含双平台安装包

---

### T4.5 旧代码最终清理
**前置**: T4.1 ~ T4.4  
**工时**: 0.5 天

**操作步骤**:
1. 删除 `api/lib/ai-service-v3/client.ts`（如果全部迁移完）
2. 删除 `api/lib/crypto.ts`（如果全部迁移完）
3. 删除 `db/migrations/` 中的 Drizzle migration 文件（保留 Rust 的 `migrations/*.sql`）
4. 删除未使用的 import 和 dead code

**验收标准**:
- [ ] `npm run lint` 无 unused import 警告
- [ ] `npm run build` 成功
- [ ] App 功能完整

---

## Phase 5: 通用化 AI 配置（可与 Phase 2~4 并行）

### T5.1 设置页增加 modelId 输入框
**前置**: T2.2  
**文件**: `src/pages/Settings.tsx`  
**工时**: 0.5 天

**操作步骤**:
1. 在设置页为每个 provider 增加 `modelId` 输入框（带默认值）
2. DeepSeek 默认 `deepseek-chat`
3. Kimi 默认 `moonshot-v1-8k`
4. OpenAI 默认 `gpt-4o-mini`
5. Claude 默认 `claude-3-sonnet-20240229`
6. 保存时调用 `settingsUpdate()` 传入新的 modelId

**验收标准**:
- [ ] 设置页可修改每个 provider 的 modelId
- [ ] 修改后 AI 调用使用新的 modelId
- [ ] 输入框有 placeholder 提示默认值

---

### T5.2 自定义 baseUrl 支持
**前置**: T5.1  
**文件**: `src/pages/Settings.tsx`, `native/src/ai/client.rs`  
**工时**: 0.5 天

**操作步骤**:
1. 设置页增加 "自定义 API 地址" 输入框（可选）
2. `ai_call()` 接口已支持 `baseUrl` 参数，只需前端传入
3. 为空时使用 provider 默认地址

**验收标准**:
- [ ] 可配置自定义 OpenAI 兼容端点（如本地 ollama、Azure）
- [ ] 空值时使用默认地址

---

## 数据迁移（v1.x → v2.0）

### TM.1 旧数据库自动迁移
**前置**: T4.3  
**文件**: `electron/main.cjs`  
**工时**: 0.5 天

**操作步骤**:
1. 启动时检测旧数据库文件（`tipai.db` 已存在）
2. 用 `better-sqlite3`（只读）读取旧数据
3. 用 Native Addon `dbOpen()` 打开新数据库
4. 逐表迁移：users → user_settings → prompt_library → templates → projects → steps
5. 迁移完成后删除旧表或标记为 `_migrated`

**验收标准**:
- [ ] 旧用户启动 v2.0 后数据完整保留
- [ ] 迁移日志写入 `data/migration.log`
- [ ] 重复启动不会重复迁移

---

## 任务依赖图

```
T2.1 用户查询 ─┬─→ T2.2 设置查询 ──→ T2.3 加密互通
               │                      │
               ├─→ T2.4 Prompt 查询   │
               ├─→ T2.5 Templates 查询 │
               ├─→ T2.6 Projects 查询  │
               └─→ T2.7 Steps 查询    │
                                      ↓
T2.8 双写验证 ←───────────────────────┘
   │
   ↓
T2.9 Phase 2 回归 ←───────────────────────┐
   │                                       │
   ├──→ T3.1 加密下沉 ←── T2.3 ────────────┤
   │                                       │
   ├──→ T3.2 AI 单路下沉                   │
   │       │                               │
   │       ↓                               │
   │   T3.3 Self-Consistency 并行化        │
   │       │                               │
   │       ↓                               │
   │   T3.4 AI fallback 验证               │
   │       │                               │
   │       ↓                               │
   │   T3.5 性能基准                       │
   │                                       │
   ├──→ T4.1 删除 better-sqlite3           │
   │       │                               │
   │       ↓                               │
   │   T4.2 零端口（删除 HTTP server）     │
   │       │                               │
   │       ↓                               │
   │   T4.3 Electron Builder 打包          │
   │       │                               │
   │       ↓                               │
   │   T4.4 CI/CD                          │
   │       │                               │
   │       ↓                               │
   │   T4.5 最终清理                       │
   │                                       │
   └──→ T5.1/T5.2 通用化 AI 配置（并行）   │
                                           │
TM.1 数据迁移 ←────────────────────────────┘
```

---

## 预估总工时

| Phase | 任务数 | 工时 |
|-------|--------|------|
| Phase 2 CRUD 迁移 | 9 个 | 4 ~ 5 天 |
| Phase 3 AI + 加密下沉 | 5 个 | 2 ~ 3 天 |
| Phase 4 清理 + 打包 | 5 个 | 2 ~ 3 天 |
| Phase 5 通用化配置 | 2 个 | 1 天 |
| 数据迁移 | 1 个 | 0.5 天 |
| **合计** | **22 个原子任务** | **10 ~ 13 天** |

---

## 交接 checklist

接手人确认以下事项后签字：

- [ ] 已阅读 `docs/ARCHITECTURE_REBUILD_PLAN.md`
- [ ] 已阅读 `native/src/lib.rs` 的导出函数列表
- [ ] 已运行 `npm run native:build` 并成功生成 `.node`
- [ ] 已运行 `node -e "console.log(require('./native').version())"` 输出 `1.2.2`
- [ ] 已阅读 `electron/main.cjs` 的 IPC handler 列表
- [ ] 已确认 `feature/rust-native-addon` 分支已 push 到 origin
- [ ] 已确认 `main` 分支保持为 v1.2.x 稳定代码

**交接日期**: __________  
**交接人**: __________  
**接手人**: __________
