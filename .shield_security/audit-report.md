# TipAi 安全审计报告

> 审计时间: 2026-04-28 17:35 CST
> 审计工具: skill-security-audit v1.0.0
> 审计员: 小龙坎 (PM)
> 审计方法: SAST 静态扫描 + 人工代码审查

---

## 1. 审计概览

| 项目 | 结果 |
|------|------|
| 扫描文件数 | 150+ (ts/tsx/js/sql) |
| **严重漏洞 (Critical)** | **0** |
| **高危漏洞 (High)** | **0** |
| **中危漏洞 (Medium)** | **2** |
| **低危问题 (Low)** | **4** |
| 信息类 (Info) | 3 |

**整体安全评级: 🟡 B+ (良好，需修复 2 个中危问题)**

---

## 2. 中危漏洞 (Medium) — 需优先修复

### 🔶 M1: Export 路由缺少用户隔离验证

**文件**: `api/export-router.ts` (projects mutation, ~第 15-50 行)

**问题**: 当指定 `projectIds` 导出时，查询只检查 `inArray(projects.id, input.projectIds)`，但没有验证这些项目是否属于当前用户。

```typescript
// 当前代码 (有漏洞):
if (input.projectIds && input.projectIds.length > 0) {
  projectList = await db
    .select()
    .from(projects)
    .where(inArray(projects.id, input.projectIds))  // ❌ 缺少 userId 过滤
    .all();
}
```

**风险**: 攻击者可能通过猜测/枚举其他用户的 projectId 来导出他人的项目数据。

**修复方案**:
```typescript
// 修复:
if (input.projectIds && input.projectIds.length > 0) {
  projectList = await db
    .select()
    .from(projects)
    .where(
      and(
        inArray(projects.id, input.projectIds),
        eq(projects.userId, userId)  // ✅ 添加用户隔离
      )
    )
    .all();
}
```

---

### 🔶 M2: Export 路由下的关联数据查询也缺少用户隔离

**文件**: `api/export-router.ts` (循环内查询 projectSummaries, projectConversations, promptLibrary)

**问题**: 在导出循环中查询 `projectSummaries`、`projectConversations` 时，只按 `projectId` 过滤，但没有验证该 projectId 是否属于当前用户。虽然前置的 `projectList` 已过滤（如果修复 M1），但如果 M1 未修复或存在其他路径，这仍是风险点。

**风险**: 数据横向越权读取。

**修复方案**: 确保所有数据库查询都包含 `eq(table.userId, userId)` 或从已验证的 projectList 中派生查询条件。

---

## 3. 低危问题 (Low)

### 🟢 L1: DatabaseBackup 类路径未完全净化

**文件**: `db/backup.ts` (createBackup 方法)

**问题**: `backupDir` 参数来自函数输入，虽然使用了 `path.join`，但如果传入恶意路径如 `"../../../etc"`，可能导致文件写入到非预期目录。

```typescript
// 当前:
fs.mkdirSync(backupDir, { recursive: true });  // 可能创建任意目录
// 后续有文件复制操作
```

**风险**: 低 — 该功能目前仅在本地 Electron 环境使用，无网络暴露。

**修复方案**: 对 `backupDir` 进行路径规范化并限制在应用数据目录内:
```typescript
const resolvedBackupDir = path.resolve(backupDir);
const appDataDir = path.resolve(process.env.APP_DATA || './data');
if (!resolvedBackupDir.startsWith(appDataDir)) {
  throw new Error("Backup directory must be within app data directory");
}
```

---

### 🟢 L2: Electron 主进程的 spawn 未限制环境变量

**文件**: `electron/main.js` (第 101 行)

**问题**: `spawn('node', [backendPath], { env })` 中 `env` 包含完整的环境变量，可能传递敏感信息给子进程。

**风险**: 低 — 子进程是应用自己的后端，非外部命令。

**修复方案**: 明确列出需要传递的环境变量，而非传递全部:
```javascript
const safeEnv = {
  NODE_ENV: env.NODE_ENV,
  DATABASE_URL: env.DATABASE_URL,
  // 仅传递必要的变量
};
spawn('node', [backendPath], { env: safeEnv })
```

---

### 🟢 L3: OAuth 回调缺少 state 验证日志

**文件**: `api/kimi/auth.ts` (OAuth callback 处理)

**问题**: 当 `state` 验证失败时返回 400，但没有记录失败日志，难以发现 CSRF 攻击尝试。

**修复方案**: 添加安全日志:
```typescript
console.warn("[Security] OAuth state mismatch, possible CSRF attempt", {
  expectedState: storedState,
  receivedState: state,
  ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip')
});
```

---

### 🟢 L4: CSP 的 style-src 允许 unsafe-inline

**文件**: `api/boot.ts` (CSP 配置)

```typescript
styleSrc: ["'self'", "'unsafe-inline'"],  // ❌ 允许内联样式
```

**风险**: 低 — 现代 React + Tailwind 应用通常需要此配置，但仍放宽了 CSP。

**修复方案**: 如果可能，移除此配置并使用 nonce/hash。对于使用 Tailwind 的 SPA 应用，此问题通常可接受。

---

## 4. 信息类 (Info)

### ℹ️ I1: 认证中间件在 context.ts 中是可选的

**文件**: `api/context.ts`

```typescript
export async function createContext(opts) {
  const ctx = { req, resHeaders };
  try {
    ctx.user = await authenticateRequest(opts.req.headers);
  } catch {
    // Authentication is optional here  // ℹ️ 设计如此
  }
  return ctx;
}
```

**说明**: 这是 tRPC 的标准模式 — `publicQuery` 不强制认证，`authedQuery` 强制认证。非漏洞，但需确保所有敏感路由使用 `authedQuery`。

**验证**: 已检查，`exportRouter`、`projectRouter`、`optimizerRouter` 等敏感路由均使用 `authedQuery`，✅ 正确。

---

### ℹ️ I2: 错误响应可能暴露过多信息

**文件**: 多处 API 路由

部分错误处理返回具体的错误信息，可能暴露内部实现细节。建议生产环境只返回通用错误消息，详细错误记录到服务端日志。

---

### ℹ️ I3: 日志未分级处理

**文件**: 多处 `console.log`

应用中使用 `console.log` 进行调试输出，包含部分数据内容。建议:
- 生产环境禁用或重定向 `console.log`
- 使用结构化日志 (pino/winston)
- 敏感数据脱敏后记录

---

## 5. 正面发现 (安全实践良好的地方)

| 实践 | 状态 | 说明 |
|------|------|------|
| **无硬编码密钥** | ✅ | 所有 API Key 使用 `process.env`，Settings 页面使用 `type="password"` 输入框 |
| **ORM 参数化查询** | ✅ | 使用 Drizzle ORM，无字符串拼接 SQL |
| **CORS 严格配置** | ✅ | 生产环境只允许同源，开发环境限制 localhost |
| **CSP 配置** | ✅ | 有基本的内容安全策略 |
| **认证中间件** | ✅ | `authedQuery` / `adminQuery` 分层权限控制 |
| **请求体大小限制** | ✅ | `bodyLimit({ maxSize: 5 * 1024 * 1024 })` |
| **安全响应头** | ✅ | `secureHeaders()` 启用 X-Frame-Options、X-Content-Type-Options 等 |
| **SQL 注入防护** | ✅ | 全部使用 ORM 查询，无原始 SQL 拼接 |
| **XSS 防护** | ✅ | React 默认转义，无 dangerouslySetInnerHTML |
| **数据库 WAL 模式** | ✅ | `journal_mode = WAL` 提升并发安全 |
| **外键约束** | ✅ | `foreign_keys = ON` |

---

## 6. 修复优先级

| 优先级 | 问题 | 文件 | 工作量 |
|--------|------|------|--------|
| **P0** | M1: Export 缺少用户隔离 | `api/export-router.ts` | 5 分钟 |
| **P0** | M2: Export 关联查询隔离 | `api/export-router.ts` | 10 分钟 |
| **P1** | L1: Backup 路径限制 | `db/backup.ts` | 15 分钟 |
| **P1** | L3: OAuth CSRF 日志 | `api/kimi/auth.ts` | 5 分钟 |
| **P2** | L2: spawn 环境变量限制 | `electron/main.js` | 10 分钟 |
| **P2** | I2: 错误信息分级 | 多处 | 30 分钟 |
| **P2** | I3: 日志结构化 | 全局 | 1 小时 |

---

## 7. 审计结论

**TipAi 代码库整体安全状况良好。**

- 无严重/高危漏洞
- 2 个中危问题均为**数据越权读取**，修复简单（添加 userId 过滤）
- 安全基础设施完善: CSP、CORS、认证中间件、ORM 参数化查询
- 无硬编码密钥、无 SQL 注入、无 XSS、无命令注入

**建议立即修复 M1 和 M2（数据隔离），其余可按优先级排队。**

---

*审计完成。本报告为本地文件，未经用户允许不推送云端。*
