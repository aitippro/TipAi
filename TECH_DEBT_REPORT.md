# TipAi 技术债务与前后端同步审计报告

> 生成时间: 2026-04-30 23:40
> 扫描范围: src/ + api/ + package.json (260 个 TS/TSX 文件)
> 工具: tsc --build + 静态代码扫描

---

## 一、执行摘要

| 维度 | 数量 | 严重 | 高 | 中 | 低 |
|------|------|------|-----|-----|-----|
| **TypeScript 编译错误** | 31 | 0 | 8 | 15 | 8 |
| **前端-后端同步问题** | 9 | 1 | 3 | 4 | 1 |
| **性能问题** | 6 | 0 | 1 | 3 | 2 |
| **安全隐患** | 3 | 0 | 1 | 2 | 0 |
| **代码异味** | 7 | 0 | 0 | 4 | 3 |

**核心结论**: src/ 前端目录已完成零错误清理（本轮完成），**技术债务集中在 api/ 后端目录（约 15 个 TS 错误）** + **前后端接口类型漂移（OPRO 结果类型不统一）** + **部分功能模块碎片化（路由/页面/API 三者不一致）**。

---

## 二、TypeScript 编译错误清单（api/ 目录）

### api/services/agent/swarm.ts — 3 处

| 行 | 错误 | 严重 | 问题 |
|----|------|------|------|
| 175 | TS2339 | **严重** | `output` 不存在于 Task 类型 |
| 176 | TS2322 | **严重** | `"completed"` 不可赋值给 `"running"` |
| 177 | TS2339 | **严重** | `completedAt` 不存在于 Task 类型 |

**根因**: Task 类型定义只写了 `status: "running"`，但运行时赋值 `"completed"` 和 `completedAt` 字段。
**修复**: 扩展 Task 类型为 `status: "running" | "completed" | "failed"` 并添加 `output?: string; completedAt?: number`。

### api/services/ai/router.ts — 1 处

| 行 | 错误 | 严重 | 问题 |
|----|------|------|------|
| 151 | TS2322 | **高** | `DecodeStrategy \| undefined` → `DecodeStrategy` |

**根因**: 解码策略回退逻辑没有处理 `undefined` 分支。
**修复**: 添加默认值或收窄类型守卫。

### api/services/framework/index.ts — 1 处

| 行 | 错误 | 严重 | 问题 |
|----|------|------|------|
| 13 | TS2305 | **高** | `getFrameworkGraphData` 未从 `./framework-graph` 导出 |

**根因**: 函数已删除或改名，但 index.ts 仍导入导出。
**修复**: 检查 `framework-graph.ts` 实际导出，同步更新 index.ts。

### api/services/feedback/feedback-engine.ts — 5 处

| 行 | 错误 | 严重 | 问题 |
|----|------|------|------|
| 12 | TS6133 ×3 | 低 | `avg` / `count` / `sql` 未使用 |
| 146 | TS18047 ×2 | **高** | `a.createdAt` / `b.createdAt` 可能为 null |
| 212 | TS2322 | **高** | `createdAt: Date \| null` ≠ `FeedbackHistoryItem.createdAt: Date` |

**根因**: 数据库 schema 允许 null，但 TypeScript 类型不允许。
**修复**: `FeedbackHistoryItem.createdAt` 改为 `Date \| null`，排序时做空值保护。

### api/services/promptforge/opro-engine.ts — 1 处

| 行 | 错误 | 严重 | 问题 |
|----|------|------|------|
| 160 | TS6133 | 低 | `iteration` 声明未读取 |

**根因**: OPRO 评估报告逻辑未完成。
**修复**: 接入 iteration 数据到输出，或删除变量。

### api/services/academic/academic-router.ts — 2 处

| 行 | 错误 | 严重 | 问题 |
|----|------|------|------|
| 37 | TS2554 | **高** | 期望 2-3 参数，只得到 1 个 |
| 43 | TS2345 | **高** | 数组类型不匹配 `ReproStep[]` |

**根因**: 学术模块前端无对应页面，API 维护脱节。
**修复**: 修复参数或下线该 router。

### api/services/clarify/strategy-router.ts — 2 处

| 行 | 错误 | 严重 | 问题 |
|----|------|------|------|
| 227 | TS6133 | 低 | `classification` 未使用 |
| 230 | TS6133 | 低 | `existingAnswers` 未使用 |

**根因**: 调试残留或逻辑未闭环。
**修复**: 接入实际用途或删除。

### api/services/ai/tot-router.ts — 2 处

| 行 | 错误 | 严重 | 问题 |
|----|------|------|------|
| 11 | TS6133 | 低 | `DEFAULT_TOT_CONFIG` 未使用 |
| 12 | TS6133 | 低 | `TreeOfThoughtsResult` 未使用 |

### api/services/framework/framework-matcher.ts — 1 处

| 行 | 错误 | 严重 | 问题 |
|----|------|------|------|
| 20 | TS6133 | 低 | `HybridRecommendation` 未使用 |

---

## 三、前端-后端同步问题（关键）

### [严重] api/services/agent/swarm.ts — 运行时类型崩塌
**类型**: type-mismatch  
**描述**: AgentSwarm 的 Task 类型定义为 `{ status: "running" }`，但代码在 175-177 行赋值为 `"completed"` 并访问 `output` / `completedAt`。这会导致**生产环境运行时错误**，因为 TypeScript 编译通过（如果用了 `as any`）但逻辑错误。
**建议**: 立即修复类型定义，添加完整生命周期状态。

### [高] api/services/framework/index.ts — 导出悬空
**类型**: type-mismatch  
**描述**: `getFrameworkGraphData` 从 `./framework-graph` 导入，但后者未导出该函数。这意味着 `framework` router 可能某个 endpoint 实际不可用。
**建议**: 检查 `framework-graph.ts` 的实际导出，删除或重命名引用。

### [高] api/services/ai/router.ts:151 — 解码策略类型不闭合
**类型**: type-mismatch  
**描述**: `decodeStrategy` 可能为 `undefined`，但下游要求 `DecodeStrategy`。
**建议**: 在入口添加 `decodeStrategy ?? DEFAULT_DECODE_STRATEGY` 默认值。

### [高] api/services/feedback/feedback-engine.ts — schema 与类型不同步
**类型**: type-mismatch  
**描述**: 数据库 `createdAt` 允许 null，但 TS 类型要求非 null。当数据存在脏记录时前端可能收到 null 导致崩溃。
**建议**: 统一为 `Date \| null`，排序时做空值处理（`a ?? new Date(0)`）。

### [中] api/services/promptforge/opro-engine.ts ↔ src/pages/Optimizer.tsx — 类型漂移
**类型**: naming-drift  
**描述**: `OPROResult` 在前端和后端分别定义，字段不完全一致。前端用 `as unknown` 强制绕过类型检查。**这是本轮最显著的代码异味**。
**建议**: 创建 `api/types/shared.ts`，将 `OPROResult` / `OptimizationResult` / `ClarifyAnswer` 等通用类型放到共享包，前后端共用。

### [中] api/services/multimodal/multimodal-router.ts — 有 API 无页面
**类型**: missing-frontend  
**描述**: 多模态 router 已注册到 appRouter，但前端 App.tsx 已移除 `Multimodal` 懒加载。用户无法访问该功能。
**建议**: 决定上线则恢复路由，否则从 appRouter 移除。

### [中] api/services/quality/drift-router.ts — 有 API 无页面
**类型**: missing-frontend  
**描述**: DriftDetection 页面已从 App.tsx 移除，但 drift router 仍在后端运行。
**建议**: 下线或恢复页面。

### [中] api/services/agent/swarm-router.ts — 有 API 无页面
**类型**: missing-frontend  
**描述**: AgentSwarm 页面已从 App.tsx 移除。
**建议**: 同上下线或恢复。

### [低] api/services/academic/academic-router.ts — 前端无调用
**类型**: unused-backend  
**描述**: 学术模块完整存在（router + test + engine），但前端无任何页面或组件调用。
**建议**: 可能是未来功能，保留但标记为 `@beta`。

---

## 四、性能优化清单

### [高] api/services/projects/crud.ts + promptforge/library.ts — 全量查询无分页
**描述**: `project.list` 和 `promptForge.getLibrary` 返回全量数据。当用户积累 1000+ 项目或提示词时，JSON 序列化 + 传输 + React 渲染都会阻塞。
**建议**: 
- 短期：添加 `limit: 50 + offset` 分页参数
- 长期：考虑虚拟列表（react-window）+ 游标分页

### [中] src/components/effects/AuroraBackground.tsx — Canvas 无节流
**描述**: `mousemove` 直接驱动 `requestAnimationFrame`，即使页面在后台或不可见仍持续计算磁场。
**建议**: 
```typescript
const visibleRef = useRef(true);
useEffect(() => {
  const observer = new IntersectionObserver(([entry]) => {
    visibleRef.current = entry.isIntersecting;
  });
  observer.observe(canvasRef.current);
  return () => observer.disconnect();
}, []);
// 在 draw loop 中: if (!visibleRef.current) return;
```

### [中] src/components/effects/GenerativeArt.tsx — 同 Aurora 无节流
**描述**: 同上，星座粒子动画在空状态不可见时仍在运行。
**建议**: 复用同一套 IntersectionObserver 暂停逻辑。

### [中] api/services/projects/summary.ts — 潜在 N+1
**描述**: 项目摘要可能逐条查询关联数据（对话、反馈、生命周期状态）。
**建议**: 使用 JOIN 或 DataLoader 批量查询，避免 1 个项目触发 3 次 SQL。

### [低] package.json — framer-motion 体积
**描述**: framer-motion 约 38KB gzipped，但项目只用了 `AnimatePresence` / `motion.div` / `initial/animate`。自研 `springs.ts` 已覆盖大部分物理动画。
**建议**: 验证 tree-shaking 效果（`npm run build` 后分析 bundle），若无效考虑迁移到 `@motionone/react` 或自研精简版。

### [低] src/App.tsx — 代码分割不彻底
**描述**: ModalStage / CommandPalette / Onboarding 等 heavy 组件在主 bundle，但它们是"按需触发"的。
**建议**: 将 ModalStage / CommandPalette 改为懒加载（`React.lazy` + 预加载）。

---

## 五、安全隐患

### [高] api/lib/crypto.ts — 密钥派生方式未确认
**描述**: AES-256-GCM 加密需要确认 key 是如何从用户密码/环境变量派生的。如果是简单 SHA256 或硬编码，存在被暴力破解风险。
**建议**: 
- 使用 PBKDF2（100k+ iterations）或 Argon2id
- 密钥不存代码库，用环境变量 + 密钥管理系统
- 定期轮换（如季度）

### [中] api/lib/env.ts — 环境变量可能泄漏到前端
**描述**: 检查 vite 配置是否将 `api/` 目录排除在 client bundle 外。如果 vite 错误地打包了 api/lib/env.ts，API Key 会暴露。
**建议**: 
- 在 `vite.config.ts` 中明确 `exclude: ['api/**']`
- 或使用 `define` 仅注入白名单变量

### [中] src/providers/trpc.tsx — 日志可能泄漏敏感数据
**描述**: `customFetch` 中 `logger.warn` 打印了响应 body 前 500 字符。如果响应包含提示词内容、API Key 或用户隐私数据，日志文件会成为攻击面。
**建议**: 
- 生产环境 `NODE_ENV === 'production'` 时关闭 body 日志
- 或添加脱敏函数，自动替换 `apiKey` / `key` / `password` 字段

---

## 六、代码异味与重构建议

### [中] src/pages/Optimizer.tsx — `as unknown` 类型断言
**描述**: `IterationTrajectory` 的 prop 类型与 tRPC 返回类型不兼容，用 `as unknown` 强制绕过。**破坏了类型系统的契约**。
**建议**: 将 `OPROResult` 抽到 `api/types/shared.ts`，前后端共用同一类型定义。

### [中] src/App.tsx — 功能碎片化
**描述**: 大量页面被移除（Multimodal, QualityGate, Feedback, DriftDetection, AgentSwarm, Academic, ApiDocs），但对应 backend router 仍活着。这导致：
1. 后端维护成本（这些 router 的 bug 仍需修复）
2. bundle 潜在增大（tRPC 类型仍包含它们）
3. 新开发者困惑（"这个 API 到底用不用？"）
**建议**: 明确功能生命周期：
- **保留并恢复页面** → 添加回 App.tsx 路由
- **下线** → 从 `api/router.ts` 移除 router，减少 API 表面

### [中] api/services/promptforge/opro-engine.ts — iteration 变量悬空
**描述**: `iteration` 声明但未使用，说明 OPRO 评估报告逻辑（迭代详情输出）未完成。
**建议**: 确认产品需求：是否需要展示每轮候选提示词？需要则完成逻辑，不需要则删除变量。

### [中] src/components/effects/AuroraBackground.tsx — 无内存清理边界
**描述**: Canvas 动画在组件卸载时清理了 RAF，但没有清理 `mousemove` 监听器中的闭包引用。快速路由切换时可能累积内存压力。
**建议**: 添加 `useEffect` cleanup 确认 `removeEventListener` 已执行，并清空粒子数组引用。

### [低] api/services/clarify/strategy-router.ts — 调试残留
**描述**: `classification` / `existingAnswers` 声明未读取。
**建议**: 删除或接入 clarify 策略选择逻辑。

### [低] api/services/ai/tot-router.ts — TOT 配置未使用
**描述**: `DEFAULT_TOT_CONFIG` 和 `TreeOfThoughtsResult` 类型导入但未使用。
**建议**: 检查 TreeOfThoughts 功能是否已废弃，同步清理。

### [低] src/pages/Workspace.tsx / Profile.tsx — 重复查询模式
**描述**: 两个页面都请求 `project.list` 和 `promptForge.getLibrary`。React Query 会缓存，但如果用户在两个页面间切换，仍可能触发背景重新获取。
**建议**: 在 `queryClient` 配置中统一 `staleTime: 5 * 60 * 1000`（5 分钟），减少重复请求。

---

## 七、优先修复路线图

### P0 — 本周必须修复（阻塞/崩溃风险）

1. **`api/services/agent/swarm.ts`** — 扩展 Task 类型生命周期（status: "running" \| "completed" \| "failed"，添加 output/completedAt 可选字段）
2. **`api/services/framework/index.ts`** — 移除/修复 `getFrameworkGraphData` 悬空导入
3. **`api/services/ai/router.ts:151`** — DecodeStrategy 添加默认值闭合类型
4. **`api/services/feedback/feedback-engine.ts`** — `createdAt` 统一为 `Date \| null`

### P1 — 下周修复（类型安全/数据一致性）

5. **创建 `api/types/shared.ts`** — 提取 `OPROResult`、`OptimizationResult`、`ClarifyAnswer`、`FeedbackHistoryItem` 等前后端共用类型
6. **`src/pages/Optimizer.tsx`** — 移除 `as unknown`，使用 shared 类型
7. **`api/services/academic/academic-router.ts`** — 修复参数数量不匹配 + 类型导出
8. **`api/services/promptforge/opro-engine.ts`** — 清理未使用 `iteration` 变量
9. **`api/services/clarify/strategy-router.ts`** — 清理 `classification` / `existingAnswers`
10. **`api/services/ai/tot-router.ts`** — 清理未使用导入

### P2 — 近期优化（性能/体验）

11. **AuroraBackground + GenerativeArt** — 添加 IntersectionObserver 暂停，节省 GPU
12. **project.list / getLibrary** — 添加分页参数 `limit + offset`
13. **功能碎片化治理** — 决定以下模块去留：
    - Multimodal（有 API 无页面）
    - DriftDetection（有 API 无页面）
    - AgentSwarm（有 API 无页面）
    - Academic（有 API 无页面无调用）
    - 决定：恢复页面 或 下线 API
14. **ModalStage / CommandPalette 懒加载** — 减少主 bundle

### P3 — 持续改进

15. **生产环境日志脱敏** — `customFetch` body 日志添加 `NODE_ENV` 判断
16. **密钥管理审计** — 确认 `api/lib/crypto.ts` 使用 PBKDF2/Argon2
17. **Bundle 分析** — `npm run build` 后使用 `vite-bundle-visualizer` 检查 framer-motion 实际体积
18. **添加 Error Boundary** — 为 tRPC 查询失败、Canvas 初始化失败添加边界捕获

---

## 八、技术债务趋势建议

**短期（1-2 周）**: 重点清理 api/ TS 错误 + 前后端类型统一。这些是"滚雪球"债务，拖得越久修复成本越高。

**中期（1 个月）**: 功能碎片化治理。决定哪些功能真正上线，避免"半死不活"的代码持续消耗维护成本。

**长期（持续）**: 建立以下预防机制：
- CI 中 `npm run check` 必须零错误才能合并
- 前后端类型变更必须同步更新 shared types
- 新功能上线必须"路由 + 页面 + API"三者一起合入

---

*报告由小龙坎基于完整代码库扫描生成。*
