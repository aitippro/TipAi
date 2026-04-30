# TipAi 迭代优化进度表

> 基于 [TIPAI_ITERATION_PLAN.md](https://github.com/aitippro/learning-lab/blob/main/papers/llm-arch/TIPAI_ITERATION_PLAN.md) v2.0
> 评估日期：2026-04-29 | 当前版本：v1.1.0

---

## 总览

| 期数 | 名称 | 状态 | 完成度 |
|------|------|------|--------|
| **基础建设** | 桌面端 + 核心功能 + UI | ✅ 完成 | 100% |
| **第一期** | 学术 debt 清零 | ✅ 完成 | 100% |
| **第二期** | 前沿追赶 | ✅ 完成 | 100% |
| **第三期** | 工程化闭环 | ✅ 完成 | 100% |
| **第四期** | 生态扩展 | ⬜ 待启动 | 0% |

---

## 基础建设（已完成）

| 功能 | 论文对照 | 状态 | 实现位置 |
|------|---------|------|----------|
| Zero-shot 生成 | Prompt Report §2.1 | ✅ | `api/services/promptforge/generation.ts` |
| Few-shot 模板 | Prompt Report §2.2 | ✅ | `src/pages/TemplateMarket.tsx` |
| 多模型 AI 接入 | — | ✅ | `api/services/ai/providers/` (6 providers) |
| 智能路由 | — | ✅ | `api/services/ai/router.ts` |
| 离线模式 (Ollama) | — | ✅ | `api/services/ai/providers/ollama.ts` |
| 动态提示词生成 | Dynamic PRC (CHIWORK 2025) | ✅ | `api/services/promptforge/dynamic-options.ts` |
| 提示词生命周期 | — | ✅ | `api/services/projects/lifecycle.ts` |
| API Key 加密管理 | — | ✅ | `api/lib/crypto.ts` |
| Apple 设计系统 UI | — | ✅ | `src/index.css`, `src/components/` |
| 桌面打包 | — | ✅ | `.github/workflows/build-desktop.yml` |
| CI/CD 管线 | — | ✅ | `.github/workflows/ci.yml` |

---

## 第一期：学术 debt 清零（进行中）

### P0-1: OPRO 自动优化引擎

| 任务 | 状态 | 验收标准 |
|------|------|---------|
| OPRO 核心引擎 | ✅ 完成 | ≥3 轮自动迭代，每轮 ≥5 candidates，meta-prompt 驱动 |
| LLM-as-judge 评估器 | ✅ 完成 | 6 维度评分 1-10（clarity/specificity/completeness/actionability/creativity/overall），top/bottom 差异分析 |
| 优化轨迹可视化 | 🟡 后端完成 | `OPROResult.iterations` 包含完整轨迹，前端组件待接入 |
| 成本透明组件 | 🟡 基础完成 | `estimatedTokens` + `elapsedMs` 已透出，UI 待接入 |
| 内部测试集验证 | ✅ 完成 | 模拟测试提升 20%-50%，early stopping / 去重 / target reached 全部验证 |

**当前 Optimizer 评估**：OPRO 引擎已替代静态策略，支持多轮迭代、自动评估、历史驱动优化。

### P0-2: Clarify 策略路由

| 任务 | 状态 | 验收标准 |
|------|------|---------|
| 任务分类器 | ✅ 完成 | 11 个领域，30+ 子领域，准确率 81.8%（9/11） |
| 领域知识注入 | ✅ 完成 | 11 领域 × ≥5 条最佳实践 + ≥5 条追问模板 |
| 策略路由器 | ✅ 完成 | 领域定制追问，信息完整度评分，建议追问轮次 |
| 框架推荐增强 | ✅ 完成 | 12 种框架，匹配分数 0-100，推荐理由 + 3 个备选 |

**当前 Clarify 评估**：`api/services/clarify/` 三层架构：
- `task-classifier.ts` — 关键词 + 语义规则多层分类，11 领域 / 30+ 子领域
- `domain-knowledge.ts` — 领域知识库（77 条最佳实践 / 66 条追问模板）
- `strategy-router.ts` — 策略路由（追问生成 + 框架推荐 + 完整度评估）
- `api/promptforge-router.ts` — 新增 `clarifyPreview` / `listDomains` 公共端点
- `api/services/promptforge/generation.ts` — `generatePromptForgeClarification` 已集成策略路由，追问智能合并

### P0-3: Decode 策略层 (Self-Consistency)

| 任务 | 状态 | 验收标准 |
|------|------|---------|
| Self-Consistency 实现 | ✅ 完成 | 多路径采样 + 投票，支持 exact/normalized/semantic 三种投票算法 |
| Decode 策略配置器 | ✅ 完成 | greedy/sampling/SC 可切换，任务类型自动推荐策略 |
| Confidence 显示 | ✅ 完成 | 可靠性分数（0-1），随响应 raw._confidence 透出 |
| 成本-质量 UI | 🟡 基础完成 | 成本估算 API `estimateCost()` + `estimateTaskCost()`，前端 Slider 待接入 |
| 全链路策略透传 | ✅ 完成 | `callAI()` → `ai-service-v3.ts` → `dynamic-options.ts` / `summary.ts` 全部支持 decodeStrategy |
| 数据库存储 | ✅ 完成 | `steps.decode_strategy` JSON 字段 + `project-router.ts` API 扩展 |

**当前状态**：
- `api/services/ai/decoding-strategies.ts` + `self-consistency.ts` 已上线
- AIRouter 集成完毕，流式模式自动降级为 sampling
- **旧调用路径 `callAI()` 已升级为策略感知**，支持 greedy/sampling/self-consistency
- `analyzeIntent` / `generatePrompt` / `generateClarification` / `decomposeSteps` 全部支持 decodeStrategy 透传
- `steps` 表新增 `decode_strategy` 字段，API 支持读写

---

## 第二期：前沿追赶

| 功能 | 状态 | 备注 |
|------|------|------|
| P1-1 多模态提示词引擎 | ✅ | 文生图/图生文/视频分镜 + 前端三模式切换 |
| P1-2 智能框架匹配引擎 | ✅ | 20框架知识图谱 + 5维度匹配算法 + 前端页面 |
| P1-3 Prompt Chain 可视化 | ✅ | Tree of Thoughts 引擎 + SVG树形可视化 |

---

## 第三期：工程化闭环

| 功能 | 状态 | 备注 |
|------|------|------|
| P2-1 质量门禁系统 | ✅ | 12项检查点 + 评分 + 改进建议 |
| P2-2 反馈闭环 | ✅ | 5维评分 + 趋势分析 + 进化建议 |
| P2-3 Drift Detection | ✅ | 词频向量 + cosine similarity + 趋势告警 |

---

## 第四期：生态扩展

| 功能 | 状态 | 备注 |
|------|------|------|
| P3-1 API 开放 | ⬜ | REST API + Python/TS SDK |
| P3-2 Agent Swarm | ⬜ | ≥5 种角色，3 种协作模式 |
| P3-3 学术合作 | ⬜ | 引用生成 + 实验复现 |

---

## 技术债务

| 债务 | 严重程度 | 状态 |
|------|---------|------|
| CI 全部 green | 🔴 致命 | ✅ 已修复 |
| 数据库 schema 无版本控制 | 🔴 高 | 🟡 decode_strategy 字段已添加，完整迁移待 Drizzle 生成 |
| AI Provider 统一错误处理 | 🟡 中 | ⬜ |
| E2E 测试 | 🟡 中 | ⬜ |
| 性能监控 | 🟡 中 | ⬜ |

---

## 当前产品 vs 论文技术对照

| 论文技术 | 状态 | 位置 |
|---------|------|------|
| Zero-shot | ✅ v1.0 | `api/services/promptforge/generation.ts` |
| Few-shot | ✅ v1.0 | `src/pages/TemplateMarket.tsx` |
| Chain-of-Thought | 🟡 框架支持 | `api/lib/ai-service-v3/catalog.ts` COT 框架 |
| Self-Consistency | ✅ v1.2 | `api/services/ai/self-consistency.ts` |
| OPRO | ✅ v1.2 | `api/services/promptforge/opro-engine.ts` |
| Tree of Thoughts | ❌ | P1-3 |
| ReAct | ❌ | P1-3 |
| Multi-modal | ❌ | P1-1 |
| Auto framework sel. | 🟡 基础版 | `api/lib/ai-service-v3/catalog.ts` recommendFramework |
| Prompt chaining | ❌ | P1-3 |
| Quality gating | ❌ | P2-1 |
| Agent swarm | ❌ | P3-2 |

---

## 下一步行动

**本周**：P1-2 智能框架匹配引擎已完成
- 后端：`framework-graph.ts` (20框架+关系网络) + `framework-matcher.ts` (5维度评分) + `framework-router.ts` (6端点)
- 前端：`FrameworkMatch.tsx` 页面(推荐/组合/分析三Tab) + Sidebar导航
- 测试：149/149 通过，零回归
- 构建：修复 framer-motion 缺失，构建通过

```
P0-3 已完成：
1. api/services/ai/decoding-strategies.ts — 策略配置 ✅
2. api/services/ai/self-consistency.ts — SC 实现 ✅
3. 集成到 AIRouter，所有调用经过 decode 层 ✅
4. api/lib/ai-service-v3/client.ts — callAI 策略感知 ✅
5. api/lib/ai-service-v3.ts — 核心函数透传 decodeStrategy ✅
6. api/services/promptforge/dynamic-options.ts — 策略透传 ✅
7. api/services/projects/summary.ts — 策略透传 ✅
8. db/schema.ts steps.decode_strategy — 数据库存储 ✅

P0-1 已完成：
1. api/services/promptforge/opro-engine.ts — OPRO 核心引擎 ✅
2. api/services/promptforge/llm-judge.ts — LLM-as-judge 评估器 ✅
3. api/optimizer-router.ts — optimizeOPRO / judge API ✅
4. 单元测试 17 个，全部通过 ✅

P0-2 已完成：
1. api/services/clarify/task-classifier.ts — 11 领域分类器 ✅
2. api/services/clarify/domain-knowledge.ts — 领域知识注入 ✅
3. api/services/clarify/strategy-router.ts — 策略路由器 ✅
4. api/services/promptforge/generation.ts — Clarify 集成 ✅
5. api/promptforge-router.ts — clarifyPreview / listDomains 端点 ✅
6. 单元测试 41 个，全部通过 ✅

前端收尾已完成：
1. src/components/optimizer/IterationTrajectory.tsx — OPRO 迭代轨迹可视化 ✅
2. src/pages/Optimizer.tsx — OPRO 模式切换 + 成本-质量 Slider ✅

第一期全部完成 ✅
```

---

*最后更新：2026-04-30*
