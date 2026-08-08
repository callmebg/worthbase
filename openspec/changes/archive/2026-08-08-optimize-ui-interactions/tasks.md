## 1. 合并次均成本洞察（app/index.tsx）

- [x] 1.1 移除 `usageTab` 状态变量及其 `useState` 声明（L98-100 附近）
- [x] 1.2 移除标签页切换区域的 `usageTabRow` 视图及两个 `AppChip` 组件（L557-568）
- [x] 1.3 将「最贵单次」排行列表改为统一列表：保留按 `costPerUse` 降序排列的 top 3，移除 `usageTab === 'expensive'` 条件判断（L571-609）
- [x] 1.4 在统一列表的每一行中，当 `usage.isNeglected` 为 true 时，显示警告色「闲置 X 天」徽章（合并原「闲置提醒」标签页的信息到行内）
- [x] 1.5 移除「闲置提醒」独立标签页的整段渲染逻辑（L613-642）
- [x] 1.6 移除不再需要的样式定义（`usageTabRow` 等），清理未使用的 `neglectedItems` 状态（如果不再需要单独引用）

## 2. 余额总计点击显示历史（app/accounts.tsx）

- [x] 2.1 移除余额总计卡片右上角的 Clock 图标 `TouchableOpacity` 按钮（L119-124）
- [x] 2.2 将余额数字 `<Text style={styles.totalAmount}>` 包裹在 `<TouchableOpacity onPress={() => setHistoryVisible(true)}>` 中，添加适当的 padding 确保触摸目标足够大
- [x] 2.3 验证点击余额数字能正确打开 `BalanceHistorySheet`

## 3. 移除账户卡片更新按钮（app/accounts.tsx）

- [x] 3.1 移除每个账户卡片底部的 `AppButton`（"更新余额"按钮）及其 `styles.updateBtn` 样式（L166-172）
- [x] 3.2 将账户余额数值 `<Text style={styles.cardBalance}>` 包裹在 `<TouchableOpacity onPress={() => setUpdateTarget(item)}>` 中，添加适当的 padding
- [x] 3.3 验证点击余额数值能正确打开 `UpdateBalanceSheet`，卡片整体 `onPress` 行为不变

## 4. 清理与验证

- [x] 4.1 清理 `app/accounts.tsx` 中不再使用的样式定义（`updateBtn` 等）
- [x] 4.2 确保 `BalanceHistorySheet`、`UpdateBalanceSheet`、`AccountActionSheet` 的触发逻辑在交互变更后仍正常工作
- [x] 4.3 在真机或模拟器上验证三项改动的手感和可点击区域是否符合预期
