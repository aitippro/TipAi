# TipAi v2.0.0 任务分配提示词（直接复制发给对应人员）

> 分支: `feature/rust-native-addon`（已 push 到 origin）  
> 目标: Rust Native Addon 完全替代 JS 后端，零端口、UI 不阻塞  
> 总工时: 10~13 天，建议 4 人并行

---

## 【通用开头】复制给所有人

```
你正在参与 TipAi 桌面应用的 v2.0.0 架构重建。

## 项目速览
- TipAi = Electron + React + TypeScript，AI 提示词工程工具
- 当前阶段: v1.2.2 → v2.0.0，用 Rust Native Addon 替代 better-sqlite3 + Hono HTTP 后端
- 你负责的分支: feature/rust-native-addon（git pull 后切过来）

## 技术栈
| 层级 | 技术 |
|------|------|
| 前端 | React 18 + Vite + Tailwind |
| 桌面壳 | Electron 41 |
| 新后端 | Rust + napi-rs + rusqlite + tokio + reqwest |
| 构建 | napi-rs CLI（生成 .node 二进制）|

## 环境准备（10 分钟）
```bash
git checkout feature/rust-native-addon
npm install
cd native && npm install
npm run build        # debug
# 验证
node -e "console.log(require('./native').version())"  # 应输出 1.2.2
```

## 关键约定（必读）
1. 函数名映射: Rust snake_case → JS camelCase（例: db_open → dbOpen）
2. Fallback 机制: Electron 加载 .node 失败时自动 fallback 到 JS 实现，**不要破坏此逻辑**
3. 加密互通: Rust crypto::encrypt 与旧 JS 格式必须互通，否则旧用户数据报废
4. 不要提交: native/target/、*.node、e2e-results/（已在 .gitignore）
5. 每个任务完成后运行: npm run test（Vitest）+ 对应页面 E2E

## 遇到问题
- 先看 docs/TASKS_ATOMIC.md 对应任务详情的"操作步骤"
- Rust 编译问题: cd native && cargo check
- Native Addon 加载问题: node -e "console.log(require('./native'))"
- 架构疑问: docs/ARCHITECTURE_REBUILD_PLAN.md

## 日报格式（每晚群里发）
```
[Name] YYYY-MM-DD
- 完成任务: T2.x / T3.x
- 当前阻塞: 无 / xxx（需要谁协助）
- 明日计划: xxx
```
```

---

## 【人员 A】后端 CRUD - 用户/设置/加密（2~3 天）

**负责范围**: T2.1 ~ T2.3 + T2.8（双写验证）

**复制以下内容给 A:**
```
## 你的任务（3~4 个，按顺序）

### T2.1 用户查询层迁移（0.5 天）
- 文件: api/queries/users.ts
- 操作: 将 findUserByUnionId() / upsertUser() 改为 window.electronAPI.userFindByUnionId() / userUpsert()
- 删除 better-sqlite3 相关 import
- 验收: 登录流程正常 + Vitest 用户测试通过

### T2.2 设置查询层迁移（0.5 天）
- 文件: api/services/promptforge/settings.ts
- 操作: 替换 getUserSettings → settingsGet() / updateUserSettings → settingsUpdate() / getApiKey → settingsGetApiKey()
- 注意: settingsGetApiKey 已在 Rust 层解密，JS 不再调用 crypto.ts
- 验收: 设置页加载正常、API Key 保存后回显正确

### T2.3 加密互通验证（0.5 天）
- 文件: native/src/crypto/mod.rs、新建 scripts/verify-crypto.mjs
- 操作: JS 旧 crypto.ts 加密 → Rust decrypt 解密，反向也要验证
- 验收: 双向结果一致、脚本输出 PASS、旧用户数据能解密

### T2.8 双写一致性验证（0.5 天）
- 文件: 新建 scripts/dual-write-test.mjs
- 操作: 同时用旧 Drizzle 和新 Native Addon 读写同一条记录，对比 JSON
- 重点: createdAt/updatedAt 格式、null vs undefined
- 验收: 脚本输出 "All dual-write tests PASSED"

## 交付标准
- [ ] settings 页面完整可用（加载/保存/API Key 回显）
- [ ] 加密双向互通验证通过
- [ ] npm run test 无报错
```

---

## 【人员 B】后端 CRUD - Prompt/Template/Project/Steps（2~3 天）

**负责范围**: T2.4 ~ T2.7

**复制以下内容给 B:**
```
## 你的任务（4 个，T2.1 完成后可并行启动）

### T2.4 Prompt Library 查询迁移（0.5 天）
- 文件: api/queries/prompts.ts
- 操作: listPrompts → promptList() / createPrompt → promptCreate() / deletePrompt → promptDelete() / updateFavorite → promptUpdateFavorite()
- 验收: Library 页列表/搜索/收藏/新建/删除全部正常

### T2.5 Templates 查询迁移（0.5 天）
- 文件: api/queries/templates.ts
- 操作: listPublicTemplates → templateListPublic() / listUserTemplates → templateListByUser() / createTemplate → templateCreate() / deleteTemplate → templateDelete()
- 验收: Template Market 页加载/搜索/我的模板正常

### T2.6 Projects 查询迁移（0.5 天）
- 文件: api/queries/projects.ts
- 操作: listProjects → projectList() / createProject → projectCreate() / deleteProject → projectDelete()
- 验收: Project 列表/新建/删除正常

### T2.7 Steps 查询迁移（0.5 天）
- 文件: api/queries/steps.ts
- 操作: listSteps → stepList() / updateStep → stepUpdate()
- 验收: Project Detail 页 steps 列表加载/状态更新正常

## 交付标准
- [ ] Library + Market + Project 三个页面完整可用
- [ ] 所有查询文件不再 import better-sqlite3
- [ ] npm run test + Playwright E2E smoke 通过
```

---

## 【人员 C】前端/全栈 - AI 下沉 + 性能（2~3 天）

**负责范围**: T3.1 ~ T3.5

**复制以下内容给 C:**
```
## 你的任务（5 个，依赖 T2.9 完成后启动）

### T3.1 加密层完全下沉（0.5 天）
- 文件: api/lib/crypto.ts
- 操作: 将所有 decrypt() 改为 nativeAddon.decrypt()，文件改为 re-export，标记旧实现 @deprecated
- 验收: crypto.ts 无实际加解密逻辑、设置页 API Key 回显正常

### T3.2 AI 单路调用下沉（0.5 天）
- 文件: api/lib/ai-service-v3/client.ts
- 操作: callAISingle() 改为 window.electronAPI.aiCall({provider, apiKey, modelId, ...})
- 验收: 首页生成正常、无效 Key 返回 error 字段、超时生效

### T3.3 Self-Consistency 并行化（0.5 天）
- 文件: api/lib/ai-service-v3/client.ts
- 操作: runSelfConsistencyCallAI() 改为 aiCallSelfConsistency()，删除 JS 层循环
- 验收: 5 路并行完成、耗时从 ~15s 降到 ~3s、投票逻辑一致

### T3.4 AI 调用 fallback 验证（0.5 天）
- 文件: electron/main.cjs
- 操作: 临时重命名 .node 文件，验证 fallback 到 JS fetch 正常，恢复后走 Rust 路径
- 验收: Native 失败时 AI 仍可用、成功时走 Rust

### T3.5 性能基准测试（0.5 天）
- 文件: 新建 scripts/benchmark-db.mjs、scripts/benchmark-ai.mjs
- 操作: DB 1000 次查询对比、AI Self-Consistency 耗时对比、DevTools 验证 60fps
- 验收: SQLite ≥5x 提升、SC ≥4x 提升、AI 调用无 UI 卡顿

## 交付标准
- [ ] 首页 AI 生成走 Rust 路径
- [ ] Self-Consistency < 5s
- [ ] AI 调用期间 UI 不卡顿
```

---

## 【人员 D】DevOps + 清理 + 打包（3~4 天）

**负责范围**: T4.1 ~ T4.5 + T5.1 ~ T5.2 + TM.1（可与他人并行）

**复制以下内容给 D:**
```
## 你的任务（8 个，打包/配置/清理）

### T5.1 设置页增加 modelId 输入框（0.5 天，可最早启动）
- 文件: src/pages/Settings.tsx
- 操作: 每个 provider 增加 modelId 输入框，带默认值和 placeholder
- 验收: 设置页可修改 modelId、AI 调用使用新 modelId

### T5.2 自定义 baseUrl 支持（0.5 天）
- 文件: src/pages/Settings.tsx
- 操作: 增加"自定义 API 地址"输入框，ai_call() 已支持 baseUrl 参数
- 验收: 可配 Ollama/Azure/兼容端点、空值时用默认地址

### T4.1 删除旧数据库依赖（0.5 天）
- 操作: npm uninstall better-sqlite3 @types/better-sqlite3，删除已迁移的 queries 文件
- 验收: node_modules/better-sqlite3 不存在、npm run build 成功

### T4.2 删除 HTTP Server（零端口）（0.5 天）
- 文件: api/boot.ts、electron/main.cjs
- 操作: 删除 serve() 调用和 Hono server 初始化，保留 IPC handler
- 验收: 启动后无 localhost 端口占用、前端 API 走 IPC 正常

### T4.3 Electron Builder 打包配置（0.5 天）
- 文件: package.json (build 字段)
- 操作: 确保 .node 被包含进 extraResources，测试 npm run build:desktop:win
- 验收: 构建成功、产物 < 200MB、resources/native/tipai_core.node 存在

### T4.4 CI/CD 改造（0.5 天）
- 文件: .github/workflows/build.yml
- 操作: 增加 Rust 安装步骤、native build 前置、Matrix Win/macOS、产物上传
- 验收: CI Windows/macOS 构建成功、Release Assets 包含双平台

### T4.5 旧代码最终清理（0.5 天）
- 操作: 删除 api/lib/ai-service-v3/client.ts（如已迁移完）、api/lib/crypto.ts、Drizzle migration 文件
- 验收: npm run lint 无 unused import、npm run build 成功、功能完整

### TM.1 旧数据库自动迁移（0.5 天）
- 文件: electron/main.cjs
- 操作: 启动时检测旧 tipai.db，用 better-sqlite3 只读迁移到新库，完成后标记
- 验收: 旧用户升级数据无损、重复启动不重复迁移、写 migration.log

## 交付标准
- [ ] npm run build:desktop:win 成功
- [ ] 产物 < 200MB
- [ ] CI 双平台通过
- [ ] 旧用户数据迁移无损
```

---

## 依赖关系与排期建议

```
第 1 周
  周一 ~ 周二: A 做 T2.1~T2.3，B 等 T2.1 完成后做 T2.4~T2.5，D 做 T5.1~T5.2
  周三 ~ 周四: B 做 T2.6~T2.7，A 做 T2.8，C 可准备环境读代码
  周五: T2.9 回归测试（A/B 一起）

第 2 周
  周一 ~ 周二: C 做 T3.1~T3.3
  周三: C 做 T3.4~T3.5，D 做 T4.1~T4.2
  周四 ~ 周五: D 做 T4.3~T4.5 + TM.1

第 3 周
  周一: 全量回归 + Bugfix
  周二: Release v2.0.0-beta
```

---

## 任务汇总表（管理用）

| 人员 | 任务 | 预估 | 前置 | 交付物 |
|------|------|------|------|--------|
| A | T2.1 ~ T2.3 + T2.8 | 2~3 天 | 无 | settings 页可用 + 加密互通 |
| B | T2.4 ~ T2.7 | 2~3 天 | T2.1 | Library/Market/Project 页可用 |
| C | T3.1 ~ T3.5 | 2~3 天 | T2.9 | AI 走 Rust + SC < 5s |
| D | T4.1~T4.5 + T5.1~T5.2 + TM.1 | 3~4 天 | T2.9/T3.4 | 打包成功 + CI 通过 + 数据迁移 |

---

*生成时间: 2026-05-01*  
*基于: feature/rust-native-addon @ 9d12660*
