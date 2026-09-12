import React, { useMemo, useRef, useState } from 'react';
import { AccessibilityActionEvent, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { dayOfMonth, formatWeekdayShort } from '../../domain/dates';
import { axisTicks, chartScaleMax } from '../../domain/statistics/calculations';
import { PeriodKind } from '../../domain/statistics/periods';
import { DayStatistic, MetricKey } from '../../domain/statistics/types';
import { useI18n } from '../../i18n';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { LEGEND_STATUSES, metricFormatter, METRIC_UNIT_KEYS, statusColor, STATUS_LABEL_KEYS } from './labels';

/** Plot height in dp; the chart adapts to the available width rather than to a device size. */
const PLOT_HEIGHT = 200;
/** Gutter reserved for the value labels, narrow enough to leave a month its 31 columns. */
const AXIS_WIDTH = 34;
const ZERO_BAR_HEIGHT = 2;
/** Month columns are far narrower than their labels, so a label overflows into its blank neighbours. */
const MONTH_LABEL_WIDTH = 32;

interface Props {
  days: readonly DayStatistic[];
  kind: PeriodKind;
  metric: MetricKey;
  selectedDate: string | null;
  onSelect: (date: string) => void;
  onOpenDetails: (date: string) => void;
  /** Accessible description of the whole chart. */
  summaryLabel: string;
}

/** Month labels are thinned out so 28–31 of them never overlap. */
function monthLabelFor(day: number, lastDay: number): string | null {
  if (day === 1 || day === lastDay) return String(day);
  if (day % 5 === 0 && day + 2 <= lastDay) return String(day);
  return null;
}

/**
 * Daily columns with the historical goal boundaries drawn over them. Everything is laid out from
 * the measured width, so the whole period always fits without horizontal scrolling. Aggregation
 * and classification happen in the domain layer; this component only maps numbers to rectangles.
 */
export function StatisticsChart({ days, kind, metric, selectedDate, onSelect, onOpenDetails, summaryLabel }: Props) {
  const { colors } = useTheme();
  const { t, dateNames, longDate } = useI18n();
  const [width, setWidth] = useState(0);
  /** X of the last real touch; absent for a screen-reader activation, which uses the selection. */
  const touchX = useRef<number | null>(null);

  const scaleMax = useMemo(() => chartScaleMax(days, metric), [days, metric]);
  const ticks = useMemo(() => axisTicks(metric, scaleMax), [metric, scaleMax]);
  const format = metricFormatter(metric);
  const unit = t(METRIC_UNIT_KEYS[metric]);

  const slot = days.length > 0 ? width / days.length : 0;
  const gap = kind === 'week' ? spacing.sm : 2;
  const barWidth = Math.max(3, slot - gap);
  const toY = (value: number) => Math.min(PLOT_HEIGHT, (value / scaleMax) * PLOT_HEIGHT);

  /** The last date that can be inspected: future positions are shown but not selectable. */
  const lastSelectable = days.reduce((last, day, index) => (day.isFuture ? last : index), 0);
  const selectedIndex = days.findIndex((day) => day.date === selectedDate);

  const indexAt = (x: number) => {
    if (slot <= 0) return 0;
    return Math.max(0, Math.min(lastSelectable, Math.floor(x / slot)));
  };

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  const press = () => {
    const x = touchX.current;
    touchX.current = null;
    const index = x === null ? (selectedIndex >= 0 ? selectedIndex : lastSelectable) : indexAt(x);
    const day = days[index];
    if (!day) return;
    onSelect(day.date);
    onOpenDetails(day.date);
  };

  /** Screen readers step through the days with increment/decrement before activating one. */
  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    const from = selectedIndex >= 0 ? selectedIndex : lastSelectable;
    const next = event.nativeEvent.actionName === 'increment' ? from + 1 : from - 1;
    const clamped = Math.max(0, Math.min(lastSelectable, next));
    const day = days[clamped];
    if (day) onSelect(day.date);
  };

  const selected = selectedIndex >= 0 ? days[selectedIndex] : null;
  const selectedText = selected
    ? t('stats.dayA11y', {
        date: longDate(selected.date),
        value: selected.value === null ? t('range.none') : `${format(selected.value)} ${unit}`,
        status: t(STATUS_LABEL_KEYS[selected.status]),
      })
    : '';

  const lastDay = days.length > 0 ? dayOfMonth(days[days.length - 1].date) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.plotRow}>
        {/* Fixed gridline values, so the same intake sits at the same height in every period. */}
        <View style={[styles.axis, { height: PLOT_HEIGHT }]} importantForAccessibility="no-hide-descendants">
          {ticks.map((tick) => (
            <Text key={tick} style={[styles.axisLabel, { color: colors.textSecondary, bottom: toY(tick) - 7 }]} numberOfLines={1}>
              {format(tick)}
            </Text>
          ))}
        </View>
        <View style={[styles.plot, { height: PLOT_HEIGHT, borderBottomColor: colors.statisticsGrid }]} onLayout={onLayout}>
          {ticks.map((tick) => (
            <View key={`grid-${tick}`} pointerEvents="none" style={[styles.gridLine, { bottom: toY(tick), backgroundColor: colors.statisticsGrid }]} />
          ))}
          {width > 0
          ? days.map((day, index) => {
              const x = index * slot;
              const { minimum, maximum } = day.goal;
              const minY = minimum !== null ? toY(minimum) : null;
              const maxY = maximum !== null ? toY(maximum) : null;
              return (
                <React.Fragment key={`goal-${day.date}`}>
                  {minY !== null && maxY !== null ? (
                    <View
                      pointerEvents="none"
                      style={[
                        styles.band,
                        { left: x, width: slot, bottom: minY, height: Math.max(0, maxY - minY), backgroundColor: colors.statisticsGoalBand },
                      ]}
                    />
                  ) : null}
                  {minY !== null ? (
                    <View pointerEvents="none" style={[styles.goalLine, { left: x, width: slot, bottom: minY, backgroundColor: colors.statisticsGoalLine }]} />
                  ) : null}
                  {maxY !== null ? (
                    <View pointerEvents="none" style={[styles.goalLine, { left: x, width: slot, bottom: maxY, backgroundColor: colors.statisticsGoalLine }]} />
                  ) : null}
                </React.Fragment>
              );
            })
          : null}

        {width > 0
          ? days.map((day, index) => {
              // No data and future dates get no bar at all; an empty day is not a zero-height bar.
              const color = statusColor(day.status, colors);
              if (color === null || day.value === null) return null;
              // A logged day that really adds up to zero keeps a visible stub; an empty day has none.
              const height = Math.max(ZERO_BAR_HEIGHT, toY(day.value));
              return (
                <View
                  key={`bar-${day.date}`}
                  pointerEvents="none"
                  style={[styles.bar, { left: index * slot + (slot - barWidth) / 2, width: barWidth, height, backgroundColor: color }]}
                />
              );
            })
          : null}

        {width > 0 && selectedIndex >= 0 ? (
          <View
            pointerEvents="none"
            style={[styles.selection, { left: selectedIndex * slot, width: slot, borderColor: colors.textPrimary }]}
          />
        ) : null}

          <Pressable
            style={StyleSheet.absoluteFill}
            onTouchStart={(event) => {
              touchX.current = event.nativeEvent.locationX;
            }}
            onPress={press}
            accessibilityRole="adjustable"
            accessibilityLabel={summaryLabel}
            accessibilityValue={{ text: selectedText }}
            accessibilityHint={t('stats.chartHint')}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={onAccessibilityAction}
          />
        </View>
      </View>

      <View style={[styles.labels, { marginLeft: AXIS_WIDTH }]}>
        {days.map((day, index) => {
          const text = kind === 'week' ? formatWeekdayShort(day.date, dateNames) : monthLabelFor(dayOfMonth(day.date), lastDay);
          const isSelected = day.date === selectedDate;
          return (
            <View key={`label-${day.date}`} style={[styles.labelSlot, { width: slot || undefined, flex: slot ? undefined : 1 }]}>
              {/* A small marker, not colour, is what says "today is still in progress". */}
              {day.isToday ? <View style={[styles.todayDot, { backgroundColor: colors.textSecondary }]} /> : <View style={styles.todayDot} />}
              {text ? (
                <Text
                  numberOfLines={1}
                  style={[
                    styles.label,
                    kind === 'month' ? styles.monthLabel : null,
                    { color: day.isFuture ? colors.disabled : isSelected ? colors.textPrimary : colors.textSecondary },
                    isSelected || day.isToday ? styles.labelStrong : null,
                  ]}
                >
                  {text}
                </Text>
              ) : null}
              {kind === 'week' ? (
                <Pressable
                  style={StyleSheet.absoluteFill}
                  disabled={day.isFuture}
                  onPress={() => {
                    onSelect(day.date);
                    onOpenDetails(day.date);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected, disabled: day.isFuture }}
                  accessibilityLabel={t('stats.dayA11y', {
                    date: longDate(day.date),
                    value: day.value === null ? t('range.none') : `${format(day.value)} ${unit}`,
                    status: t(STATUS_LABEL_KEYS[day.status]),
                  })}
                  hitSlop={{ top: 8, bottom: 14 }}
                />
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** Visible key to the bar colours, so colour is never the only carrier of meaning. */
export function StatisticsLegend() {
  const { colors } = useTheme();
  const { t } = useI18n();
  return (
    <View style={styles.legend} accessibilityRole="list" accessibilityLabel={t('stats.legend')}>
      {LEGEND_STATUSES.map((status) => (
        <View key={status} style={styles.legendItem} accessible accessibilityLabel={t(STATUS_LABEL_KEYS[status])}>
          <View style={[styles.legendSwatch, { backgroundColor: statusColor(status, colors) ?? colors.disabled }]} />
          <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>{t(STATUS_LABEL_KEYS[status])}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.lg },
  plotRow: { flexDirection: 'row' },
  axis: { width: AXIS_WIDTH, position: 'relative' },
  axisLabel: { ...typography.label, position: 'absolute', right: spacing.xs, textAlign: 'right' },
  gridLine: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendSwatch: { width: 10, height: 10, borderRadius: 2 },
  legendLabel: { ...typography.label },
  plot: { flex: 1, position: 'relative', borderBottomWidth: StyleSheet.hairlineWidth },
  band: { position: 'absolute' },
  goalLine: { position: 'absolute', height: 1 },
  bar: { position: 'absolute', bottom: 0, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  selection: { position: 'absolute', top: -2, bottom: -2, borderWidth: 2, borderRadius: 4 },
  labels: { flexDirection: 'row', marginTop: spacing.xs, minHeight: 30 },
  labelSlot: { alignItems: 'center' },
  todayDot: { width: 4, height: 4, borderRadius: 2, marginBottom: 2 },
  label: { ...typography.label, textAlign: 'center' },
  monthLabel: { width: MONTH_LABEL_WIDTH },
  labelStrong: { fontWeight: '700' },
});
