# TipAi 项目安全维护检查清单

> 本文件由 Security Agent 生成，用于持续安全维护。  
> 建议将此检查清单纳入团队周会/月会流程，并定期审查执行状态。

---

## 🗓️ 每周检查项（Weekly Checklist）

执行频率：**每周末或每周一**
执行人：Security Agent / 轮值安全负责人

### 依赖安全
- [ ] 运行 `npm audit` — 确认无新增高危漏洞（目标：0 vulnerabilities）
- [ ] 运行 `npm outdated` — 识别有安全修复的依赖项
- [ ] 检查是否有依赖发布了 **Security Advisory**（关注 GitHub Security 通知）
- [ ] 确认 staging / production 环境依赖版本一致

### 运行态安全
- [ ] 检查 Rate Limit 日志 — 是否存在异常高频率请求（DDoS / 爬虫）
- [ ] 检查 OAuth 回调日志 — 是否存在 CSRF 攻击尝试（state 校验失败）
- [ ] 检查 CSP 报告端点（如已部署 `report-uri`）— 是否有内联脚本注入尝试
- [ ] 确认 JWT 未出现过期异常激增（可能暗示 Token 泄露）

### 代码安全
- [ ] 审查本周合并的 PR — 是否引入新的 `eval()`、`innerHTML`、XSS 向量
- [ ] 确认无新的敏感信息（密钥、Token、密码）被提交到代码库

---

## 🗓️ 每月检查项（Monthly Checklist）

执行频率：**每月第一周**
执行人：Security Agent

### 依赖全面审计
- [ ] 生成完整依赖树 `npm ls --all` — 识别深度嵌套的过时/未维护包
- [ ] 评估 **主要版本升级** 的必要性（安全修复驱动 vs 功能驱动）
- [ ] 检查依赖的 **OpenSSF Scorecard** 评分（重点：关键依赖如 `jose`, `bcryptjs`, `hono`）
- [ ] 确认所有依赖许可证兼容（避免 GPL 传染）

### 配置与密钥
- [ ] 审查 `.gitignore` — 是否有新增敏感文件类型需排除
- [ ] 审查 `.env.example` — 是否与真实 `.env` 保持字段同步
- [ ] 轮换长期 Token / API Key（如 Kimi API Key、数据库密码等）
- [ ] 确认 OAuth App Secret 未过期，回调 URL 白名单正确
- [ ] 检查 S3 预签名 URL 过期时间是否合理（当前：？分钟）

### 安全头与策略
- [ ] 验证 Content-Security-Policy 有效性（使用 https://csp-evaluator.withgoogle.com/）
- [ ] 确认 CORS 白名单未意外放宽
- [ ] 检查 `X-Frame-Options`、`Referrer-Policy`、`Permissions-Policy` 是否到位
- [ ] 验证 `crossOriginEmbedderPolicy` 当前设置为 `false` 的合理性

### 基础设施
- [ ] 数据库备份恢复测试
- [ ] 确认 HTTPS 证书未过期
- [ ] 检查是否有未使用的 IAM/S3 权限需清理
- [ ] 审查服务器访问日志（异常 IP、地理位置）

---

## 🗓️ 每季度检查项（Quarterly Checklist）

- [ ] 渗透测试 / 漏洞扫描（如条件允许，使用专业工具）
- [ ] 灾难恢复演练（备份恢复、密钥泄露响应）
- [ ] 全员安全培训（钓鱼邮件、社工攻击防范）
- [ ] 审查第三方服务的安全合规证书（SOC 2、ISO 27001 等）
- [ ] 更新安全应急响应预案（Security Incident Response Plan）

---

## 📊 安全 KPI

| 指标 | 目标值 | 当前值 |
|---|---|---|
| npm audit 漏洞数 | 0 | 0 ✅ |
| CSP Grade (SecurityHeaders.com) | A+ | 待评估 |
| 依赖最新版本覆盖率 | ≥80% | ~ 待评估 |
| Rate Limit 触发率 | < 1% | 待评估 |
| OAuth 回调失败率 | < 0.1% | 待评估 |

---

## 🚨 紧急响应流程

当发生以下情况时，立即执行：

1. **密钥泄露** — 立即轮换密钥，撤销旧 Token，审查访问日志
2. **npm audit 发现高危漏洞** — 立即升级依赖，部署热修复
3. **XSS / 注入攻击** — 隔离受影响服务，修复漏洞，审查数据完整性
4. **DDoS / 流量异常** — 启用 CDN/WAF 防护，分析攻击源
5. **数据库异常访问** — 锁定数据库，审查 SQL 日志，恢复备份

---

## 📎 参考资源

- [OWASP Top 10 (2025)](https://owasp.org/www-project-top-ten/)
- [Google CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [npm Security Best Practices](https://docs.npmjs.com/security)
- [Hono Security Headers](https://hono.dev/docs/middleware/builtin/secure-headers)

---

*上次更新：2026-04-27 by Security Agent*
*下次审查：2026-05-04（每周）/ 2026-05-01（每月）*
