# Fix settlement cost and held duration

## Why

1. **卖出结算「真实净支出 / 日均成本」把购入价重复计了两次**：净支出公式为 `购入价 + 累计持有成本 − 卖价`，而累计持有成本中又包含**累计折旧**（购入价的会计分摊，上限即购入价）。对持有超过预期寿命、已折满的资产，累计折旧 ≈ 购入价，等于购入价被计两次。实例：购入 ¥6,999、卖出 ¥2,400、持有 1,477 天，页面显示净支出 ¥11,598（= 6,999 × 2 − 2,400）、日均成本 ¥7.85/天；正确应为净支出 ¥4,599（= 贬值额）、日均 ¥3.11/天。用户误以为系统"把所有资产的总支出摊到单台设备上"，严重损害对结算数字的信任。
2. **「已持有」在资产卖出后仍持续增长**：详情页「购入信息」与资产列表卡片的持有时长都是从购入日期算到**今天**（`getMonthsHeld` 硬编码 `new Date()`），资产卖出多年后仍显示"已持有 7 年+"。持有时长应在卖出当天截止，否则误导用户。

## What Changes

- **修正结算口径**（唯一咽喉点 `SettlementCalculator`，详情页结算卡片与卖出预览弹窗同时受益）：
  - `累计持有成本 = 经常性支出 + 维护费`（**现金性成本**；累计折旧不再计入——贬值行已单独体现购入价损耗）
  - `真实净支出 = 购入价 + 累计持有成本 − 卖价`（公式不变，随口径修正 = 贬值额 + 现金性持有成本）
  - `日均成本 = 真实净支出 ÷ 持有天数`（公式不变，随口径修正）
  - `SettlementResult.accumulatedAmortization` 字段保留（仍计算、仍返回，供参考），但不参与 totalHoldingCost
- **「已持有」截止于卖出日**：`getMonthsHeld(purchaseDate, endDate?)` 新增可选截止日期参数（默认今天，向后兼容）；详情页与列表卡片对已售资产传入 `sellDate`
- **同步更新类型注释**：`models.ts` 中 `SettlementResult.totalHoldingCost / netExpenditure` 的 JSDoc 改为新口径
- **测试**：修正 `engine.test.ts` 中固化旧口径的用例（"total holding cost = recurring + maintenance + amortization"）；新增"已折满资产净支出 = 贬值额、日均成本不重复计价"回归用例（采用报告实例 6,999/2,400/1,477 天）；新增 `getMonthsHeld` endDate 截止行为用例
- 无数据库迁移、无字段增删、无 BREAKING——纯计算语义与展示修正

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `holding-cost-calc`: 新增卖出结算口径要求——真实净支出不得重复计入购入价（累计折旧不计入累计持有成本）；日均成本 = 真实净支出 ÷ 持有天数，仅基于该资产自身数据
- `asset-management`: 新增已售资产持有时长要求——「已持有」截止于卖出日而非当前日期，详情页与列表卡片一致

## Impact

- **计算引擎**: `src/engine/SettlementCalculator.ts`（`calculate()` 一处修改；`preview()` 复用 `calculate()`，卖出预览弹窗 `SettlementModal` 自动跟随）
- **类型注释**: `src/types/models.ts`（`SettlementResult` JSDoc，无字段变更）
- **工具函数**: `src/utils/format.ts`（`getMonthsHeld` 增加可选参数，既有调用零改动兼容）
- **UI**: `src/components/AssetDetailModal.tsx`（「已持有」传 `sellDate`）、`app/assets.tsx`（列表卡片 `months` 传 `sellDate`）
- **测试**: `__tests__/engine.test.ts`（口径用例修正 + 回归用例）
- **不受影响**: `HoldingCostCalculator`（active 资产的月度/日均口径本就正确，购入价未重复计）、数据库、导入导出、贵金属实时参考价
- **CHANGELOG**: 记入 Fixed 条目（版本号随下次发布统一 bump）
