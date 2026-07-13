/**
 * WorthBase (家底) - Projection Calculator
 * Estimates goal achievement dates based on historical net worth data points
 * using simple linear regression.
 */

export const ProjectionCalculator = {
  /**
   * 基于历史净资产数据点估算达成目标的日期
   * @param historicalPoints 历史数据点 [{date: 'YYYY-MM-DD', value: number}]
   * @param goal 目标净资产值
   * @returns 预计达成日期字符串 'YYYY-MM-DD' 或 null（无法达成时）
   */
  estimateAchievementDate(
    historicalPoints: { date: string; value: number }[],
    goal: number
  ): string | null {
    // 至少需要 2 个数据点
    if (historicalPoints.length < 2) return null;

    // 取最近 6 个月的数据点
    const points = historicalPoints.slice(-6);

    // 计算月均增长率（线性回归斜率）
    const n = points.length;
    const firstDate = new Date(points[0].date + 'T00:00:00Z');

    // x = 距第一个点的月数, y = 净资产值
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      const d = new Date(points[i].date + 'T00:00:00Z');
      const x = (d.getTime() - firstDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000); // 月数
      const y = points[i].value;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return null; // 数据点 x 值相同，无法回归

    const slope = (n * sumXY - sumX * sumY) / denominator; // 月增长率

    // 增长为 0 或负数时无法达成
    if (slope <= 0) return null;

    const currentValue = points[n - 1].value;
    if (currentValue >= goal) return null; // 已达成

    const monthsNeeded = (goal - currentValue) / slope;

    // 从最后一个数据点开始推算
    const lastDate = new Date(points[n - 1].date + 'T00:00:00Z');
    const achievementDate = new Date(lastDate.getTime() + monthsNeeded * 30.44 * 24 * 60 * 60 * 1000);

    // 格式化为 YYYY-MM-DD
    const year = achievementDate.getUTCFullYear();
    const month = String(achievementDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(achievementDate.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
};
