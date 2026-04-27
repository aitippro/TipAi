# 贡献指南 (Contributing Guide)

感谢您对 **TipAi** 项目的关注！本项目为个人开发的教育/工具型项目，**不接受外部商业性 Pull Request**，但欢迎以下形式的贡献：

---

## 一、我们欢迎的贡献

### 1. Bug 报告 (Bug Reports)
- 请通过 [Issues](https://github.com/aitippro/AI-prompt/issues) 提交
- 使用模板：`Bug Report`
- 必须包含：
  - 问题描述
  - 复现步骤
  - 期望行为 vs 实际行为
  - 环境信息（浏览器、Node.js 版本等）

### 2. 引用勘误 (Attribution Corrections)
- 如发现 `ATTRIBUTION.md` 中的引用遗漏或错误
- 请通过 [Issues](https://github.com/aitippro/AI-prompt/issues) 提交，标签选 `documentation`

### 3. 文档翻译 (Translations)
- 仅限 `README.md`、`ATTRIBUTION.md`、`CHANGELOG.md` 等非代码文档
- 代码逻辑和框架实现不接受外部修改

### 4. 安全报告 (Security Issues)
- **请勿通过公开 Issue 提交安全漏洞**
- 请直接联系项目维护者

---

## 二、我们不接受的贡献

| 类型 | 说明 |
|------|------|
| 商业性 PR | 包含商业产品推广、引流链接、付费功能接入 |
| 核心代码修改 | 提示词框架逻辑、AI 生成链路、认证系统等核心模块 |
| 依赖替换 | 更换技术栈、引入新的第三方服务 |
| 品牌推广 | 在文档中添加公司 Logo、商业标语 |

---

## 三、代码风格（仅供内部参考）

本项目技术栈：
- **前端**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **后端**: Hono + tRPC + Drizzle ORM
- **数据库**: MySQL
- **测试**: Vitest

提交规范：
```
<type>: <description>

- feat: 新功能
- fix: 修复
- docs: 文档
- security: 安全修复
- refactor: 重构
- test: 测试
```

---

## 四、行为准则

- 尊重开源社区和学术诚信
- 不得利用本项目进行商业竞争或恶意抄袭
- 不得将项目代码用于训练商业 AI 模型

---

## 五、联系方式

- Issues: [https://github.com/aitippro/AI-prompt/issues](https://github.com/aitippro/AI-prompt/issues)
- 项目维护者保留所有贡献的审核权和拒绝权

**感谢您的理解与支持！**
