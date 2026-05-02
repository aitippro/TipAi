# 交接提示词（直接复制发给接手人）

---

## 复制以下内容

```
你正在接手 TipAi 桌面应用的架构重建项目。

## 项目背景

TipAi 是一款 Electron + React + TypeScript 桌面应用，帮助用户将模糊的AI需求转化为结构化提示词。当前处于 v1.2.2 → v2.0.0 的架构重建阶段，核心目标是用 Rust Native Addon 替代现有的 JS 后端（better-sqlite3 + Hono HTTP server），实现：
- 零端口（前端通过 IPC 直接调用 Rust，不再走 HTTP）
- AI 调用不阻塞 UI（Rust tokio 异步 + 多路并行）
- 更小的打包体积、更好的性能

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite + Tailwind |
| 桌面壳 | Electron 41 + Playwright E2E |
| 新后端 | Rust + napi-rs + rusqlite + tokio + reqwest |
| 旧后端 | better-sqlite3 + Drizzle ORM + Hono（待移除）|
| 构建 | napi-rs CLI（生成 .node 二进制）+ electron-builder |

## 当前进度

Phase 1 已完成，Rust Native Addon 核心已就绪：
- ✅ SQLite WAL 模式连接 + 6 张核心表 CRUD
- ✅ AES-256-GCM API Key 加密/解密
- ✅ AI HTTP 调用（DeepSeek/Kimi/OpenAI/Claude + Self-Consistency 5路并行投票）
- ✅ Electron IPC 桥接（15 个 handler）+ fallback 设计
- ✅ 编译通过（debug/release 均可构建 .node）
- ✅ 核心功能验证通过（DB CRUD + Crypto + AI）

**分支**: `feature/rust-native-addon`（origin 已 push）
**文档**:
- `docs/ARCHITECTURE_REBUILD_PLAN.md` — 整体架构方案
- `docs/TASKS_ATOMIC.md` — 你的任务清单（22 个原子任务 + 依赖图）

## 环境准备（10 分钟）

```bash
git clone <repo>
git checkout feature/rust-native-addon

# 1. Node 依赖
npm install

# 2. Rust 工具链（Windows）
rustup toolchain install stable

# 3. 构建 Native Addon
cd native && npm install
npm run build        # debug
npm run build:release # release（41秒）

# 4. 验证
cd ..
node -e "console.log(require('./native').version())"
# 预期输出: 1.2.2
```

## 你的任务

打开 `docs/TASKS_ATOMIC.md`，按顺序执行：

**第一阶段（你负责）**: Phase 2 核心 CRUD 迁移
- T2.1 ~ T2.9: 将 `api/queries/*.ts` 中的 Drizzle 查询替换为 `window.electronAPI.xxx()` 调用
- 每个任务有独立的前置、文件、步骤、验收标准
- 预计 4~5 天

**第二阶段（可选/可并行）**: Phase 3 AI 调用下沉
- T3.1 ~ T3.5: 将 `api/lib/ai-service-v3/client.ts` 的 HTTP 调用迁移到 Rust
- 预计 2~3 天

**第三阶段（可选）**: Phase 4 清理 + 打包 + 零端口
- T4.1 ~ T4.5: 卸载 better-sqlite3、删除 HTTP server、配置 Electron Builder
- 预计 2~3 天

## 关键文件速查

| 文件 | 说明 |
|------|------|
| `native/src/lib.rs` | Rust 导出入口，含所有 `#[napi]` 函数和 struct |
| `native/index.d.ts` | TypeScript 类型声明（手动维护） |
| `electron/main.cjs` | Electron 主进程，IPC handler + Native Addon 加载 |
| `docs/TASKS_ATOMIC.md` | 你的任务清单 |
| `migrations/0001_initial_schema.sql` | 数据库初始表结构 |

## 注意事项

1. **函数名映射**: Rust 用 snake_case（`db_open`），JS 侧 napi-rs 自动转为 camelCase（`dbOpen`）
2. **加密互通**: Rust `crypto::encrypt` 与旧 JS `crypto.ts` 的格式必须互通，否则旧用户数据无法解密
3. **Fallback 机制**: Electron 加载 `.node` 失败时自动 fallback 到 JS 实现，不要破坏这个逻辑
4. **不要提交**: `native/target/`、`native/*.node`、`e2e-results/`、`electron/data/`（已在 .gitignore）
5. **测试**: 每完成一个任务运行 `npm run test`（Vitest）和对应 E2E

## 遇到问题

- 先读 `docs/ARCHITECTURE_REBUILD_PLAN.md` 的"风险与回滚策略"章节
- Rust 编译问题：`cd native && cargo check`
- Native Addon 加载问题：`node -e "console.log(require('./native'))"` 看 exports

---

开始吧，先执行 T2.1（用户查询层迁移）。
```

---

## 任务分配建议

按人手拆分：

| 人员 | 任务范围 | 预估 | 交付标准 |
|------|---------|------|---------|
| **后端 A** | T2.1~T2.3 + T2.8（用户/设置/加密互通/双写验证） | 2~3 天 | settings 页完整可用 |
| **后端 B** | T2.4~T2.7（Prompt/Template/Project/Steps） | 2~3 天 | Library + Market + Project 页完整可用 |
| **前端/全栈** | T3.1~T3.5（AI 下沉 + 性能基准） | 2~3 天 | 首页生成走 Rust 路径，SC < 5s |
| **DevOps** | T4.1~T4.5 + T5.1~T5.2（清理/打包/CI/通用化配置） | 3~4 天 | `npm run build:desktop:win` 成功，< 200MB |
| **数据迁移** | TM.1（旧数据迁移脚本） | 0.5 天 | 旧用户升级无损 |
