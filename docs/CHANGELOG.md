# 更新日志 (Changelog)

本项目采用 [语义化版本](https://semver.org/lang/zh-CN/)（SemVer）管理版本号：`主版本号.次版本号.修订号`

---

## [0.1.0] - 2026-04-27

### 初始版本

#### 新增功能
- **Prompt Forge 提示词工坊**
  - 支持 20+ 提示词框架（CO-STAR、RISEN、RTF、CRISPE、LangGPT、Chain-of-Thought 等）
  - 自动框架推荐机制（基于用户输入匹配最优框架）
  - 框架选择器与参数配置面板
  - 实时预览与一键生成
  - 提示词历史记录

- **Template Market 模板市场**
  - 6 大领域模板（内容营销、编程开发、教育教学、数据分析、法律分析、通用任务）
  - 社区模板评分与使用统计
  - 模板收藏与复用

- **用户系统**
  - Kimi OAuth 登录集成
  - 本地用户名密码登录（bcrypt 哈希，仅限开发环境）
  - JWT Session 管理（7 天有效期）
  - 角色权限（user / admin）

- **AI 服务集成**
  - Kimi API v3 多轮对话支持
  - 流式输出（SSE）
  - 模型选择（kimi / kimi-k2）
  - 温度/长度参数调节

- **安全增强**
  - CORS 白名单校验（生产环境）
  - 全局 Rate Limiting（30 次/分钟）
  - AI 端点专项限流（5 次/分钟）
  - OAuth state HMAC 签名 + nonce
  - 生产环境强制环境变量校验
  - bcrypt 12 rounds 密码哈希
  - API Key 加密存储注释（AES-256-GCM）
  - npm audit: 0 vulnerabilities

- **CI/CD**
  - GitHub Actions 工作流
  - 自动执行：type check → lint → test → build → security audit

#### 技术栈
- React 19 + TypeScript ~5.9
- Vite 7 + Tailwind CSS 3
- Hono 4 + tRPC 11
- Drizzle ORM + SQLite (better-sqlite3)
- Vitest 4 测试框架

#### 文档
- `README.md` - 项目说明
- `ATTRIBUTION.md` - 致谢与引用（20+ 框架来源、技术栈致谢）
- `LICENSE.md` - 非商业使用许可
- `CONTRIBUTING.md` - 贡献指南
- `CHANGELOG.md` - 版本记录

---

## 版本规划

### [0.2.0] - 规划中
- [ ] 提示词优化器（Prompt Optimizer）
- [ ] 批量生成与导出
- [ ] 团队协作空间
- [ ] API 开放接口（供个人开发者）

### [1.0.0] - 规划中
- [ ] 完整的管理后台
- [ ] 高级用户行为分析
- [ ] 多语言完整支持

---

> **注意**: 本项目遵循 [非商业使用许可](./LICENSE.md)。任何商业使用、转售、嵌入商业产品均需获得书面授权。
