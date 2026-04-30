# TipAi 迭代优化进度表

> 基于 [TIPAI_ITERATION_PLAN.md](https://github.com/aitippro/learning-lab/blob/main/papers/llm-arch/TIPAI_ITERATION_PLAN.md) v2.0
> 评估日期：2026-04-29 | 当前版本：v1.1.0

---

## 总览

| 期数 | 名称 | 状态 | 完成度 |
|------|------|------|--------|
| **基础建设** | 桌面端 + 核心功能 + UI | ✅ 完成 | 100% |
| **第一期** | 学术 debt 清零 | 🔄 进行中 | 55% |
| **第二期** | 前沿追赶 | ⬜ 待启动 | 0% |
| **第三期** | 工程化闭环 | ⬜ 待启动 | 0% |
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
| OPRO 核心引擎 | 🔴 未开始 | ≥3 轮自动迭代，每轮 ≥5 candidates |
| LLM-as-judge 评估器 | 🔴 未开始 | 评分 1-10，分析 top/bottom 差异 |
| 优化轨迹可视化 | 🔴 未开始 | 展示每轮评分变化 |
| 成本透明组件 | 🔴 未开始 | 显示总 token + 预估费用 |
| 内部测试集验证 | 🔴 未开始 | ≥15% 提升 |

**当前 Optimizer 评估**：3 种静态策略（通用/结构化/精简），一次调用。**不是真正的优化引擎。**

### P0-2: Clarify 策略路由

| 任务 | 状态 | 验收标准 |
|------|------|---------|
| 任务分类器 | 🟡 已有基础 | ≥10 个任务类型，准确率 ≥80% |
| 领域知识注入 | 🔴 未开始 | 每领域 ≥5 条最佳实践 |
| 策略路由器 | 🔴 未开始 | 领域定制追问 |
| 框架推荐增强 | 🟡 已有基础 | 推荐理由 + 分数 |

**当前 Clarify 评估**：通用多轮追问，`api/lib/ai-service-v3` 有 `recommendFramework` 基础。

### P0-3: Decode 策略层 (Self-Consistency)

| 任务 | 状态 | 验收标准 |
|------|------|---------|
| Self-Consistency 实现 | ✅ 完成 | 多路径采样 + 投票，支持 exact/normalized/semantic 三种投票算法 |
| Decode 策略配置器 | ✅ 完成 | greedy/sampling/SC 可切换，任务类型自动推荐策略 |
| Confidence 显示 | ✅ 完成 | 可靠性分数（0-1），随响应 raw._confidence 透出 |
| 成本-质量 UI | 🟡 基础完成 | 成本估算 API `estimateCost()` + `estimateTaskCost()`，前端 Slider 待接入 |

**当前状态**：`api/services/ai/decoding-strategies.ts` + `self-consistency.ts` 已上线，AIRouter 集成完毕。流式模式自动降级为 sampling。

---

## 第二期：前沿追赶

| 功能 | 状态 | 备注 |
|------|------|------|
| P1-1 多模态提示词引擎 | ⬜ | 文生图/图生文/视频分镜 |
| P1-2 智能框架匹配引擎 | ⬜ | ≥15 种框架知识图谱 |
| P1-3 Prompt Chain 可视化 | ⬜ | Tree of Thoughts 风格 |

---

## 第三期：工程化闭环

| 功能 | 状态 | 备注 |
|------|------|------|
| P2-1 质量门禁系统 | ⬜ | ≥10 项检查点 |
| P2-2 反馈闭环 | ⬜ | ≥5 维反馈，数据驱动进化 |
| P2-3 Drift Detection | ⬜ | embedding + cosine similarity |

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
| 数据库 schema 无版本控制 | 🔴 高 | ⬜ |
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
| OPRO | ❌ | P0-1 |
| Tree of Thoughts | ❌ | P1-3 |
| ReAct | ❌ | P1-3 |
| Multi-modal | ❌ | P1-1 |
| Auto framework sel. | 🟡 基础版 | `api/lib/ai-service-v3/catalog.ts` recommendFramework |
| Prompt chaining | ❌ | P1-3 |
| Quality gating | ❌ | P2-1 |
| Agent swarm | ❌ | P3-2 |

---

## 下一步行动

**本周**：P0-3 Decode 策略层已完成，启动 P0-1 OPRO 自动优化引擎

```
1. api/services/ai/decoding-strategies.ts — 策略配置 ✅
2. api/services/ai/self-consistency.ts — SC 实现 ✅
3. 集成到 AIRouter，所有调用经过 decode 层 ✅

下一步：
1. api/services/promptforge/opro-engine.ts — OPRO 核心引擎
2. api/services/promptforge/llm-judge.ts — LLM-as-judge 评估器
3. src/components/optimizer/ — 优化轨迹可视化组件
```

---

*最后更新：2026-04-30*
