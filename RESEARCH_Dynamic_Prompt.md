# 动态提示词生成 (Dynamic Prompt Generation) 调研报告

> 调研时间: 2026-04-28
> 调研人: 小龙坎
> 背景: 用户需求从模糊到 AI 生成的过程中是动态变化的，需要一种能随需求演化而实时调整提示词的机制

---

## 1. 核心发现：Microsoft Dynamic Prompt Middleware (最相关)

### 论文
- **Dynamic Prompt Middleware: Contextual Prompt Refinement Controls for Comprehension Tasks**
- 作者: Ian Drosos 等, Microsoft Research
- 发表: CHIWORK 2025
- 论文: https://arxiv.org/pdf/2412.02357

### 核心概念
**Dynamic Prompt Refinement Control (Dynamic PRC)**:
- 用户输入模糊需求后，AI 自动生成一组**提示词选项** (Prompt Options)
- 选项以 UI 控件呈现（单选、多选、文本框）
- 用户调整选项 → 系统**实时重生成**响应
- 不需要用户重写提示词，通过控件微调即可

### 两层架构
| 层级 | 说明 | 示例 |
|------|------|------|
| **响应级控件** | 针对单次输入动态生成 | "解释详细程度"、"关注领域" |
| **会话级控件** | 跨会话持续生效 | "响应格式"（列表/段落/步骤） |

### 数据流
1. 用户输入模糊需求
2. Option Module 分析上下文 → 生成选项 JSON
3. Chat Module 用选项生成初始响应
4. 用户调整选项 → 系统**流式重生成**

### 开源
- **Promptions**: https://www.microsoft.com/en-us/research/project/tools-for-thought/promptions-repository/
- 包含聊天和图像生成界面 + 共享 UI 组件

---

## 2. 学术论文

### 2.1 Prompt Auto-Editing (PAE)
- **机构**: 中国人民大学 / 度小满
- **论文**: https://arxiv.org/html/2404.04095
- **方法**: 用强化学习自动优化 Stable Diffusion 提示词
- **两阶段**:
  1. SFT: 用过滤后的高质量 prompt-image 数据微调 GPT-2
  2. Online RL: PPO 算法优化提示词修饰符组合
- **效果**: 美学评分 + 语义一致性同时提升

### 2.2 Iterative Prompt Refinement 综述
- **来源**: https://www.emergentmind.com/topics/iterative-prompt-refinement
- **覆盖领域**: 文本、图像、代码、音乐、翻译、UI 设计

#### 代表性方法
| 方法 | 领域 | 核心机制 |
|------|------|---------|
| **PromptIQ** | 文生图 | 5 阶段循环：生成→分割→描述→评估→优化 |
| **TIR** | 文生图 | 多模态 LLM 分析 prompt-image 差异并重写 |
| **Culture-TRIP** | 文生图 | 文化细节检索 + 迭代丰富提示词 |
| **IPR** | 安全 | VLM 分析 prompt+image，循环修正直到安全 |
| **PromptAid** | 通用 | 可视化分析 + 关键词扰动 + 示例推荐 |
| **Teacher-Student** | 医疗 | 教师 LLM 根据学生错误重写提示词 |

---

## 3. 实际产品/工具

### 3.1 ComfyUI 生态 (图像/视频生成)
| 插件 | 功能 |
|------|------|
| **ComfyUI-Prompt-Expansion** | GPT-2 本地动态扩展提示词 |
| **ComfyUI-PromptManager** | SQLite 持久化存储 + 高级搜索 |
| **ComfyUI-LLM-Prompt-Optimizer** | 多 LLM API 优化图像生成提示词 |
| **ComfyUI-Prompter-fofrAI** | 提示词辅助生成 |
| **Random Prompt Builder** | 本地 GGUF 模型生成结构化提示词 |

### 3.2 视频编辑
- **Prompt-Driven Agentic Video Editing System**
  - 论文: https://arxiv.org/html/2509.16811
  - 一句话出片：上传视频 → 自由文本提示 → 自动剪辑
  - 分层语义索引 + 多智能体协作（节奏对齐、动态裁剪、字幕）

### 3.3 提示词工程框架
| 框架 | 说明 |
|------|------|
| **CRISPrompt** | Context + Role + Instruction + Style + Pattern |
| **CREATE** | Clarify → Refine → Example → Adjust → Test → Evaluate |
| **Iterative Refinement** | 编写→测试→分析→优化→验证 (循环) |

---

## 4. 关键洞察

### 4.1 用户痛点
用户从模糊需求到精准提示词的过程中：
1. **不知道缺什么** — 不知道自己的提示词缺什么要素
2. **试错成本高** — 每次重写提示词都要重新生成
3. **领域门槛** — 图像生成、视频剪辑有专业术语壁垒

### 4.2 动态生成的核心机制
```
用户模糊输入
    ↓
AI 分析意图 + 生成选项控件
    ↓
用户选择/调整选项 (不 rewrite prompt)
    ↓
系统实时重生成输出
    ↓
循环直到满意
```

### 4.3 可借鉴的设计模式
| 模式 | 来源 | 适用场景 |
|------|------|---------|
| **选项生成** | Microsoft DRC | 通用需求澄清 |
| **流式重生成** | Microsoft DRC | 实时预览调整效果 |
| **两层控制** | Microsoft DRC | 单次微调 vs 全局偏好 |
| **修饰符自动添加** | PAE | 图像生成场景 |
| **五阶段循环** | PromptIQ | 质量敏感场景 |

---

## 5. 对 TipAi 的建议

### 5.1 功能定位
**"需求演化器"** — 不是一次性生成提示词，而是陪伴用户从模糊到精准的过程

### 5.2 建议实现路径
1. **基础版**: Clarify (F1) 完成后，自动生成"提示词微调选项"
2. **进阶版**: 用户调整选项后，实时重新生成/优化提示词
3. **专业版**: 针对视频/图像场景，集成修饰符推荐和权重调整

### 5.3 技术参考
- **架构**: 参考 Microsoft DRC 的两层控件系统
- **交互**: 选项控件用 JSON Schema 描述 → React 动态渲染
- **AI 能力**: 用我们的多模型接入 (AI-1) 做选项生成和重写
- **存储**: 保存用户的偏好选项作为"个人风格模板"

---

## 6. 参考资料

1. [Dynamic Prompt Middleware (CHIWORK 2025)](https://arxiv.org/pdf/2412.02357)
2. [Prompt Auto-Editing for T2I](https://arxiv.org/html/2404.04095)
3. [Iterative Prompt Refinement 综述](https://www.emergentmind.com/topics/iterative-prompt-refinement)
4. [Prompt-Driven Video Editing](https://arxiv.org/html/2509.16811)
5. [Microsoft Promptions 开源项目](https://www.microsoft.com/en-us/research/project/tools-for-thought/promptions-repository/)
6. [ComfyUI Prompt Expansion](https://github.com/adieyal/comfyui-dynamic-prompts)

---

*调研完成。建议下一步：将 F6 细化为可执行任务，分配给 Dev Agent。*
