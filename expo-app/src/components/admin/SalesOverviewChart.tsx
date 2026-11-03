import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  LayoutChangeEvent,
  ActivityIndicator,
} from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Circle,
  Line,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';

export type ChartPeriod = 'today' | '7d' | '30d' | 'year';

interface DataPoint {
  date: string;
  label: string;
  revenue: number;
  orders: number;
}

interface PeriodSummary {
  period: string;
  currentRevenue: number;
  previousRevenue: number;
  growthPercentage: number;
  totalOrders: number;
  avgOrderValue: number;
  peak: DataPoint;
}

interface SalesOverviewChartProps {
  orders?: any[];
  onNavigate?: (view: any) => void;
  initialPeriod?: ChartPeriod;
}

const PERIOD_TABS: { id: ChartPeriod; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: 'year', label: '1 Year' },
];

/**
 * Format numbers into clean Indian currency notations (e.g. ₹24K, ₹1.5L, ₹12,400)
 */
function formatCurrency(val: number): string {
  if (val >= 10000000) {
    return `₹${(val / 10000000).toFixed(1)}Cr`;
  }
  if (val >= 100000) {
    return `₹${(val / 100000).toFixed(1)}L`;
  }
  if (val >= 1000) {
    return `₹${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}K`;
  }
  return `₹${val.toLocaleString('en-IN')}`;
}

function formatFullCurrency(val: number): string {
  return `₹${Math.round(val).toLocaleString('en-IN')}`;
}

export const SalesOverviewChart: React.FC<SalesOverviewChartProps> = ({
  orders = [],
  onNavigate,
  initialPeriod = '7d',
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<ChartPeriod>(initialPeriod);
  const [serverTrend, setServerTrend] = useState<DataPoint[] | null>(null);
  const [serverSummary, setServerSummary] = useState<PeriodSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [chartWidth, setChartWidth] = useState(300);

  // Floating Micro-animation for tooltip
  const tooltipFloatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(tooltipFloatAnim, {
          toValue: -4,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(tooltipFloatAnim, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    floatLoop.start();
    return () => floatLoop.stop();
  }, [tooltipFloatAnim]);

  // Fetch real-time analytics from backend
  const fetchTrend = useCallback(async (p: ChartPeriod) => {
    setLoading(true);
    try {
      const res = await api.analytics.getRealtime(p);
      if (res && res.salesTrend) {
        setServerTrend(res.salesTrend);
        if (res.periodSummary) {
          setServerSummary(res.periodSummary as PeriodSummary);
        }
        setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
      }
    } catch {
      // Offline fallback: will dynamically calculate from orders prop below
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrend(selectedPeriod);
  }, [selectedPeriod, fetchTrend]);

  // Compute live client-side data from orders array when server data is not available or before it loads
  const computedData = useMemo(() => {
    const now = new Date();
    const isRev = (o: any) =>
      o.status !== 'cancelled' &&
      o.status !== 'failed' &&
      o.payment_status !== 'failed' &&
      o.payment_status !== 'refunded';

    const getAmount = (o: any) => Number(o.subtotal || o.total_amount || o.total || 0);

    const trend: DataPoint[] = [];
    let prevRev = 0;

    if (selectedPeriod === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      for (let b = 0; b < 8; b++) {
        const bStart = new Date(startOfDay.getTime() + b * 3 * 3600 * 1000);
        const bEnd = new Date(startOfDay.getTime() + (b + 1) * 3 * 3600 * 1000 - 1);
        const hour = b * 3;
        const hourLabel = hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`;

        const bOrders = orders.filter((o) => {
          const d = new Date(o.created_at || o.createdAt || 0);
          return d >= bStart && d <= bEnd;
        });
        const rev = bOrders.filter(isRev).reduce((sum, o) => sum + getAmount(o), 0);

        trend.push({
          date: bStart.toISOString(),
          label: hourLabel,
          revenue: rev,
          orders: bOrders.length,
        });
      }

      const startOfYesterday = new Date(startOfDay.getTime() - 24 * 3600 * 1000);
      const endOfYesterday = new Date(startOfDay.getTime() - 1);
      prevRev = orders
        .filter((o) => {
          const d = new Date(o.created_at || o.createdAt || 0);
          return d >= startOfYesterday && d <= endOfYesterday && isRev(o);
        })
        .reduce((sum, o) => sum + getAmount(o), 0);
    } else if (selectedPeriod === '30d') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
        const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

        const dayOrders = orders.filter((o) => {
          const od = new Date(o.created_at || o.createdAt || 0);
          return od >= dayStart && od <= dayEnd;
        });
        const rev = dayOrders.filter(isRev).reduce((sum, o) => sum + getAmount(o), 0);

        trend.push({
          date: dayStart.toISOString().split('T')[0],
          label: `${d.getDate()} ${d.toLocaleDateString('en-IN', { month: 'short' })}`,
          revenue: rev,
          orders: dayOrders.length,
        });
      }

      const p30Start = new Date(now.getTime() - 60 * 24 * 3600 * 1000);
      const p30End = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
      prevRev = orders
        .filter((o) => {
          const d = new Date(o.created_at || o.createdAt || 0);
          return d >= p30Start && d <= p30End && isRev(o);
        })
        .reduce((sum, o) => sum + getAmount(o), 0);
    } else if (selectedPeriod === 'year') {
      for (let m = 11; m >= 0; m--) {
        const mStart = new Date(now.getFullYear(), now.getMonth() - m, 1, 0, 0, 0, 0);
        const mEnd = new Date(now.getFullYear(), now.getMonth() - m + 1, 0, 23, 59, 59, 999);

        const mOrders = orders.filter((o) => {
          const d = new Date(o.created_at || o.createdAt || 0);
          return d >= mStart && d <= mEnd;
        });
        const rev = mOrders.filter(isRev).reduce((sum, o) => sum + getAmount(o), 0);

        trend.push({
          date: mStart.toISOString().slice(0, 7),
          label: mStart.toLocaleDateString('en-IN', { month: 'short' }),
          revenue: rev,
          orders: mOrders.length,
        });
      }

      const pYearStart = new Date(now.getFullYear() - 1, 0, 1);
      const pYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      prevRev = orders
        .filter((o) => {
          const d = new Date(o.created_at || o.createdAt || 0);
          return d >= pYearStart && d <= pYearEnd && isRev(o);
        })
        .reduce((sum, o) => sum + getAmount(o), 0);
    } else {
      // 7 Days
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
        const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

        const dayOrders = orders.filter((o) => {
          const od = new Date(o.created_at || o.createdAt || 0);
          return od >= dayStart && od <= dayEnd;
        });
        const rev = dayOrders.filter(isRev).reduce((sum, o) => sum + getAmount(o), 0);

        trend.push({
          date: dayStart.toISOString().split('T')[0],
          label: `${d.toLocaleDateString('en-IN', { weekday: 'short' })} ${d.getDate()}`,
          revenue: rev,
          orders: dayOrders.length,
        });
      }

      const p7Start = new Date(now.getTime() - 14 * 24 * 3600 * 1000);
      const p7End = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
      prevRev = orders
        .filter((o) => {
          const d = new Date(o.created_at || o.createdAt || 0);
          return d >= p7Start && d <= p7End && isRev(o);
        })
        .reduce((sum, o) => sum + getAmount(o), 0);
    }

    const currentRevenue = trend.reduce((sum, pt) => sum + pt.revenue, 0);
    const totalOrders = trend.reduce((sum, pt) => sum + pt.orders, 0);
    const growthPercentage =
      prevRev > 0
        ? Math.round(((currentRevenue - prevRev) / prevRev) * 1000) / 10
        : currentRevenue > 0
        ? 100
        : 0;

    let peak = trend[0] || { date: '', label: '', revenue: 0, orders: 0 };
    trend.forEach((pt) => {
      if (pt.revenue > peak.revenue) {
        peak = pt;
      }
    });

    const summary: PeriodSummary = {
      period: selectedPeriod,
      currentRevenue,
      previousRevenue: prevRev,
      growthPercentage,
      totalOrders,
      avgOrderValue: totalOrders > 0 ? Math.round(currentRevenue / totalOrders) : 0,
      peak,
    };

    return { trend, summary };
  }, [orders, selectedPeriod]);

  // Prefer server analytics when available, else fallback to client computed
  const activeTrend: DataPoint[] = serverTrend && serverTrend.length > 0 ? serverTrend : computedData.trend;
  const activeSummary: PeriodSummary = serverSummary || computedData.summary;

  // Find Peak Index
  const peakIndex = useMemo(() => {
    if (!activeTrend || activeTrend.length === 0) return 0;
    let maxIdx = 0;
    let maxRev = -1;
    activeTrend.forEach((pt, idx) => {
      if (pt.revenue > maxRev) {
        maxRev = pt.revenue;
        maxIdx = idx;
      }
    });
    return maxIdx;
  }, [activeTrend]);

  // Current active data point (user tapped or defaults to peak)
  const activeIndex = selectedIndex !== null ? selectedIndex : peakIndex;
  const activePoint: DataPoint | undefined = activeTrend[activeIndex] || activeTrend[0];

  // SVG Chart Geometry Calculations
  const chartHeight = 150;
  const paddingLeft = 38;
  const paddingRight = 16;
  const paddingTop = 26;
  const paddingBottom = 24;

  const innerWidth = Math.max(chartWidth - paddingLeft - paddingRight, 100);
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  // Max value calculation for Y-scale
  const rawMax = Math.max(...activeTrend.map((p) => p.revenue), 0);
  const yMax = useMemo(() => {
    if (rawMax <= 0) return 10000;
    // Round up nicely to clean numbers
    if (rawMax <= 10000) return 10000;
    if (rawMax <= 25000) return 25000;
    if (rawMax <= 50000) return 50000;
    if (rawMax <= 100000) return 100000;
    if (rawMax <= 200000) return 200000;
    if (rawMax <= 500000) return 500000;
    return Math.ceil(rawMax / 100000) * 100000;
  }, [rawMax]);

  const yGuides = [
    { label: formatCurrency(yMax), y: paddingTop },
    { label: formatCurrency(Math.round((yMax * 2) / 3)), y: paddingTop + innerHeight / 3 },
    { label: formatCurrency(Math.round(yMax / 3)), y: paddingTop + (innerHeight * 2) / 3 },
    { label: '0', y: paddingTop + innerHeight },
  ];

  // Map data points to coordinates
  const coords = useMemo(() => {
    const totalPoints = activeTrend.length;
    if (totalPoints === 0) return [];

    return activeTrend.map((pt, i) => {
      const x = totalPoints === 1
        ? paddingLeft + innerWidth / 2
        : paddingLeft + (i / (totalPoints - 1)) * innerWidth;
      const ratio = yMax > 0 ? pt.revenue / yMax : 0;
      const clampedRatio = Math.min(Math.max(ratio, 0), 1);
      const y = paddingTop + innerHeight * (1 - clampedRatio);
      return { x, y, pt, i };
    });
  }, [activeTrend, innerWidth, innerHeight, yMax]);

  // Construct smooth Bezier SVG Path
  const { pathD, areaD } = useMemo(() => {
    if (coords.length === 0) return { pathD: '', areaD: '' };
    if (coords.length === 1) {
      const p = coords[0];
      return {
        pathD: `M ${p.x - 10} ${p.y} L ${p.x + 10} ${p.y}`,
        areaD: `M ${p.x - 10} ${p.y} L ${p.x + 10} ${p.y} L ${p.x + 10} ${paddingTop + innerHeight} L ${p.x - 10} ${paddingTop + innerHeight} Z`,
      };
    }

    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i === 0 ? i : i - 1];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[i + 2 < coords.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }

    const baselineY = paddingTop + innerHeight;
    const area = `${d} L ${coords[coords.length - 1].x} ${baselineY} L ${coords[0].x} ${baselineY} Z`;

    return { pathD: d, areaD: area };
  }, [coords, innerHeight]);

  // Visible X-axis labels (reduce clutter for 30d)
  const displayLabels = useMemo(() => {
    if (activeTrend.length <= 8) {
      return coords;
    }
    // Pick 5 evenly spaced markers for 30-day view
    const step = Math.floor((coords.length - 1) / 4);
    return [0, step, step * 2, step * 3, coords.length - 1].map((idx) => coords[idx]).filter(Boolean);
  }, [coords, activeTrend.length]);

  const activeCoord = coords[activeIndex];

  return (
    <View style={styles.cardContainer}>
      {/* 1. Header with Title & Action */}
      <View style={styles.cardHeaderRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={styles.headerIconDot} />
          <Text style={styles.cardSectionTitle}>Sales Overview</Text>
          {loading && <ActivityIndicator size="small" color="#168A4A" style={{ marginLeft: 4 }} />}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {lastUpdated ? (
            <Text style={styles.lastSyncText}>Live • {lastUpdated}</Text>
          ) : null}
          {onNavigate && (
            <TouchableOpacity onPress={() => onNavigate('analytics')} style={styles.cardLinkRow} activeOpacity={0.7}>
              <Text style={styles.cardLinkText}>See Details</Text>
              <Ionicons name="arrow-forward" size={12} color="#168A4A" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 2. Period Selector Tabs */}
      <View style={styles.periodTabsRow}>
        {PERIOD_TABS.map((tab) => {
          const isActive = selectedPeriod === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => {
                setSelectedPeriod(tab.id);
                setSelectedIndex(null);
              }}
              style={[styles.periodTabChip, isActive && styles.periodTabChipActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.periodTabChipText, isActive && styles.periodTabChipTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 3. Real-Time Dynamic KPI Highlights Bar */}
      <View style={styles.metricsSummaryRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.metricsRevLabel}>
            {selectedPeriod === 'today'
              ? "Today's GMV"
              : selectedPeriod === '7d'
              ? 'Past 7 Days Revenue'
              : selectedPeriod === '30d'
              ? 'Past 30 Days Revenue'
              : 'Past 12 Months Revenue'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
            <Text style={styles.metricsRevValue}>
              {formatFullCurrency(activeSummary.currentRevenue)}
            </Text>
            {activeSummary.growthPercentage !== 0 && (
              <View
                style={[
                  styles.growthBadge,
                  {
                    backgroundColor:
                      activeSummary.growthPercentage >= 0 ? 'rgba(22, 138, 74, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  },
                ]}
              >
                <Ionicons
                  name={activeSummary.growthPercentage >= 0 ? 'trending-up' : 'trending-down'}
                  size={12}
                  color={activeSummary.growthPercentage >= 0 ? '#168A4A' : '#EF4444'}
                />
                <Text
                  style={[
                    styles.growthBadgeText,
                    { color: activeSummary.growthPercentage >= 0 ? '#168A4A' : '#EF4444' },
                  ]}
                >
                  {activeSummary.growthPercentage >= 0 ? '+' : ''}
                  {activeSummary.growthPercentage}%
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.metricStatsRight}>
          <View style={styles.statMiniCol}>
            <Text style={styles.statMiniVal}>{activeSummary.totalOrders}</Text>
            <Text style={styles.statMiniLbl}>Orders</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statMiniCol}>
            <Text style={styles.statMiniVal}>{formatCurrency(activeSummary.avgOrderValue)}</Text>
            <Text style={styles.statMiniLbl}>AOV</Text>
          </View>
        </View>
      </View>

      {/* 4. Interactive Live SVG Chart Area */}
      <View
        style={styles.chartCanvasContainer}
        onLayout={(e: LayoutChangeEvent) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0 && Math.abs(w - chartWidth) > 5) {
            setChartWidth(w);
          }
        }}
      >
        {/* Y-Axis Guide Lines & Labels */}
        {yGuides.map((g, i) => (
          <View key={i} style={[styles.yGuideRow, { top: g.y - 8 }]}>
            <Text style={styles.yGuideText}>{g.label}</Text>
            <View style={styles.yGuideLine} />
          </View>
        ))}

        {/* SVG Drawing Layer */}
        {coords.length > 0 && (
          <Svg style={StyleSheet.absoluteFill} width={chartWidth} height={chartHeight}>
            <Defs>
              <LinearGradient id="renewxAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#168A4A" stopOpacity="0.28" />
                <Stop offset="0.75" stopColor="#168A4A" stopOpacity="0.05" />
                <Stop offset="1" stopColor="#168A4A" stopOpacity="0.0" />
              </LinearGradient>
            </Defs>

            {/* Gradient Area Underlay */}
            {rawMax > 0 && <Path d={areaD} fill="url(#renewxAreaGrad)" />}

            {/* Main Smooth Line Curve */}
            <Path
              d={pathD}
              fill="none"
              stroke="#168A4A"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Hairline guide for selected active point */}
            {activeCoord && (
              <Line
                x1={activeCoord.x}
                y1={paddingTop}
                x2={activeCoord.x}
                y2={paddingTop + innerHeight}
                stroke="#168A4A"
                strokeWidth="1"
                strokeDasharray="3, 3"
                opacity={0.45}
              />
            )}

            {/* Data Points / Circles */}
            {coords.map((c, idx) => {
              const isSelected = idx === activeIndex;
              const isPeak = idx === peakIndex && rawMax > 0;
              return (
                <Circle
                  key={idx}
                  cx={c.x}
                  cy={c.y}
                  r={isSelected ? 5.5 : isPeak ? 4 : 2.5}
                  fill={isSelected ? '#168A4A' : isPeak ? '#0F172A' : '#168A4A'}
                  stroke="#FFFFFF"
                  strokeWidth={isSelected ? 2 : 1.5}
                />
              );
            })}
          </Svg>
        )}

        {/* Floating Tooltip matching active or peak point */}
        {activeCoord && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.chartPeakTooltip,
              {
                left: Math.max(8, Math.min(activeCoord.x - 55, chartWidth - 118)),
                top: Math.max(0, activeCoord.y - 48),
                transform: [{ translateY: tooltipFloatAnim }],
              },
            ]}
          >
            <View style={styles.chartTooltipBubble}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.chartTooltipValue}>
                  {formatFullCurrency(activePoint?.revenue || 0)}
                </Text>
                {activeIndex === peakIndex && rawMax > 0 && (
                  <View style={styles.tooltipPeakChip}>
                    <Text style={styles.tooltipPeakChipText}>Peak</Text>
                  </View>
                )}
              </View>
              <Text style={styles.chartTooltipDate}>
                {activePoint?.label} • {activePoint?.orders || 0} {activePoint?.orders === 1 ? 'order' : 'orders'}
              </Text>
            </View>
            <View style={styles.chartTooltipArrow} />
          </Animated.View>
        )}

        {/* Transparent Touchable Scrubber Columns */}
        <View style={styles.touchColumnsWrap}>
          {coords.map((c, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => setSelectedIndex(idx)}
              style={styles.touchColumnCell}
              activeOpacity={0.9}
            />
          ))}
        </View>

        {/* X-Axis Date Labels Row */}
        <View style={styles.xAxisRow}>
          {displayLabels.map((lbl, idx) => (
            <Text
              key={idx}
              style={[
                styles.xAxisText,
                lbl.i === activeIndex && styles.xAxisTextActive,
              ]}
              numberOfLines={1}
            >
              {lbl.pt.label}
            </Text>
          ))}
        </View>
      </View>

      {/* 5. Zero-order notice for honesty if no orders in selected period */}
      {rawMax === 0 && (
        <View style={styles.zeroDataNotice}>
          <Ionicons name="information-circle-outline" size={13} color="#64748B" />
          <Text style={styles.zeroDataText}>
            No completed checkouts in this period. Showing live database ₹0 baseline.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerIconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#168A4A',
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  lastSyncText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#168A4A',
    backgroundColor: '#E8F7ED',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 10,
  },
  cardLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  cardLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#168A4A',
  },
  periodTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
    gap: 4,
  },
  periodTabChip: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  periodTabChipActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  periodTabChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  periodTabChipTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  metricsSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 6,
  },
  metricsRevLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricsRevValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  growthBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  metricStatsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statMiniCol: {
    alignItems: 'center',
  },
  statMiniVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  statMiniLbl: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#64748B',
  },
  statDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#CBD5E1',
  },
  chartCanvasContainer: {
    height: 175,
    position: 'relative',
    marginTop: 4,
  },
  yGuideRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  yGuideText: {
    width: 30,
    fontSize: 9.5,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'right',
  },
  yGuideLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  touchColumnsWrap: {
    position: 'absolute',
    left: 38,
    right: 16,
    top: 26,
    bottom: 24,
    flexDirection: 'row',
  },
  touchColumnCell: {
    flex: 1,
    height: '100%',
  },
  xAxisRow: {
    position: 'absolute',
    left: 38,
    right: 16,
    bottom: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xAxisText: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '600',
  },
  xAxisTextActive: {
    color: '#168A4A',
    fontWeight: '800',
  },
  chartPeakTooltip: {
    position: 'absolute',
    width: 110,
    alignItems: 'center',
    zIndex: 10,
  },
  chartTooltipBubble: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    minWidth: 90,
  },
  chartTooltipValue: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  tooltipPeakChip: {
    backgroundColor: '#168A4A',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  tooltipPeakChipText: {
    color: '#FFFFFF',
    fontSize: 7.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  chartTooltipDate: {
    color: '#94A3B8',
    fontSize: 8.5,
    fontWeight: '500',
    marginTop: 1,
  },
  chartTooltipArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#0F172A',
  },
  zeroDataNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 6,
  },
  zeroDataText: {
    fontSize: 10.5,
    color: '#64748B',
    flex: 1,
  },
});

export default SalesOverviewChart;

