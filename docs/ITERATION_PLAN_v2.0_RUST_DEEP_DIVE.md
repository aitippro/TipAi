# TipAi v2.0 Rust Deep Dive — 全量迭代方案

> 目标：将计算密集型业务逻辑真正下沉到 Rust Native Addon，补齐架构缺口，优化非最优实现。
> 原则：全量推进，不保留最小架构；计算下沉 Rust，数据定义保留 TS；零端口 IPC 架构不变。

---

## 一、现状审计

### 1.1 Rust Native Addon 已有能力
| 模块 | 状态 | 导出函数 |
|------|------|----------|
| Crypto | ✅ 完备 | `encrypt`, `decrypt` |
| AI HTTP | ⚠️ 部分 | `aiCall`, `aiCallSelfConsistency`（缺 Gemini） |
| SQLite DB | ✅ 完备 | Users/Settings/Projects/Steps/Prompts/Templates CRUD |
| 业务计算 | ❌ 缺失 | 无 Quality Gate、Drift、Classification、Framework Graph |

### 1.2 关键架构缺口
1. **`native/index.d.ts` 为空** — 260+ 函数/类型无 TypeScript 类型定义，整个 native 层是 `any`。
2. **Gemini 未统一** — `api/lib/ai-service-v3/client.ts` 中 Gemini 走 `fetch`，其他走 `native.aiCall`，破坏统一架构。
3. **业务逻辑仍留在 TS** — Quality Gate（12 项检查）、Drift Detection（TF 向量 + Cosine）、Task Classification（关键词扫描）、Framework Graph（Jaccard + 遍历）全部在 JS 引擎中运行。
4. **前端业务逻辑泄漏** — `validateGenResult` 在前端做深度类型强转；Settings 双源持久化（localStorage + SQLite）；硬编码中文标签。

---

## 二、迭代批次

### Batch 1: 基础架构修复（零 Rust 编译依赖）
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 1.1 | 补齐 `index.d.ts` | `native/index.d.ts` | 手写全部 NAPI 导出类型的 TS 定义（~400 行） |
| 1.2 | `native.ts` 加载器优化 | `api/lib/native.ts` | 生产环境失败时提供降级提示而非抛裸错；测试环境保持 mock |
| 1.3 | `client.ts` 架构统一（TS 侧预适配） | `api/lib/ai-service-v3/client.ts` | 为 Gemini 统一走 native 做准备，移除特殊分支的硬编码 URL |

### Batch 2: 计算引擎下沉 Rust（核心）
| # | 任务 | Rust 模块 | TS 适配 | 说明 |
|---|------|-----------|---------|------|
| 2.1 | Quality Gate 引擎 | `native/src/quality/` | `api/services/quality/gate.ts` | 12 项检查全部 Rust 化； embarrassingly parallel |
| 2.2 | Drift Detection 引擎 | `native/src/drift/` | `api/services/quality/drift.ts` | tokenize → TF 向量 → cosine → trend；纯数学计算 |
| 2.3 | AI Client 补全 Gemini | `native/src/ai/client.rs` | `api/lib/ai-service-v3/client.ts` | Rust 层支持 Gemini `/v1beta/models/{model}:generateContent` |
| 2.4 | Framework 相似度计算 | `native/src/framework/` | `api/services/framework/framework-graph.ts` | 通用 Jaccard + 加权相似度；TS 传入 catalog 数据 |
| 2.5 | Task Classification 引擎 | `native/src/classify/` | `api/services/clarify/task-classifier.ts` | 通用多层关键词匹配算法；TS 传入 DOMAINS 数据 |

### Batch 3: 业务逻辑优化（TypeScript 侧）
| # | 任务 | 文件 | 说明 |
|---|------|------|------|
| 3.1 | Settings 统一持久化 | `src/pages/Settings.tsx`, `api/services/promptforge/settings.ts` | 所有设置走 SQLite + Rust，移除 localStorage 双源 |
| 3.2 | 前端 validateGenResult 后移 | `src/components/generate/utils.ts` → `api/services/promptforge/generation.ts` | AI 生成结果校验由后端 Zod 完成 |
| 3.3 | 硬编码标签清理 | `src/pages/Workspace.tsx`, `src/pages/ProjectDetail.tsx` | 标签走 i18n 键，不再硬编码中文 |

### Batch 4: 全量 QA 测试
| # | 任务 | 说明 |
|---|------|------|
| 4.1 | Rust 单元测试 | 每个新 Rust 模块写 `#[cfg(test)]` |
| 4.2 | TS 集成测试 | 更新现有 `.test.ts`；新增 `quality-gate-rust.test.ts`, `drift-rust.test.ts` |
| 4.3 | E2E 回归 | Playwright 全量跑通 |
| 4.4 | lint + check + test | 最终验证 |

---

## 三、Rust 模块设计详规

### 3.1 Quality Gate (`native/src/quality/`)
```rust
#[napi(object)]
pub struct QualityCheck { pub id: String, pub name: String, pub passed: bool, pub score: f64, pub message: String, pub severity: String, pub suggestion: String }

#[napi(object)]
pub struct QualityGateResult { pub overall_score: f64, pub passed: bool, pub threshold: f64, pub checks: Vec<QualityCheck>, pub summary: String, pub top_issues: Vec<QualityCheck> }

#[napi]
pub fn run_quality_gate(prompt: String, enabled_checks: Option<Vec<String>>, threshold: Option<f64>) -> QualityGateResult
```
- 12 个 checker 函数内部实现，与 TS 逻辑逐行对齐。
- 并发：使用 `rayon` 并行运行 12 项检查（如引入 rayon）。

### 3.2 Drift Detection (`native/src/drift/`)
```rust
#[napi(object)]
pub struct TextVector { pub tokens: Vec<String>, pub weights: HashMap<String, f64> }

#[napi(object)]
pub struct DriftResult { pub drift_score: f64, pub has_drift: bool, pub trend: String, pub warnings: Vec<String>, pub suggestions: Vec<String> }

#[napi]
pub fn detect_drift(versions: Vec<String>, baseline_index: Option<i64>) -> DriftResult
#[napi]
pub fn compare_versions(a: String, b: String) -> CompareResult
```

### 3.3 AI Client Gemini 补全 (`native/src/ai/client.rs`)
- 在现有 `AiCallRequest` 基础上，provider 枚举增加 `"gemini"`。
- Gemini 使用 `reqwest` 构造 `generativelanguage.googleapis.com` 请求体（`contents` + `generationConfig`）。
- **关键**：Rust 层统一后，`client.ts` 中 Gemini 特殊分支彻底删除，全部走 `native.aiCall(req)`。

### 3.4 Framework / Classification 通用计算
```rust
#[napi]
pub fn jaccard_similarity_weighted(a: Vec<String>, b: Vec<String>, same_category_bonus: Option<f64>, same_complexity_bonus: Option<f64>) -> f64

#[napi]
pub fn classify_by_keywords(intent: String, domains_json: String) -> ClassificationResult
```
- TS 侧将 `FRAMEWORKS` / `DOMAINS` 序列化为 JSON 字符串传入 Rust。
- Rust 只做计算，不硬编码业务数据。

---

## 四、安全边界

- **DeepSeek Key**：仅用于本地 QA，通过环境变量注入，绝不写入代码或提交。
- **AI 产物不入仓**：迭代方案文档可入仓，但 QA 脚本（`scripts/qa-ai-integration*.ts`）保持 `.gitignore` 排除。
- **native binary**：`.node` 文件保持 `.gitignore`，仅源码入仓。

---

## 五、验收标准

| 指标 | 目标 |
|------|------|
| `npm run check` | 0 errors |
| `npm run lint` | 0 errors, 0 warnings |
| `npm run test` | 20 files passed, ≥240 tests passed |
| `npm run native:build` | Linux x64 二进制成功生成 |
| Rust 单元测试 | `cargo test` 全部通过 |
| 类型覆盖率 | `native/index.d.ts` 覆盖 100% 导出符号 |
