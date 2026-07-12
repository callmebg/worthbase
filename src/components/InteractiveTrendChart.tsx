/**
 * InteractiveTrendChart – financial line chart with pinch-to-zoom,
 * pan-to-drag, X/Y axis labels, and grid lines.
 *
 * Uses battle-tested PanGestureHandler + PinchGestureHandler (old API)
 * with react-native-svg for rendering. No gesture composition issues.
 */

import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, {
  Path as SvgPath,
  Line as SvgLine,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Circle as SvgCircle,
  Text as SvgText,
  Rect as SvgRect,
} from 'react-native-svg';
import {
  PanGestureHandler,
  PinchGestureHandler,
  TapGestureHandler,
  type PanGestureHandlerGestureEvent,
  type PinchGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import { formatCurrency, formatCompactCurrency } from '@/utils/format';

/* ── types ──────────────────────────────────────────────── */

export interface TrendChartData {
  labels: string[];
  values: number[];
}

interface Props {
  data: TrendChartData;
  width?: number;
  height?: number;
  currencySymbol?: string;
  backgroundColor?: string;
  primaryColor?: string;
  labelColor?: string;
  gridColor?: string;
  showZoomControls?: boolean;
  yAxisWidth?: number;
  xAxisHeight?: number;
  goalValue?: number | null;
}

/* ── constants ──────────────────────────────────────────── */

const MIN_VISIBLE = 3;
const Y_LABEL_COUNT = 4;
const PAD = 16;

/* ── component ──────────────────────────────────────────── */

export const InteractiveTrendChart: React.FC<Props> = ({
  data,
  width: propWidth,
  height: propHeight,
  currencySymbol = '¥',
  backgroundColor = '#17171A',
  primaryColor = '#00B894',
  labelColor = '#888',
  gridColor = '#2A2A2E',
  showZoomControls = false,
  yAxisWidth = 56,
  xAxisHeight = 24,
  goalValue = null,
}) => {
  const totalPoints = data.values.length;

  /* ── layout measurement ───────────────────────────────── */

  const [measuredW, setMeasuredW] = useState(propWidth || 300);
  const [measuredH, setMeasuredH] = useState(propHeight || 200);

  const onLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number; height: number } } }) => {
      if (!propWidth) setMeasuredW(e.nativeEvent.layout.width);
      if (!propHeight) setMeasuredH(e.nativeEvent.layout.height);
    },
    [propWidth, propHeight]
  );

  const width = propWidth || measuredW;
  const height = propHeight || measuredH;

  /* ── data-window state ────────────────────────────────── */

  const [windowStart, setWindowStart] = useState(0);
  const [windowSize, setWindowSize] = useState(totalPoints);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Reset window when data length changes (e.g. new time range)
  useEffect(() => {
    setWindowStart(0);
    setWindowSize(totalPoints);
    setSelectedIndex(null);
  }, [totalPoints]);

  // Gesture-start snapshots (refs avoid stale closures)
  const panStartRef = useRef(0);
  const panWsRef = useRef(0);
  const pinchStartRef = useRef(totalPoints);
  const pinchCenterRef = useRef(totalPoints / 2);

  /* ── visible data ─────────────────────────────────────── */

  const vStart = Math.max(0, Math.min(windowStart, totalPoints - MIN_VISIBLE));
  const vEnd = Math.min(totalPoints, vStart + windowSize);
  const visValues = data.values.slice(vStart, vEnd);
  const visLabels = data.labels.slice(vStart, vEnd);

  /* ── chart area ───────────────────────────────────────── */

  const zoomRowH = showZoomControls ? 40 : 0;
  const chartW = Math.max(1, width - yAxisWidth);
  const chartH = Math.max(1, height - xAxisHeight - zoomRowH);

  /* ── SVG paths + labels ───────────────────────────────── */

  const { lineD, areaD, yLabels, gridLines, dots, splitPct, goalLine, selectedDot } = useMemo(() => {
    const n = visValues.length;
    if (n < 2)
      return { lineD: '', areaD: '', yLabels: [] as { label: string; y: number }[], gridLines: [] as { y: number }[], dots: [] as { cx: number; cy: number }[], splitPct: 0.5, goalLine: null as { y: number; label: string } | null, selectedDot: null as { cx: number; cy: number; value: number; label: string } | null };

    const minV = Math.min(...visValues);
    const maxV = Math.max(...visValues);
    const rangeV = maxV - minV || 1;
    const vPad = chartH * 0.08;
    const drawH = chartH - PAD - vPad * 2;
    const drawW = chartW - PAD * 2;
    const xStep = n > 1 ? drawW / (n - 1) : 0;

    const toX = (i: number) => PAD + i * xStep;
    const toY = (v: number) => PAD + vPad + ((maxV - v) / rangeV) * drawH;

    let ld = `M${toX(0).toFixed(1)},${toY(visValues[0]).toFixed(1)}`;
    for (let i = 1; i < n; i++) ld += ` L${toX(i).toFixed(1)},${toY(visValues[i]).toFixed(1)}`;

    const baseY = toY(visValues[0]);
    const ad = `${ld} L${toX(n - 1).toFixed(1)},${baseY.toFixed(1)} L${toX(0).toFixed(1)},${baseY.toFixed(1)} Z`;

    const dots = visValues.map((v, i) => ({ cx: toX(i), cy: toY(v) }));

    // Y-axis labels with overlap prevention
    const MIN_LABEL_GAP = 16;
    const allYLabels: { label: string; y: number }[] = [];
    for (let i = 0; i <= Y_LABEL_COUNT; i++) {
      const val = minV + (rangeV * i) / Y_LABEL_COUNT;
      allYLabels.push({ label: formatCompactCurrency(val, currencySymbol), y: toY(val) });
    }
    const yLabels: typeof allYLabels = [allYLabels[0]];
    for (let i = 1; i < allYLabels.length - 1; i++) {
      if (Math.abs(allYLabels[i].y - yLabels[yLabels.length - 1].y) >= MIN_LABEL_GAP) {
        yLabels.push(allYLabels[i]);
      }
    }
    // Always include the last label (max value)
    const lastLabel = allYLabels[allYLabels.length - 1];
    if (Math.abs(lastLabel.y - yLabels[yLabels.length - 1].y) >= MIN_LABEL_GAP) {
      yLabels.push(lastLabel);
    }

    // Goal line (only if within visible range)
    const goalLine = goalValue != null && goalValue >= minV && goalValue <= maxV
      ? { y: toY(goalValue), label: formatCompactCurrency(goalValue, currencySymbol) }
      : null;

    // Selected point tooltip
    const selectedDot = selectedIndex != null && selectedIndex >= 0 && selectedIndex < visValues.length
      ? { cx: toX(selectedIndex), cy: toY(visValues[selectedIndex]), value: visValues[selectedIndex], label: visLabels[selectedIndex] }
      : null;

    const splitPct = Math.max(0.05, Math.min(0.95, (maxV - visValues[0]) / rangeV));

    return { lineD: ld, areaD: ad, yLabels, gridLines: allYLabels, dots, splitPct, goalLine, selectedDot };
  }, [visValues, visLabels, chartW, chartH, currencySymbol, goalValue, selectedIndex]);

  /* ── X-axis labels ────────────────────────────────────── */

  const xLabels = useMemo(() => {
    const maxLabels = Math.max(2, Math.floor(chartW / 64));
    const step = Math.max(1, Math.ceil(visLabels.length / maxLabels));
    return visLabels.filter((_, i) => i % step === 0 || i === visLabels.length - 1);
  }, [visLabels, chartW]);

  /* ── gesture handlers (old API) ───────────────────────────
   * onHandlerStateChange fires on BEGAN / END transitions.
   * onGestureEvent fires continuously during ACTIVE only.
   * We MUST use onHandlerStateChange to capture the start values,
   * otherwise the first ACTIVE frame uses stale ref = 0.
   */

  const onPanStateChange = useCallback(
    (e: any) => {
      const { state, translationX } = e.nativeEvent;
      if (state === 2) {
        // BEGAN: snapshot starting position
        panStartRef.current = translationX;
        panWsRef.current = windowStart;
      }
    },
    [windowStart]
  );

  const onPan = useCallback(
    (e: PanGestureHandlerGestureEvent) => {
      // Only ACTIVE events arrive here
      const delta = e.nativeEvent.translationX - panStartRef.current;
      const ptsPerPx = windowSize / chartW;
      const shift = Math.round(-delta * ptsPerPx);
      const next = Math.max(0, Math.min(totalPoints - windowSize, panWsRef.current + shift));
      setWindowStart(next);
    },
    [windowSize, chartW, totalPoints]
  );

  const onPinchStateChange = useCallback(
    (e: any) => {
      const { state } = e.nativeEvent;
      if (state === 2) {
        // BEGAN: snapshot current zoom level & center
        pinchStartRef.current = windowSize;
        pinchCenterRef.current = windowStart + windowSize / 2;
      }
    },
    [windowStart, windowSize]
  );

  const onPinch = useCallback(
    (e: PinchGestureHandlerGestureEvent) => {
      // Only ACTIVE events arrive here
      const newN = Math.max(
        MIN_VISIBLE,
        Math.min(totalPoints, Math.round(pinchStartRef.current / e.nativeEvent.scale))
      );
      let start = Math.round(pinchCenterRef.current - newN / 2);
      start = Math.max(0, Math.min(totalPoints - newN, start));
      setWindowSize(newN);
      setWindowStart(start);
    },
    [totalPoints]
  );

  /* ── zoom buttons ─────────────────────────────────────── */

  const zoomIn = useCallback(() => {
    const n = Math.max(MIN_VISIBLE, Math.round(windowSize * 0.7));
    const c = windowStart + windowSize / 2;
    setWindowSize(n);
    setWindowStart(Math.max(0, Math.min(totalPoints - n, Math.round(c - n / 2))));
  }, [windowSize, windowStart, totalPoints]);

  const zoomOut = useCallback(() => {
    const n = Math.min(totalPoints, Math.round(windowSize * 1.4));
    const c = windowStart + windowSize / 2;
    setWindowSize(n);
    setWindowStart(Math.max(0, Math.min(totalPoints - n, Math.round(c - n / 2))));
  }, [windowSize, windowStart, totalPoints]);

  /* ── tap handler for tooltip ──────────────────────────── */

  const onTap = useCallback(
    (e: any) => {
      if (e.nativeEvent.state !== 4) return; // only END state
      const x = e.nativeEvent.x - PAD;
      const drawW = chartW - PAD * 2;
      const n = visValues.length;
      if (n < 2 || drawW <= 0) return;
      const xStep = drawW / (n - 1);
      const idx = Math.round(x / xStep);
      const clampedIdx = Math.max(0, Math.min(n - 1, idx));
      setSelectedIndex(prev => prev === clampedIdx ? null : clampedIdx);
    },
    [visValues.length, chartW]
  );

  /* ── refs for nested handlers ─────────────────────────── */

  const pinchRef = useRef(null);
  const panRef = useRef(null);
  const tapRef = useRef(null);

  /* ── empty state ──────────────────────────────────────── */

  if (totalPoints < 2) {
    return (
      <View
        style={[styles.empty, { width: propWidth, height: propHeight }]}
        onLayout={onLayout}
      >
        <Text style={{ color: labelColor, fontSize: 14 }}>数据不足</Text>
      </View>
    );
  }

  /* ── render ───────────────────────────────────────────── */

  const s0 = `${Math.round(splitPct * 100)}%`;
  const gradId = 'trendAreaGrad';

  return (
    <View
      style={[styles.root, propWidth ? { width: propWidth } : null, propHeight ? { height: propHeight } : null]}
      onLayout={onLayout}
    >
      {/* Zoom controls */}
      {showZoomControls && (
        <View style={styles.zoomRow}>
          <TouchableOpacity
            onPress={zoomOut}
            style={[styles.zoomBtn, { borderColor: gridColor }]}
            disabled={windowSize >= totalPoints}
          >
            <Text style={[styles.zoomBtnText, { color: windowSize >= totalPoints ? gridColor : labelColor }]}>−</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={zoomIn}
            style={[styles.zoomBtn, { borderColor: gridColor }]}
            disabled={windowSize <= MIN_VISIBLE}
          >
            <Text style={[styles.zoomBtnText, { color: windowSize <= MIN_VISIBLE ? gridColor : labelColor }]}>+</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Chart body: Y-axis + gesture-wrapped SVG */}
      <View style={styles.chartRow}>
        {/* Y-axis labels */}
        <View style={[styles.yAxisCol, { width: yAxisWidth, height: chartH }]}>
          {yLabels.map((item, i) => (
            <Text
              key={i}
              style={[styles.yLabel, { color: labelColor, top: item.y - 7 }]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          ))}
        </View>

        {/* Pinch → Pan → Tap → SVG */}
        <PinchGestureHandler
          ref={pinchRef}
          onHandlerStateChange={onPinchStateChange}
          onGestureEvent={onPinch}
          simultaneousHandlers={[panRef, tapRef]}
        >
          <PanGestureHandler
            ref={panRef}
            onHandlerStateChange={onPanStateChange}
            onGestureEvent={onPan}
            simultaneousHandlers={[pinchRef, tapRef]}
            minDist={8}
          >
            <TapGestureHandler
              ref={tapRef}
              onHandlerStateChange={onTap}
              simultaneousHandlers={[pinchRef, panRef]}
              numberOfTaps={1}
            >
            <View style={[styles.svgWrap, { width: chartW, height: chartH, backgroundColor }]}>
              <Svg width={chartW} height={chartH}>
                <Defs>
                  <SvgLinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={primaryColor} stopOpacity={0.45} />
                    <Stop offset={s0} stopColor={primaryColor} stopOpacity={0} />
                    <Stop offset={s0} stopColor="#EA3943" stopOpacity={0} />
                    <Stop offset="100%" stopColor="#EA3943" stopOpacity={0.12} />
                  </SvgLinearGradient>
                </Defs>

                {/* Grid lines (use all positions for dense grid) */}
                {gridLines.map((item, i) => (
                  <SvgLine
                    key={`g${i}`}
                    x1={PAD}
                    y1={item.y}
                    x2={chartW - PAD}
                    y2={item.y}
                    stroke={gridColor}
                    strokeWidth={0.5}
                  />
                ))}

                {/* Goal line */}
                {goalLine && (
                  <>
                    <SvgLine
                      x1={PAD} y1={goalLine.y}
                      x2={chartW - PAD} y2={goalLine.y}
                      stroke="#FDCB6E"
                      strokeWidth={1.5}
                      strokeDasharray="6,4"
                    />
                    <SvgText
                      x={chartW - PAD - 4} y={goalLine.y - 4}
                      textAnchor="end" fill="#FDCB6E" fontSize={10}
                    >
                      目标 {goalLine.label}
                    </SvgText>
                  </>
                )}

                {/* Area fill */}
                {areaD ? <SvgPath d={areaD} fill={`url(#${gradId})`} /> : null}

                {/* Trend line */}
                {lineD ? (
                  <SvgPath
                    d={lineD}
                    fill="none"
                    stroke={primaryColor}
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ) : null}

                {/* Data dots */}
                {dots.map((d, i) => (
                  <SvgCircle
                    key={`d${i}`}
                    cx={d.cx}
                    cy={d.cy}
                    r={3}
                    fill={backgroundColor}
                    stroke={primaryColor}
                    strokeWidth={2}
                  />
                ))}

                {/* Selected point tooltip */}
                {selectedDot && (
                  <>
                    {/* Vertical crosshair */}
                    <SvgLine
                      x1={selectedDot.cx} y1={PAD}
                      x2={selectedDot.cx} y2={chartH - PAD}
                      stroke={labelColor} strokeWidth={1}
                      strokeDasharray="3,3" opacity={0.5}
                    />
                    {/* Highlighted circle */}
                    <SvgCircle
                      cx={selectedDot.cx} cy={selectedDot.cy}
                      r={6} fill={primaryColor} stroke="#fff" strokeWidth={2}
                    />
                    {/* Tooltip background */}
                    <SvgRect
                      x={Math.min(Math.max(selectedDot.cx - 54, PAD), chartW - PAD - 108)}
                      y={Math.max(selectedDot.cy - 44, PAD)}
                      width={108} height={36} rx={6}
                      fill="rgba(0,0,0,0.82)"
                    />
                    {/* Tooltip value */}
                    <SvgText
                      x={Math.min(Math.max(selectedDot.cx, PAD + 54), chartW - PAD - 54)}
                      y={Math.max(selectedDot.cy - 28, PAD + 14)}
                      textAnchor="middle" fill="#fff" fontSize={12} fontWeight="600"
                    >
                      {formatCurrency(selectedDot.value, currencySymbol)}
                    </SvgText>
                    {/* Tooltip date */}
                    <SvgText
                      x={Math.min(Math.max(selectedDot.cx, PAD + 54), chartW - PAD - 54)}
                      y={Math.max(selectedDot.cy - 14, PAD + 28)}
                      textAnchor="middle" fill="#aaa" fontSize={9}
                    >
                      {selectedDot.label}
                    </SvgText>
                  </>
                )}
              </Svg>
            </View>
            </TapGestureHandler>
          </PanGestureHandler>
        </PinchGestureHandler>
      </View>

      {/* X-axis labels */}
      <View style={[styles.xAxisRow, { height: xAxisHeight, marginLeft: yAxisWidth, width: chartW }]}>
        {xLabels.map((label, i) => (
          <Text key={i} style={[styles.xLabel, { color: labelColor }]}>
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
};

/* ── styles ──────────────────────────────────────────────── */

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
  empty: { alignItems: 'center', justifyContent: 'center' },
  zoomRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    height: 40,
  },
  zoomBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnText: { fontSize: 20, fontWeight: '600', lineHeight: 22 },
  chartRow: { flexDirection: 'row' },
  yAxisCol: { position: 'relative' },
  yLabel: {
    position: 'absolute',
    right: 4,
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'right',
  },
  svgWrap: { borderRadius: 8, overflow: 'hidden' },
  xAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: PAD,
    paddingTop: 4,
  },
  xLabel: { fontSize: 10 },
});
