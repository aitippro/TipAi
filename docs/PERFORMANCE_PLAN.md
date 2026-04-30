# TipAi 极致性能优化方案

> 当前状态 → 目标: 启动 < 2s, 内存 < 200MB, 包体 < 150MB, 操作 < 16ms

---

## 一、现状诊断

| 指标 | 当前 | 问题 |
|------|------|------|
| 前端 JS Bundle | 710KB | 过大，含未 tree-shake 的图标库 |
| CSS | 114KB | 未使用样式未完全 purge |
| 后端 Bundle | 1.2MB | AWS SDK 冗余 |
| 依赖数 | 65 deps + 29 devDeps | 过多重型依赖 |
| 内联 handler | 61 处 | 每次渲染创建新函数 |
| console.* 调用 | 47 处 | 生产环境仍输出 |
| Electron 包体 | ~230MB | 含未压缩的 Chromium |

---

## 二、优化方案（分三级）

### P0 — 立即执行（预计减 40% 体积 + 2x 启动速度）

#### 1. 移除重型依赖

| 依赖 | 大小 | 替换方案 |
|------|------|---------|
| `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` | ~13MB | 移除（S3 上传未实际使用） |
| `date-fns` + `date-fns-jalali` | ~55MB | `Intl.DateTimeFormat` 原生 API |
| `recharts` | ~5MB | 轻量 Canvas 图表或移除 |
| `lucide-react` 全量导入 | ~45MB | 改为单图标按需导入 |

```bash
# 执行
npm uninstall @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm uninstall date-fns date-fns-jalali
npm uninstall recharts
```

#### 2. 图标按需导入（关键）

当前每个文件 `import { X, Y, Z } from "lucide-react"` 会触发整个库的解析。

```typescript
// ❌ 当前 — 引入整个 lucide-react
import { Sparkles, Zap, Shield } from "lucide-react"

// ✅ 优化 — 使用动态导入 + Vite tree-shake
// vite.config.ts 添加:
build: {
  rollupOptions: {
    treeshake: true,
  }
}
```

lucide-react 支持 tree-shaking，但需要 `"moduleResolution": "bundler"` (已有)。Vite 7 默认 tree-shake。当前 710KB 包含了所有图标的 SVG 数据。优化后预计 < 100KB。

#### 3. 移除 console.* 在生产环境

```typescript
// src/lib/logger.ts 已存在，统一使用
// 在 vite.config.ts 添加 esbuild drop:
esbuild: {
  drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
}
```

#### 4. 内联 handler 优化

```typescript
// ❌ 当前 — 61 处内联函数，每次渲染创建
onChange={(e) => setValue(e.target.value)}
onClick={() => handleClick(id)}

// ✅ 优化 — useCallback 包裹
const handleChange = useCallback((e) => setValue(e.target.value), [])
const handleItemClick = useCallback(() => handleClick(id), [id])
```

### P1 — 短期优化（预计再减 30% 体积 + 流畅度提升）

#### 5. CSS Purge

```javascript
// tailwind.config.js
content: [
  "./src/**/*.{ts,tsx}",    // 精确匹配，不含 node_modules
  "./index.html",
],
```

#### 6. 路由级代码分割（Electron 桌面端优化版）

Electron 本地加载，不需要网络懒加载。但可以预加载关键页面：

```typescript
// 关键页面直接导入（无延迟）
import Home from "./pages/Home"
import Settings from "./pages/Settings"

// 非关键页面预加载
const Workspace = lazy(() => import("./pages/Workspace"))
```

#### 7. 图片优化

| 文件 | 当前 | 优化 |
|------|------|------|
| icon-512.png | 34KB | → WebP (8KB) |
| icon-256.png | 10KB | → WebP (3KB) |
| logo.png | 68KB | → WebP (15KB) |

#### 8. Electron 构建优化

```json
// package.json build 字段
"files": [
  "dist/**/*",
  "electron/**/*",
  "!*.map",          // 排除 sourcemap
  "!node_modules/**/*.md",
  "!node_modules/**/*.ts"
],
"asar": true,         // 打包成 asar 减少 IO
"compression": "maximum"
```

### P2 — 架构级优化（预计 2x 启动速度）

#### 9. 移除运行时 HTTP 服务器

当前架构即使是 IPC 模式也需要 `@hono/node-server` 的 `serve()` 函数。改为纯进程内调用：

```javascript
// electron/main.cjs — 不启动 HTTP server
const mod = await import(bootUrl);
honoApp = mod.default;
// API 调用通过 honoApp.fetch(new Request(...)) 直接处理
// 不需要 serve() 监听端口
```

#### 10. 数据库连接池预热

```typescript
// 启动时预连接 SQLite
// api/queries/connection.ts
let dbInstance: Database;
export function warmup() {
  dbInstance = new Database(dbPath);
  dbInstance.pragma("journal_mode = WAL");
  dbInstance.pragma("cache_size = -64000"); // 64MB cache
  dbInstance.pragma("synchronous = NORMAL");
}
```

#### 11. 渲染进程优化

```typescript
// electron/main.cjs — BrowserWindow 配置
new BrowserWindow({
  webPreferences: {
    backgroundThrottling: false,    // 后台不降帧
    enablePreferredSizeMode: true,  // 硬件加速
  },
  // GPU 加速
  backgroundColor: '#00000000',
})
```

---

## 三、目标指标

| 指标 | 优化前 | P0 后 | P1 后 | P2 后 | 目标 |
|------|--------|-------|-------|-------|------|
| JS Bundle | 710KB | 200KB | 150KB | 120KB | < 200KB |
| CSS | 114KB | 60KB | 30KB | 30KB | < 50KB |
| 后端 Bundle | 1.2MB | 800KB | 600KB | 500KB | < 800KB |
| 依赖数 | 65 | 55 | 50 | 48 | < 55 |
| Electron 包 | 230MB | 180MB | 160MB | 140MB | < 160MB |
| 冷启动 | ~8s | ~4s | ~3s | ~2s | < 3s |
| 页面切换 | ~300ms | ~100ms | ~50ms | ~30ms | < 100ms |
| 内存占用 | ~300MB | ~250MB | ~200MB | ~150MB | < 200MB |

---

## 四、执行顺序

```
Week 1: P0-1 移除重型依赖 + P0-2 图标优化
Week 1: P0-3 移除 console + P0-4 内联 handler
Week 2: P1-5 CSS purge + P1-6 路由分割
Week 2: P1-7 图片优化 + P1-8 Electron 优化
Week 3: P2-9 移除 HTTP server + P2-10 DB 预热
Week 3: P2-11 渲染进程优化
```

---

## 五、性能监控

```typescript
// src/lib/perf.ts — 添加性能标记
if (typeof performance !== 'undefined') {
  performance.mark('app-start');
  // ...
  performance.mark('app-ready');
  performance.measure('startup', 'app-start', 'app-ready');
}
```

CI 中添加 Lighthouse 或自定义性能检查，确保回归不超标。

---

*制定日期: 2026-04-30 · 版本: 1.0*
