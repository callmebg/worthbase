# Changelog / 更新日志

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-07-12

### Added
- 账户余额管理：多账户类型支持，手动更新余额 + 快照记录
- 净资产趋势：基于快照生成折线图，支持半年/一年/两年范围切换
- 净资产目标设定与进度可视化
- 实物资产管理：8 种资产分类，完整生命周期管理
- 持有成本智能计算：4 种分摊策略（简单线性/预期寿命/残值/不分摊）
- 经常性支出管理：支持生效区间设置
- 一次性维护费用：可选纳入分摊
- 卖出结算：自动计算购入价、卖价、贬值、累计成本、日均成本
- 数据安全：完全本地存储，PIN + 生物识别应用锁
- 自动备份：退出时自动备份 SQLite 数据库（保留最近 3 份）
- 数据导入/导出：JSON（完整备份）和 CSV（可读导出）
- 深色模式 + 4 种主题颜色
- 货币符号自定义
- 首次使用引导页
