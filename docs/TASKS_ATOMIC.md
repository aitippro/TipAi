# TipAi v2.0.0 原子任务执行清单（基于实际代码）

> 分支: `feature/rust-native-addon` @ `9d12660`
> 生成时间: 2026-05-01

---

## 一、代码审计发现（计划 vs 实际）

### 🔴 阻塞性问题（必须先解决）

| # | 问题 | 影响 | 位置 |
|---|------|------|------|
| B1 | `native/index.d.ts` 为空文件 | 前端无 Native Addon 类型提示，IDE 报错 | `native/index.d.ts` (0 bytes) |
| B2 | JS/Rust 加密格式**完全不兼容** | 旧用户 API Key 无法被 Rust 解密，数据迁移必失败 | `api/lib/crypto.ts` vs `native/src/crypto/mod.rs` |
| B3 | Rust 缺少大量前端实际调用的 API | template getById/update/use/rate、project getById/update、step create/delete、prompt update、user findByUsername | `native/src/lib.rs` 导出列表 |
| B4 | Rust 未实现 projectConversations / projectSummaries 表 | project 的 conversation/summary 功能无法迁移 | `native/src/db/*.rs` |

### 🟡 架构差异（计划假设 vs 实际代码）

| 计划假设 | 实际情况 |
|---------|---------|
| `api/queries/` 有 `prompts.ts` `templates.ts` `projects.ts` `steps.ts` | 实际**只有** `users.ts` 和 `connection.ts` |
| CRUD 集中在 `api/queries/*.ts` | CRUD 分散在 `template-router.ts`、`api/services/projects/crud.ts`、`api/services/promptforge/library.ts` |
| 前端直接调用 `window.electronAPI.xxx()` | 前端实际走 `tRPC → customFetch → window.electronAPI.fetch() → Hono → tRPC adapter → router` |
| 已经是零端口 | `electron/main.cjs` prod 模式仍启动 `@hono/node-server`（port 0），`mainWindow.loadURL('http://localhost:${backendPort}')` |
| `native/index.d.ts` 已维护 | 实际为空文件 |

---

## 二、任务总览

基于实际代码，22 个原子任务重新编排如下：

| Phase | 编号 | 任务 | 工时 | 前置 |
|-------|------|------|------|------|
| P0 阻塞 | T0.1 | 编写 `native/index.d.ts` 类型声明 | 0.5 天 | — |
| P0 阻塞 | T0.2 | 统一 JS/Rust 加密格式 | 0.5 天 | — |
| P1 补Rust | T1.1 | Rust 新增 `userFindByUsername` | 0.5 天 | — |
| P1 补Rust | T1.2 | Rust 新增 `templateUpdate` + `templateGetById` | 0.5 天 | — |
| P1 补Rust | T1.3 | Rust 新增 `templateUse`（useCount++）+ `templateRate` | 0.5 天 | T1.2 |
| P1 补Rust | T1.4 | Rust 新增 `projectGetById` + `projectUpdate` | 0.5 天 | — |
| P1 补Rust | T1.5 | Rust 新增 `stepCreate` + `stepDelete` | 0.5 天 | — |
| P1 补Rust | T1.6 | Rust 新增 `promptUpdate` | 0.5 天 | — |
| P2 迁移 | T2.1 | `api/queries/users.ts` 迁移 | 0.5 天 | T1.1 |
| P2 迁移 | T2.2 | `api/services/promptforge/settings.ts` DB 查询迁移 | 0.5 天 | T0.2 |
| P2 迁移 | T2.3 | `api/services/promptforge/library.ts` 迁移 | 0.5 天 | — |
| P2 迁移 | T2.4 | `template-router.ts` 迁移 | 0.5 天 | T1.2,T1.3 |
| P2 迁移 | T2.5 | `api/services/projects/crud.ts` projects CRUD 迁移 | 0.5 天 | T1.4 |
| P2 迁移 | T2.6 | `project-router.ts` 适配（跳过 conversation/summary） | 0.5 天 | T2.5 |
| P3 AI | T3.1 | `api/lib/ai-service-v3/client.ts` callAISingle 替换 | 0.5 天 | — |
| P3 AI | T3.2 | `api/lib/ai-service-v3/client.ts` Self-Consistency 替换 | 0.5 天 | T3.1 |
| P4 零端口 | T4.1 | `electron/main.cjs` 删除 `@hono/node-server` 启动 | 0.5 天 | T2.x |
| P4 零端口 | T4.2 | `api/boot.ts` 删除 standalone HTTP server | 0.5 天 | T4.1 |
| P5 清理 | T5.1 | 删除 `better-sqlite3`、`drizzle-orm`、`@hono/node-server` 依赖 | 0.5 天 | T4.2 |
| P5 清理 | T5.2 | 删除 `api/queries/connection.ts`、db schema、无用 router | 0.5 天 | T5.1 |
| P5 清理 | T5.3 | `npm run lint` + `npm run check` + `npm run build` 全绿 | 0.5 天 | T5.2 |
| P6 打包 | T6.1 | 验证 `npm run build:desktop:win` + CI 改造 | 0.5 天 | T5.3 |

**合计: 22 个任务，10 ~ 12 天**

---

## 三、P0 阻塞性问题（必须先解决）

### T0.1 编写 `native/index.d.ts` 类型声明

**现状**: `native/index.d.ts` 是 0 字节空文件。前端 `src/global.d.ts` 和 `src/types/electron.d.ts` 也没有声明 Native Addon API。  
**影响**: 任何调用 `window.electronAPI.userFindByUnionId()` 等的代码都会报 TS 错误。

#### 执行指令
1. 打开 `native/index.d.ts`，根据 `native/src/lib.rs` 导出函数编写类型声明
2. 同时更新 `src/global.d.ts` 和 `src/types/electron.d.ts`，加入 Native Addon 方法

```ts
// native/index.d.ts
export interface User {
  id: number;
  unionId: string;
  username?: string;
  password?: string;
  name?: string;
  email?: string;
  avatar?: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
  lastSignInAt?: string;
}

export interface InsertUser {
  unionId: string;
  username?: string;
  password?: string;
  name?: string;
  email?: string;
  avatar?: string;
  role?: string;
}

// ... 其他类型声明

export function version(): string;
export function dbOpen(path: string, secretKey?: string | null): void;
export function dbMigrate(migrationsDir: string): void;
export function dbClose(): void;
export function encrypt(plaintext: string, password: string): string;
export function decrypt(ciphertext: string, password: string): string;
export function settingsGet(userId: number): UserSettings;
export function settingsUpdate(userId: number, data: UpdateSettings): void;
export function settingsGetApiKey(userId: number, provider: string): string | null;
export function userFindByUnionId(unionId: string): User | null;
export function userFindById(id: number): User | null;
export function userUpsert(data: InsertUser): User;
export function promptList(userId: number, opts?: ListOpts): PromptEntry[];
export function promptCreate(data: InsertPrompt): PromptEntry;
export function promptDelete(id: number, userId: number): void;
export function promptUpdateFavorite(id: number, userId: number, isFavorite: number): void;
export function templateListPublic(): TemplateEntry[];
export function templateListByUser(userId: number): TemplateEntry[];
export function templateCreate(data: InsertTemplate): TemplateEntry;
export function templateDelete(id: number, userId: number): void;
export function projectList(userId: number): ProjectEntry[];
export function projectCreate(data: InsertProject): ProjectEntry;
export function projectDelete(id: number, userId: number): void;
export function stepList(projectId: number): StepEntry[];
export function stepUpdate(id: number, data: UpdateStep): StepEntry;
export function aiCall(req: AiCallRequest): Promise<AiCallResponse>;
export function aiCallSelfConsistency(req: AiCallRequest, sampleCount?: number): Promise<AiCallResponse>;
```

3. `src/types/electron.d.ts` 补充 Native Addon 方法签名（参照 `electron/preload.cjs` 已暴露的 API）

#### 验收标准
- [ ] `native/index.d.ts` 非空，包含所有导出函数的类型声明
- [ ] `src/types/electron.d.ts` 中包含 `nativeVersion`、`userFindByUnionId`、`userUpsert`、`settingsGet`、`settingsUpdate`、`settingsGetApiKey`、`promptList`、`promptCreate`、`templateListPublic`、`templateListByUser`、`templateCreate`、`templateDelete`、`projectList`、`projectCreate`、`projectDelete`、`stepList`、`stepUpdate`、`aiCall`、`aiCallSelfConsistency` 的方法签名
- [ ] `npm run check` 中引用 Native Addon 的文件无 "Cannot find name" 错误

#### 回滚
```bash
git checkout HEAD -- native/index.d.ts src/global.d.ts src/types/electron.d.ts
```

---

### T0.2 统一 JS/Rust 加密格式

**现状**:  
- JS (`api/lib/crypto.ts`): AES-256-GCM, format = base64(iv(16) + tag(16) + ciphertext), key = SHA-256(API_KEY_SECRET)  
- Rust (`native/src/crypto/mod.rs`): AES-256-GCM, format = base64(salt(16) + nonce(12) + ciphertext + tag), key = PBKDF2-HMAC-SHA256(password, salt, 100000)

**影响**: 两种格式完全不兼容。Rust `decrypt()` 无法解密 JS `encrypt()` 生成的密文。旧用户升级后 API Key 全部报废。

#### 执行指令
**方案 A（推荐）: 让 Rust 兼容 JS 格式**
1. 修改 `native/src/crypto/mod.rs`：
   - 删除 PBKDF2 key derivation，改用 SHA-256(password) 作为 key
   - 删除 salt 前缀
   - 修改 format 为 base64(iv(16) + tag(16) + ciphertext)
   - 保持 AES-256-GCM 算法不变
2. 或者**方案 B**: 修改 JS `api/lib/crypto.ts` 匹配 Rust 格式（不推荐，会导致旧数据无法解密）

以方案 A 为例的具体修改：
```rust
// native/src/crypto/mod.rs
use sha2::{Sha256, Digest};

fn derive_key(password: &str) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    hasher.finalize().into()
}

pub fn encrypt(plaintext: &str, password: &str) -> CryptoResult<String> {
    if password.is_empty() { return Ok(plaintext.to_string()); }
    let key = derive_key(password);
    let iv: [u8; 16] = rand::random();
    // ... AES-256-GCM encrypt
    // format: base64(iv + tag + ciphertext)
}

pub fn decrypt(ciphertext_b64: &str, password: &str) -> CryptoResult<String> {
    if password.is_empty() { return Ok(ciphertext_b64.to_string()); }
    let combined = base64::Engine::decode(...)?;
    let iv = &combined[..16];
    let tag = &combined[16..32];
    let ciphertext = &combined[32..];
    let key = derive_key(password);
    // ... AES-256-GCM decrypt
}
```

3. 新建 `scripts/verify-crypto.mjs` 做双向验证：
```js
import { encrypt, decrypt } from './api/lib/crypto.ts'; // 或 require
const native = require('./native');

const secret = process.env.API_KEY_SECRET || 'test-secret';
const plaintext = 'sk-test-api-key-12345';

// JS encrypt → Rust decrypt
const jsEncrypted = encrypt(plaintext);
const rustDecrypted = native.decrypt(jsEncrypted, secret);
console.assert(rustDecrypted === plaintext, 'JS encrypt → Rust decrypt FAILED');

// Rust encrypt → JS decrypt
const rustEncrypted = native.encrypt(plaintext, secret);
const jsDecrypted = decrypt(rustEncrypted);
console.assert(jsDecrypted === plaintext, 'Rust encrypt → JS decrypt FAILED');

// 旧数据兼容性（如果有旧数据库备份）
// const oldEncrypted = '...';
// const oldDecrypted = native.decrypt(oldEncrypted, secret);
// console.assert(oldDecrypted === '...');

console.log('PASS');
```

#### 验收标准
- [ ] `node scripts/verify-crypto.mjs` 输出 `"PASS"`，双向解密一致
- [ ] 旧数据库中已有的加密 API Key 能被 Rust `decrypt()` 正确解密
- [ ] 空字符串、中文、emoji、超长字符串（4096字符）加解密正常
- [ ] `native/src/crypto/mod.rs` 的单元测试 `cargo test` 通过

#### 回滚
```bash
git checkout HEAD -- native/src/crypto/mod.rs
```

---

## 四、P1 补齐 Rust 缺失 API（6 个任务）

### T1.1 Rust 新增 `userFindByUsername`

**现状**: `native/src/db/users.rs` 有 `user_find_by_union_id` 和 `user_find_by_id`，但没有 `user_find_by_username`。  
**JS 依赖**: `api/auth-router.ts` 第 72 行 `findUserByUsername(input.username)`。  
**Rust 需新增**: `user_find_by_username`。

#### 执行指令
1. `native/src/db/users.rs` 新增：
```rust
pub fn user_find_by_username(&self, username: &str) -> DbResult<Option<User>> {
    let mut stmt = self.conn.prepare(
        "SELECT id, unionId, username, password, name, email, avatar, role,
                datetime(createdAt, 'unixepoch') as created_at,
                datetime(updatedAt, 'unixepoch') as updated_at,
                datetime(lastSignInAt, 'unixepoch') as last_sign_in_at
         FROM users WHERE username = ?1",
    )?;
    // ... 与 user_find_by_union_id 相同的数据映射
}
```
2. `native/src/lib.rs` 新增导出：
```rust
#[napi]
pub fn user_find_by_username(username: String) -> Result<Option<User>> {
    with_db(|db| db.user_find_by_username(&username).map_err(|e| Error::from_reason(format!("{e}"))))
}
```
3. `electron/main.cjs` 新增 IPC handler：
```js
ipcMain.handle('native:userFindByUsername', (_e, username) => {
  if (!nativeAddon) throw new Error('Native addon not loaded');
  return nativeAddon.userFindByUsername(username);
});
```
4. `electron/preload.cjs` 新增暴露：
```js
userFindByUsername: (username) => ipcRenderer.invoke('native:userFindByUsername', username),
```
5. 重新构建 Native Addon：`cd native && npm run build`

#### 验收标准
- [ ] `node -e "console.log(require('./native').userFindByUsername('admin'))"` 不报错
- [ ] `npm run native:build` 成功
- [ ] `cargo test` 通过

---

### T1.2 Rust 新增 `templateUpdate` + `templateGetById`

**现状**: `native/src/db/templates.rs` 只有 listPublic/listByUser/create/delete。  
**JS 依赖**: `template-router.ts` 第 16-22 行 `get` 需要按 id 查询；没有 update 方法。

#### 执行指令
1. `native/src/db/templates.rs` 新增：
```rust
pub fn template_get_by_id(&self, id: i64) -> DbResult<Option<TemplateEntry>> { ... }
pub fn template_update(&self, id: i64, user_id: i64, data: UpdateTemplate) -> DbResult<TemplateEntry> { ... }
```
2. `native/src/lib.rs` 新增导出
3. `electron/main.cjs` 和 `preload.cjs` 新增 IPC handler
4. 重新构建

#### 验收标准
- [ ] `native.templateGetById(1)` 和 `native.templateUpdate(1, userId, data)` 可用
- [ ] `npm run native:build` 成功

---

### T1.3 Rust 新增 `templateUse` + `templateRate`

**现状**: `template-router.ts` 第 50-72 行有 `use`（useCount++）和 `rate`（更新评分），Rust 无对应实现。

#### 执行指令
1. `native/src/db/templates.rs` 新增：
```rust
pub fn template_use(&self, id: i64) -> DbResult<()> {
    self.conn.execute("UPDATE templates SET useCount = useCount + 1 WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn template_rate(&self, id: i64, score: i64) -> DbResult<(f64, i64)> {
    // 获取当前 rating/ratingCount，计算新值，更新
}
```
2. 导出到 `lib.rs`，添加 IPC handler，preload 暴露

#### 验收标准
- [ ] `native.templateUse(1)` 和 `native.templateRate(1, 8)` 可用
- [ ] useCount 原子递增正确
- [ ] rating 计算与 JS 公式一致：`newRating = (oldRating * oldCount + score) / (oldCount + 1)`

---

### T1.4 Rust 新增 `projectGetById` + `projectUpdate`

**现状**: `native/src/db/projects.rs` 只有 list/create/delete，没有 getById 和 update。  
**JS 依赖**: `api/services/projects/crud.ts` 第 40-71 行大量使用 `getProjectById` 和 `updateProject`。

#### 执行指令
1. `native/src/db/projects.rs` 新增：
```rust
pub fn project_get_by_id(&self, id: i64, user_id: i64) -> DbResult<Option<ProjectEntry>> { ... }
pub fn project_update(&self, id: i64, user_id: i64, data: UpdateProject) -> DbResult<ProjectEntry> { ... }
```
2. 导出到 `lib.rs`，添加 IPC handler，preload 暴露

#### 验收标准
- [ ] `native.projectGetById(1, userId)` 返回指定 project
- [ ] `native.projectUpdate(1, userId, data)` 正确更新字段
- [ ] 未授权 userId 返回 null 或报错

---

### T1.5 Rust 新增 `stepCreate` + `stepDelete`

**现状**: `native/src/db/projects.rs` 只有 stepList 和 stepUpdate，没有 create 和 delete。  
**JS 依赖**: `project-router.ts` 第 139-159 行 `createLifecycleStep` 需要 create step。

#### 执行指令
1. `native/src/db/projects.rs` 新增：
```rust
pub fn step_create(&self, data: InsertStep) -> DbResult<StepEntry> { ... }
pub fn step_delete(&self, id: i64, project_id: i64) -> DbResult<()> { ... }
```
2. 导出到 `lib.rs`，添加 IPC handler，preload 暴露

#### 验收标准
- [ ] `native.stepCreate(data)` 返回新 step
- [ ] `native.stepDelete(id, projectId)` 删除成功
- [ ] `npm run native:build` 成功

---

### T1.6 Rust 新增 `promptUpdate`

**现状**: `native/src/db/prompts.rs` 有 list/create/delete/updateFavorite，没有 update。  
**JS 依赖**: `api/services/promptforge/library.ts` 中的 save 实际是 insert，但如果要编辑已有 prompt 需要 update。

#### 执行指令
1. `native/src/db/prompts.rs` 新增：
```rust
pub fn prompt_update(&self, id: i64, user_id: i64, data: UpdatePrompt) -> DbResult<PromptEntry> { ... }
```
2. 导出到 `lib.rs`，添加 IPC handler，preload 暴露

#### 验收标准
- [ ] `native.promptUpdate(id, userId, data)` 正确更新字段
- [ ] `npm run native:build` 成功

---

## 五、P2 Service/Router 层迁移（6 个任务）

### T2.1 `api/queries/users.ts` 迁移

**现状**: `api/queries/users.ts` 使用 Drizzle ORM：`findUserByUnionId`、`findUserByUsername`、`upsertUser`。  
**目标**: 替换为 Native Addon 调用。

#### 执行指令
1. 打开 `api/queries/users.ts`
2. 删除 `import { eq } from "drizzle-orm"`、`import * as schema from "@db/schema"`、`import { getDb } from "./connection"`
3. 保留 `import type { InsertUser } from "@db/schema"`（或改为本地类型）
4. 修改 `findUserByUnionId`：
```ts
export async function findUserByUnionId(unionId: string) {
  if (typeof window !== 'undefined' && window.electronAPI?.userFindByUnionId) {
    return window.electronAPI.userFindByUnionId(unionId);
  }
  // fallback: 保留原 Drizzle 实现（用于 browser 模式）
  // ...
}
```

**注意**: 由于这段代码可能在主进程（Node）运行（被 router import），不能直接用 `window.electronAPI`。  
**正确做法**: 在主进程中直接 `require('../native')` 调用 native addon。

```ts
import native from '../native'; // 或条件 require

export async function findUserByUnionId(unionId: string) {
  return native.userFindByUnionId(unionId);
}
```

但 `api/queries/users.ts` 是在 Node 环境运行（被 tRPC router import），所以应该直接 `require('../../native')`。

5. 同样修改 `findUserByUsername` 和 `upsertUser`
6. 注意时间戳格式：Rust 返回 ISO 字符串（`datetime(..., 'unixepoch')`），Drizzle 返回 `Date` 对象。如果需要 `Date` 对象，在返回前 `new Date(row.created_at)`。

#### 验收标准
- [ ] `findUserByUnionId` 返回结果与 Drizzle 一致（字段名、类型）
- [ ] `findUserByUsername` 返回结果与 Drizzle 一致
- [ ] `upsertUser` 的 insert + onConflictDoUpdate 行为与 Drizzle 一致
- [ ] `npm run test` 中 auth 相关测试通过
- [ ] 登录流程正常（OAuth / demo / local）

#### 回滚
```bash
git checkout HEAD -- api/queries/users.ts
```

---

### T2.2 `api/services/promptforge/settings.ts` DB 查询迁移

**现状**: 该文件有复杂的业务逻辑（`inferDefaultModel`、`getAvailableModels`、`mapSettingsResponse` 等），但同时直接调用 Drizzle ORM 和 `api/lib/crypto.ts`。  
**目标**: 保留业务逻辑，将底层 DB 查询和加解密替换为 Native Addon。

#### 执行指令
1. 删除 `import { userSettings, type UserSettings } from "@db/schema"` 和 `import { getDb } from "../../queries/connection"`
2. 删除 `import { decrypt, encrypt } from "../../lib/crypto"`
3. 替换 `getPromptForgeSettingsRecord`：
```ts
export async function getPromptForgeSettingsRecord(userId: number) {
  const native = require('../../../native');
  return native.settingsGet(userId);
}
```
4. 替换 `updatePromptForgeSettings` 中的 DB 写入：
```ts
export async function updatePromptForgeSettings(userId: number, input: UpdatePromptForgeSettingsInput) {
  const native = require('../../../native');
  // 保留 buildSettingsUpdateData 中的业务逻辑（model 推断、auto-sync 等）
  // 但 API Key 加密改为传入明文，让 Rust 处理加密
  const updateData = { ... };
  native.settingsUpdate(userId, updateData);
  return { success: true };
}
```
5. 替换 `getApiKey`：
```ts
function getApiKey(model: string, settings?: UserSettings): string {
  // 如果 settings 是从 Rust 获取的，settings 中没有原始密文字段
  // 需要调用 native.settingsGetApiKey(userId, provider)
  // 所以 getApiKey 需要接收 userId 而非 settings
}
```

**注意**: 这个文件的业务逻辑和 Native Addon 的接口不完全匹配，需要仔细设计。

#### 验收标准
- [ ] 设置页加载正常，默认值（kimi/auto/zh）正确
- [ ] 保存 API Key 后重新加载页面，值能正确回显
- [ ] `inferDefaultModel` 逻辑仍然工作（deepseek > kimi > openai > claude）
- [ ] `getAvailableModels` 返回正确的模型列表和 key
- [ ] settings 相关 Vitest 测试通过

#### 回滚
```bash
git checkout HEAD -- api/services/promptforge/settings.ts
```

---

### T2.3 `api/services/promptforge/library.ts` 迁移

**现状**: `savePromptForgeLibraryItem`、`listPromptForgeLibraryItems`、`deletePromptForgeLibraryItem` 直接调用 Drizzle。  
**目标**: 替换为 Native Addon 调用。

#### 执行指令
1. 删除 `import { promptLibrary } from "@db/schema"` 和 `import { getDb } from "../../queries/connection"`
2. `savePromptForgeLibraryItem` → `native.promptCreate({ userId, title, originalIntent, generatedPrompt, framework, domain, model, tags })`
3. `listPromptForgeLibraryItems` → `native.promptList(userId)`（注意 Rust 的 `promptList` 支持 opts 参数，包括 limit/offset/domain/isFavorite/search）
4. `deletePromptForgeLibraryItem` → `native.promptDelete(id, userId)`

#### 验收标准
- [ ] Prompt Library 页面加载正常，列表渲染
- [ ] 搜索/过滤正常
- [ ] 新建 prompt 后出现在列表顶部
- [ ] 删除 prompt 后列表刷新
- [ ] Library 相关 Vitest 测试通过

#### 回滚
```bash
git checkout HEAD -- api/services/promptforge/library.ts
```

---

### T2.4 `template-router.ts` 迁移

**现状**: `template-router.ts` 直接使用 `getDb()` + Drizzle ORM。  
**目标**: 替换为 Native Addon 调用。

#### 执行指令
1. 删除 `import { getDb } from "./queries/connection"`、`import { templates } from "@db/schema"`、`import { eq, and, desc, sql } from "drizzle-orm"`
2. 在 router 中直接调用 Native Addon：
```ts
export const templateRouter = createRouter({
  list: publicQuery.query(async () => {
    const native = require('../../native');
    return native.templateListPublic();
  }),
  get: publicQuery.input(...).query(async ({ input }) => {
    const native = require('../../native');
    const list = native.templateListPublic();
    return list.find((t: TemplateEntry) => t.id === input.id) || null;
  }),
  create: authedQuery.input(...).mutation(async ({ input, ctx }) => {
    const native = require('../../native');
    return native.templateCreate({
      userId: ctx.user.id,
      title: input.title,
      description: input.description,
      domain: input.domain,
      content: input.content,
      tags: input.tags,
      isPublic: input.isPublic ? 1 : 0,
    });
  }),
  // ... 其他方法
});
```

3. 注意：`get` 方法原来用 Drizzle 按 id 查询，Rust 没有 `templateGetById`（T1.2 补齐后才能用）。如 T1.2 未完成，可先用 `templateListPublic()` 或 `templateListByUser()` 然后 filter。

#### 验收标准
- [ ] Template Market 页面加载正常
- [ ] 公共模板列表渲染
- [ ] "我的模板"页正常
- [ ] 新建/删除模板正常
- [ ] useCount 递增和 rating 更新正常（依赖 T1.3）

#### 回滚
```bash
git checkout HEAD -- api/template-router.ts
```

---

### T2.5 `api/services/projects/crud.ts` projects CRUD 迁移

**现状**: `createProject`、`listUserProjects`、`getProjectById`、`updateProject`、`deleteProject` 使用 Drizzle。  
**目标**: 替换为 Native Addon 调用。

#### 执行指令
1. 删除 `import { projects, projectConversations, projectSummaries, type Project } from "@db/schema"` 中的 `projects` 相关 import（保留 projectConversations 和 projectSummaries，Rust 未实现）
2. 删除 `import { getDb } from "../../queries/connection"`
3. `createProject` → `native.projectCreate({ userId, title, description, domain, intent, status: 'draft' })`
4. `listUserProjects` → `native.projectList(userId)`
5. `getProjectById` → `native.projectGetById(id, userId)`（依赖 T1.4）
6. `updateProject` → `native.projectUpdate(id, userId, data)`（依赖 T1.4）
7. `deleteProject` → `native.projectDelete(id, userId)`

#### 验收标准
- [ ] Project 列表页加载正常
- [ ] 新建 project 正常
- [ ] 删除 project 正常
- [ ] 更新 project 正常（依赖 T1.4）
- [ ] Projects 相关 Vitest 测试通过

#### 回滚
```bash
git checkout HEAD -- api/services/projects/crud.ts
```

---

### T2.6 `project-router.ts` 适配

**现状**: `project-router.ts` 有大量 conversation/summary/lifecycle 相关路由，这些涉及 `projectConversations` 和 `projectSummaries` 表，Rust 未实现。  
**目标**: 将不涉及 conversation/summary 的路由迁移到 Native Addon，conversation/summary 暂时保留 Drizzle。

#### 执行指令
1. `list`、`get`、`create`、`update`、`delete` 路由改为调用已迁移的 `api/services/projects/crud.ts` 函数（这些函数内部已调用 Native Addon）
2. `saveConversationTurn`、`getProjectConversation`、`getProjectSummary`、`saveProjectSummary`、`generateSummary`、`generateNextQuestion` 保留原实现（依赖 Drizzle）
3. `getPipeline`、`createStep`、`moveStep`、`linkStep`、`getChildSteps` 中涉及 steps 表的操作：
   - `getProjectPipeline` 可能涉及 steps 查询
   - `createStep` → 需要 Rust `stepCreate`（T1.5）
   - `moveStep` → `native.stepUpdate(stepId, { stage: toStage })`

#### 验收标准
- [ ] Project 基本 CRUD 走 Native Addon
- [ ] Conversation/Summary 功能仍然可用（保留 Drizzle）
- [ ] Steps 生命周期操作正常
- [ ] E2E 中 Project 相关场景通过

#### 回滚
```bash
git checkout HEAD -- api/project-router.ts
```

---

## 六、P3 AI 调用下沉（2 个任务）

### T3.1 `api/lib/ai-service-v3/client.ts` callAISingle 替换

**现状**: `callAISingle` 使用 `fetch()` 直接调用各 provider 的 HTTP API。  
**目标**: 替换为 `native.aiCall()`。

#### 执行指令
1. 打开 `api/lib/ai-service-v3/client.ts`
2. 在文件顶部添加 Native Addon 导入：
```ts
let native: typeof import('../../../native') | null = null;
try {
  native = require('../../../native');
} catch { /* fallback */ }
```
3. 修改 `callAISingle`：
```ts
async function callAISingle(
  provider: string, apiKey: string, systemPrompt: string, userMessage: string, temperature = 0.5
): Promise<string | null> {
  if (native) {
    const result = await native.aiCall({
      provider, apiKey, systemPrompt, userMessage, temperature,
      modelId: MODEL_CONFIGS[provider]?.modelId,
      baseUrl: MODEL_CONFIGS[provider]?.baseUrl,
      maxTokens: 4000,
      timeoutMs: 30000,
    });
    if (result.error) {
      console.error(`${provider} error: ${result.error}`);
      return null;
    }
    return result.content;
  }
  // fallback: 保留原 fetch 实现
  // ...
}
```

4. 注意 `MODEL_CONFIGS` 中 `claude` 的 `baseUrl` 和 `auth_header` 差异已在 Rust 中处理

#### 验收标准
- [ ] 首页输入 intent，点击生成，正常返回 prompt
- [ ] DeepSeek/Kimi/OpenAI/Claude 都能正常调用
- [ ] 无效 API Key 返回 null 而非抛异常
- [ ] 超时设置生效
- [ ] DevTools Console 可见 `[Rust] AI call` 日志

#### 回滚
```bash
git checkout HEAD -- api/lib/ai-service-v3/client.ts
```

---

### T3.2 `api/lib/ai-service-v3/client.ts` Self-Consistency 替换

**现状**: `runSelfConsistencyCallAI` 用 `Promise.all` 并行调用 5 次 `callAISingle`（JS 层的伪并行）。  
**目标**: 替换为 `native.aiCallSelfConsistency()`（Rust `tokio::spawn` 真并行）。

#### 执行指令
1. 修改 `runSelfConsistencyCallAI`：
```ts
async function runSelfConsistencyCallAI(
  provider: string, apiKey: string, systemPrompt: string, userMessage: string,
  sampleCount: number, temperature: number
): Promise<string | null> {
  if (native) {
    const result = await native.aiCallSelfConsistency({
      provider, apiKey, systemPrompt, userMessage, temperature,
      modelId: MODEL_CONFIGS[provider]?.modelId,
      baseUrl: MODEL_CONFIGS[provider]?.baseUrl,
      maxTokens: 4000,
      timeoutMs: 30000,
    }, sampleCount);
    if (result.error) {
      console.error(`[callAI SC] ${result.error}`);
      return null;
    }
    console.log(`[callAI SC] Winner via Rust`);
    return result.content;
  }
  // fallback: 保留原 Promise.all 实现
  // ...
}
```

2. 删除原 `normalizeVoteKey` 和投票逻辑（Rust 已内置）

#### 验收标准
- [ ] 复杂 intent 触发 clarification 时，SC 正常完成
- [ ] 耗时从 ~15s 降到 ~3-5s（`console.time` 测量）
- [ ] 结果与原来一致
- [ ] AI 调用期间 UI 不卡顿

#### 回滚
```bash
git checkout HEAD -- api/lib/ai-service-v3/client.ts
```

---

## 七、P4 零端口（2 个任务）

### T4.1 `electron/main.cjs` 删除 `@hono/node-server` 启动

**现状**: prod 模式下，`startBackend()` 函数通过 `@hono/node-server` 启动 Hono server（port 0），`mainWindow.loadURL('http://localhost:${backendPort}')`。  
**目标**: 删除 TCP server，直接加载本地 HTML 文件。

#### 执行指令
1. 打开 `electron/main.cjs`
2. 删除 `startBackend()` 中 `const [{ serve }, mod] = await Promise.all([...])` 到 `server.on('error', reject)` 之间的代码
3. 保留 `honoApp = mod.default`（因为 `api:fetch` 仍需要它）
4. 修改 `mainWindow.loadURL`：
```js
// 原来
mainWindow.loadURL(`http://localhost:${backendPort}`);
// 改为
const indexPath = path.join(__dirname, '../dist/index.html');
mainWindow.loadFile(indexPath);
```
5. 删除 `backendPort`、`backendServer` 相关变量（保留 `backendReady = true`）

#### 验收标准
- [ ] `Get-NetTCPConnection -OwningProcess <pid>`（PowerShell）无 localhost 端口
- [ ] App 启动后正常显示
- [ ] 前端 API 调用仍正常（`api:fetch` → Hono in-process）

#### 回滚
```bash
git checkout HEAD -- electron/main.cjs
```

---

### T4.2 `api/boot.ts` 删除 standalone HTTP server

**现状**: `api/boot.ts` 底部有 `if (!process.env.VITE_DEV_SERVER_URL && !process.env.TIPAI_ELECTRON)` 自动启动 HTTP server。  
**目标**: 删除 standalone server 启动代码。

#### 执行指令
1. 打开 `api/boot.ts`
2. 删除底部第 134-143 行：
```ts
if (!process.env.VITE_DEV_SERVER_URL && !process.env.TIPAI_ELECTRON) {
  const { serve } = await import("@hono/node-server");
  // ...
}
```
3. 保留 Hono app 定义、middleware、tRPC adapter（Electron 仍需要它们）

#### 验收标准
- [ ] `npm run build` 成功
- [ ] Electron 模式下功能正常
- [ ] 无 `"@hono/node-server"` 在 standalone 模式下自动启动

#### 回滚
```bash
git checkout HEAD -- api/boot.ts
```

---

## 八、P5 清理（3 个任务）

### T5.1 删除旧依赖

**现状**: `package.json` 中仍有 `better-sqlite3`、`drizzle-orm`、`@hono/node-server` 等依赖。

#### 执行指令
1. `npm uninstall better-sqlite3 @types/better-sqlite3 drizzle-orm drizzle-kit @hono/node-server`
2. 运行 `npm run build`，确认无 missing module 错误
3. 如有其他文件仍 import 这些包，逐个修复

#### 验收标准
- [ ] `node_modules/better-sqlite3` 不存在
- [ ] `node_modules/drizzle-orm` 不存在
- [ ] `node_modules/@hono/node-server` 不存在
- [ ] `npm run build` 成功
- [ ] `npm run check` 无类型错误

#### 回滚
```bash
git checkout HEAD -- package.json package-lock.json
npm install
```

---

### T5.2 删除无用文件

**现状**: `api/queries/connection.ts`、`db/schema.ts`、一些 Drizzle migration 文件等可能已无用。

#### 执行指令
1. 删除 `api/queries/connection.ts`（如果所有查询已迁移）
2. 删除 `db/schema.ts` 中已迁移的表定义（或标记为 deprecated）
3. 删除 `db/migrations/` 中的 Drizzle migration 文件（保留 `migrations/0001_initial_schema.sql` 给 Rust 用）
4. 删除 `api/lib/crypto.ts`（如果 T0.2 已完成且 Rust 加密完全替代）
5. 运行 `npm run lint`，修复 unused import

#### 验收标准
- [ ] `npm run lint` 0 errors / 0 warnings
- [ ] `npm run check` 无类型错误
- [ ] `npm run build` 成功

#### 回滚
```bash
git checkout HEAD -- api/queries/connection.ts db/schema.ts
```

---

### T5.3 全量回归

#### 执行指令
1. `npm run check`
2. `npm run lint`
3. `npm run test`
4. `npm run build`
5. `npm run build:desktop:win`

#### 验收标准
- [ ] TypeScript 类型检查通过
- [ ] ESLint 0 errors / 0 warnings
- [ ] Vitest 全部通过
- [ ] 生产构建成功
- [ ] Electron 打包成功
- [ ] Playwright E2E smoke 测试通过

---

## 九、P6 打包验证（1 个任务）

### T6.1 验证打包 + CI 改造

**现状**: `package.json` 的 `build` 字段已有 `native/*.node` 和 `asarUnpack`，但 `extraResources` 缺少 `native/` 目录的复制。

#### 执行指令
1. 检查 `package.json` build 字段：
   - `files` 已包含 `native/*.node` ✅
   - `asarUnpack` 已包含 `**/*.node` ✅
   - 确认 `extraResources` 是否需要添加 `native/` → `resources/native/`
2. 运行 `npm run build:desktop:win`
3. 检查产物目录：
   - `release/win-unpacked/resources/` 下是否有 `.node` 文件
   - 或 `release/` 下的 `.exe` 安装后 `resources/native/` 是否有 `.node`
4. 运行安装后的 App，验证功能
5. `.github/workflows/build.yml` 增加 Rust 安装步骤

#### 验收标准
- [ ] `npm run build:desktop:win` 成功
- [ ] 产物大小 < 200MB
- [ ] 安装后 `resources/native/tipai_core.node` 存在
- [ ] 安装后 App 正常启动且功能完整
- [ ] CI 构建成功（如有配置）

---

## 十、任务依赖图

```
T0.1 index.d.ts ──┐
T0.2 加密互通 ────┼──→ T2.x 迁移必须完成
                  │
T1.1 userFindByUsername ──→ T2.1 users.ts
T1.2 templateGetById/Update ──→ T2.4 template-router
T1.3 templateUse/Rate ──→ T2.4 template-router
T1.4 projectGetById/Update ──→ T2.5 projects/crud
T1.5 stepCreate/Delete ──→ T2.6 project-router
T1.6 promptUpdate ──→ T2.3 promptforge/library
                  │
T2.1 ~ T2.6 全部完成 ──→ T3.1 AI 下沉
                  │
T3.1 callAISingle ──→ T3.2 Self-Consistency
                  │
T2.x + T3.x 完成 ──→ T4.1 electron/main.cjs 删 server
                  │
T4.1 ──→ T4.2 api/boot.ts 删 standalone
                  │
T4.2 ──→ T5.1 卸载依赖
T5.1 ──→ T5.2 删文件
T5.2 ──→ T5.3 回归
T5.3 ──→ T6.1 打包
```

---

## 十一、未迁移项（保留 Drizzle 或后续处理）

以下功能 Rust 未实现，本阶段保留原 Drizzle 实现：

| 功能 | 文件 | 原因 |
|------|------|------|
| projectConversations | `api/services/projects/crud.ts` | Rust 无该表 CRUD |
| projectSummaries | `api/services/projects/crud.ts` | Rust 无该表 CRUD |
| cloudSync | `db/schema.ts` | Rust 无该表 CRUD |
| promptOptimizations | `db/schema.ts` | Rust 无该表 CRUD |
| evaluations | `db/schema.ts` | Rust 无该表 CRUD |
| domainPackages | `db/schema.ts` | Rust 无该表 CRUD |
| projectConversations | `db/schema.ts` | Rust 无该表 CRUD |
| projectSummaries | `db/schema.ts` | Rust 无该表 CRUD |

---

*文档版本: v4.0-基于实际代码*  
*生成时间: 2026-05-01*  
*基于分支: feature/rust-native-addon @ 9d12660*
