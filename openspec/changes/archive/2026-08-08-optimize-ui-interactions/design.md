## Context

WorthBase 的总览页和账户页当前有三处冗余交互：

1. **次均成本洞察**（`app/index.tsx` L549-654）：使用 `usageTab` 状态在「最贵单次」和「闲置提醒」两个标签页之间切换，用户需要来回切换才能获得完整视图。
2. **余额总计卡片**（`app/accounts.tsx` L107-128）：右上角有独立的 Clock 图标按钮打开历史，与余额数字无关联，入口不够直觉。
3. **账户卡片**（`app/accounts.tsx` L142-174）：每个卡片底部有独立的「更新余额」`AppButton`，与卡片整体 `onPress` 功能重复。

本次变更仅涉及 UI 层，不涉及数据模型、引擎或数据库改动。

## Goals / Non-Goals

**Goals:**
- 将次均成本洞察的两个标签页合并为单一排行列表，闲置信息以内联徽章展示
- 移除余额总计卡片的独立历史按钮，改为点击余额数字显示历史
- 移除账户卡片底部的「更新余额」按钮，改为点击余额数值触发更新

**Non-Goals:**
- 不改变次均成本的计算逻辑（`UsageCalculator` 不变）
- 不改变余额历史弹窗（`BalanceHistorySheet`）的内容和数据源
- 不改变更新余额弹窗（`UpdateBalanceSheet`）的内容和流程
- 不修改资产页（`app/assets.tsx`）的交互

## Decisions

### Decision 1: 合并列表的数据源和排序策略

**选择**：以次均成本降序排列的统一列表，闲置资产在同一行内显示「闲置 X 天」徽章。

**实现方式**：
- 合并 `usageMap`（全部有使用记录的资产）和 `neglectedItems`（闲置 90+ 天的资产）
- 以 `usageMap` 为主数据源（按 `costPerUse` 降序），对每行检查是否 `isNeglected`，是则显示警告色徽章
- 保留最多显示 3 项的限制
- 空状态保持「还没有使用记录」文案

**替代方案**：先显示闲置项再显示排行 → 被否决，因为次均成本是核心指标，应始终按此排序。

### Decision 2: 余额总计点击区域

**选择**：将余额数字 `<Text>` 包裹在 `<TouchableOpacity>` 中，点击触发 `setHistoryVisible(true)`。

**实现方式**：
- 移除 heroLabelRow 右侧的 Clock 图标 `TouchableOpacity`
- 在 `totalAmount` `<Text>` 外层添加 `<TouchableOpacity onPress={() => setHistoryVisible(true)}>`
- 保留标签行的 Info 图标（打开 explainer）不变

**替代方案**：整个卡片可点击 → 被否决，因为卡片内已有 Info 按钮，整个卡片点击会导致误触。

### Decision 3: 账户卡片余额数值可点击

**选择**：移除底部「更新余额」按钮，将余额数值 `<Text>` 包裹在 `<TouchableOpacity>` 中作为主要更新入口。卡片整体 `onPress` 保留不变。

**实现方式**：
- 移除 `AppButton` 及其 `styles.updateBtn`
- 在 `cardBalance` `<Text>` 外层添加 `<TouchableOpacity onPress={() => setUpdateTarget(item)}>`
- 卡片整体 `onPress` 保持 `setUpdateTarget(item)` 不变

**替代方案**：只保留卡片 `onPress`、不单独包裹余额 → 被否决，因为用户可能点击卡片任意位置（如账户名称区域）并非想更新余额，单独包裹余额数值更精准。

## Risks / Trade-offs

- **点击区域变小**：移除独立按钮后，余额数值文字的可点击区域较小 → 通过添加适当的 padding（至少 12px）确保触摸目标符合无障碍标准
- **发现性降低**：用户可能不知道余额数字可以点击 → 通过视觉暗示（下划线或辅助色）提升可点击感知
- **与 dashboard-redesign spec 重叠**：`dashboard-redesign` spec 已有 `Cost-per-use ranking on dashboard` 要求和 `REMOVED` 的 tab toggle 部分。本次变更实现后，dashboard-redesign 中相关要求的实现状态应同步更新
