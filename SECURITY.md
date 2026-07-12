# Security Policy / 安全策略

## Supported Versions / 支持的版本

| Version | Supported |
| ------- | --------- |
| 1.x     | ✅ Yes    |

## Reporting a Vulnerability / 报告安全漏洞

**请不要通过 GitHub Issue 公开报告安全漏洞。**
**Please do NOT report security vulnerabilities through public GitHub Issues.**

如果你发现了安全漏洞，请通过以下方式联系我们：

If you discover a security vulnerability, please contact us via:

1. **GitHub Security Advisories** — 通过仓库的 [Security Advisories](https://github.com/callmebg/worthbase/security/advisories/new) 页面提交（推荐）
2. **Email** — 发送邮件至项目维护者（见仓库 Profile）

### 报告时请包含以下信息 / Please include:

- 漏洞的描述和影响范围 / Description of the vulnerability and its impact
- 复现步骤 / Steps to reproduce
- 受影响的版本 / Affected versions
- 如有修复建议也请一并提供 / Suggested fix if any

### 响应时间 / Response Time

- 我们会在 **48 小时内** 确认收到你的报告
- 我们会在 **7 天内** 给出初步评估和处理计划
- 修复后会在 Security Advisory 中致谢（如你同意）

## Scope / 范围

以下属于本项目安全范围：

- 本地数据存储安全（SQLite 数据库）
- 应用锁机制（PIN / 生物识别）
- 加密实现（expo-crypto）
- 安全存储（expo-secure-store）
- 数据导入/导出的安全处理

以下**不属于**安全范围：

- 上游依赖（Expo、React Native）的漏洞 — 请直接向对应项目报告
- 需要物理访问已解锁设备的攻击

---

感谢你帮助维护 WorthBase 的安全！🔒
