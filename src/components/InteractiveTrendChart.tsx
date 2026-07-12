/**
 * InteractiveTrendChart – financial line chart with pinch-to-zoom,
 * pan-to-drag, X/Y axis labels, and grid lines.
 *
 * Uses battle-tested PanGestureHandler + PinchGestureHandler (old API)
 * with react-native-svg for rendering. No gesture composition issues.
 */

import React, { useRef, useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, {
  Path as SvgPath,
  Line as SvgLine,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Circle as SvgCircle,
} from 'react-native-svg';
import {
  PanGestureHandler,
  PinchGestureHandler,
  type PanGestureHandlerGestureEvent,
  type PinchGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import { formatCompactCurrency } from '@/utils/format';

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

  // Gesture-start snapshots (refs avoid stale closures)
  const panStartRef = useRef(0);
  const panWsRef = useRef(0);
  const pinchStartRef = useRef(totalPoints);

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

  const { lineD, areaD, yLabels, dots, splitPct } = useMemo(() => {
    const n = visValues.length;
    if (n < 2)
      return { lineD: '', areaD: '', yLabels: [] as { label: string; y: number }[], dots: [] as { cx: number; cy: number }[], splitPct: 0.5 };

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

    const yLabels: { label: string; y: number }[] = [];
    for (let i = 0; i <= Y_LABEL_COUNT; i++) {
      const val = minV + (rangeV * i) / Y_LABEL_COUNT;
      yLabels.push({ label: formatCompactCurrency(val, currencySymbol), y: toY(val) });
    }

    const splitPct = Math.max(0.05, Math.min(0.95, (maxV - visValues[0]) / rangeV));

    return { lineD: ld, areaD: ad, yLabels, dots, splitPct };
  }, [visValues, chartW, chartH, currencySymbol]);

  /* ── X-axis labels ────────────────────────────────────── */

  const xLabels = useMemo(() => {
    const maxLabels = Math.max(2, Math.floor(chartW / 64));
    const step = Math.max(1, Math.ceil(visLabels.length / maxLabels));
    return visLabels.filter((_, i) => i % step === 0 || i === visLabels.length - 1);
  }, [visLabels, chartW]);

  /* ── gesture handlers (old API – reliable) ────────────── */

  const onPan = useCallback(
    (e: PanGestureHandlerGestureEvent) => {
      const { state, translationX } = e.nativeEvent;
      // state: 2=BEGAN, 4=ACTIVE, 5=END, 6=FAILED
      if (state === 2) {
        panStartRef.current = translationX;
        panWsRef.current = windowStart;
      } else if (state === 4) {
        const delta = translationX - panStartRef.current;
        const ptsPerPx = windowSize / chartW;
        const shift = Math.round(-delta * ptsPerPx);
        const next = Math.max(0, Math.min(totalPoints - windowSize, panWsRef.current + shift));
        setWindowStart(next);
      }
      // state 5 (END): windowStart is already set
    },
    [windowStart, windowSize, chartW, totalPoints]
  );

  const onPinch = useCallback(
    (e: PinchGestureHandlerGestureEvent) => {
      const { state, scale } = e.nativeEvent;
      if (state === 2) {
        pinchStartRef.current = windowSize;
      } else if (state === 4) {
        // pinch-out: scale > 1 → fewer points (zoom in)
        const newN = Math.max(MIN_VISIBLE, Math.min(totalPoints, Math.round(pinchStartRef.current / scale)));
        const center = windowStart + windowSize / 2;
        let start = Math.round(center - newN / 2);
        start = Math.max(0, Math.min(totalPoints - newN, start));
        setWindowSize(newN);
        setWindowStart(start);
      }
    },
    [windowStart, windowSize, totalPoints]
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

  /* ── refs for nested handlers ─────────────────────────── */

  const pinchRef = useRef(null);
  const panRef = useRef(null);

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

        {/* Pinch → Pan → SVG */}
        <PinchGestureHandler
          ref={pinchRef}
          onGestureEvent={onPinch}
          simultaneousHandlers={panRef}
        >
          <PanGestureHandler
            ref={panRef}
            onGestureEvent={onPan}
            simultaneousHandlers={pinchRef}
            minDist={8}
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

                {/* Grid lines */}
                {yLabels.map((item, i) => (
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
              </Svg>
            </View>
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
