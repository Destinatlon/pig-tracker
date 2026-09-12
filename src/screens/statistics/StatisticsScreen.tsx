import { DrawerActions } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { EmptyState } from '../../components/EmptyState';
import { IconButton } from '../../components/IconButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SegmentTabs } from '../../components/SegmentTabs';
import { todayKey } from '../../domain/dates';
import { DateKey } from '../../domain/models';
import { canShowNext, Period, periodContaining, PeriodKind, selectableDateIn, shiftPeriod } from '../../domain/statistics/periods';
import { METRIC_KEYS, MetricKey } from '../../domain/statistics/types';
import { useI18n } from '../../i18n';
import { DrawerRouteProps } from '../../navigation/types';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { getLatestWeight, getWeightForDate } from '../../db/repositories/bodyWeightRepo';
import { useSnackbar } from '../../components/Snackbar';
import { BodyWeightCard } from './BodyWeightCard';
import { DayStatisticSheet } from './DayStatisticSheet';
import { LogWeightSheet } from './LogWeightSheet';
import { METRIC_LABEL_KEYS } from './labels';
import { StatisticsChart, StatisticsLegend } from './StatisticsChart';
import { StatisticsSummary } from './StatisticsSummary';
import { useStatistics } from './useStatistics';

/**
 * Week and month nutrition history. The screen owns the selected tab, metric, period and date;
 * every number it shows comes from `src/domain/statistics`, and all SQL stays in the repository.
 */
export function StatisticsScreen({ navigation }: DrawerRouteProps<'Statistics'>) {
  const { colors } = useTheme();
  const { t, shortDate, monthName } = useI18n();
  const snackbar = useSnackbar();
  const [today] = useState(todayKey);
  const [kind, setKind] = useState<PeriodKind>('week');
  const [metric, setMetric] = useState<MetricKey>('calories');
  const [period, setPeriod] = useState<Period>(() => periodContaining('week', today));
  const [selectedDate, setSelectedDate] = useState<DateKey>(today);
  const [detailDate, setDetailDate] = useState<DateKey | null>(null);
  /** Null while the weighing sheet is closed; it is opened only after today's value is read. */
  const [logging, setLogging] = useState<{ initialKg: number | null; existing: boolean } | null>(null);

  const { days, summary, weights, loading, error, reload } = useStatistics(period, metric, today);

  /** Prefills with today's weighing if there is one, otherwise the most recent one before it. */
  const openWeightSheet = useCallback(async () => {
    try {
      const own = await getWeightForDate(today);
      const latest = own ?? (await getLatestWeight(today));
      setLogging({ initialKg: latest?.weightKg ?? null, existing: own !== null });
    } catch (failure) {
      Alert.alert(t('weight.couldNotSave'), String(failure));
    }
  }, [today, t]);

  /** Switching tabs keeps the week/month containing the date the user was looking at. */
  const switchKind = useCallback(
    (next: PeriodKind) => {
      setKind(next);
      const nextPeriod = periodContaining(next, selectedDate);
      setPeriod(nextPeriod);
      setSelectedDate(selectableDateIn(nextPeriod, selectedDate, today));
    },
    [selectedDate, today],
  );

  const shift = useCallback(
    (delta: number) => {
      const next = shiftPeriod(period, delta);
      setPeriod(next);
      setSelectedDate(selectableDateIn(next, selectedDate, today));
      setDetailDate(null);
    },
    [period, selectedDate, today],
  );

  const periodLabel = useMemo(() => {
    if (period.kind === 'week') return t('stats.weekLabel', { start: shortDate(period.start), end: shortDate(period.end) });
    const { month, year } = monthName(period.start);
    return t('stats.monthLabel', { month, year });
  }, [period, t, shortDate, monthName]);

  const metricName = t(METRIC_LABEL_KEYS[metric]);
  const loggedDays = summary?.loggedDays ?? 0;
  const chartSummaryLabel = t('stats.chartA11y', {
    metric: metricName,
    period: periodLabel,
    logged: loggedDays,
    total: period.dates.length,
  });

  const detailDay = detailDate === null ? null : (days.find((day) => day.date === detailDate) ?? null);
  const openDay = useCallback(
    (date: DateKey) => {
      setDetailDate(null);
      navigation.navigate('Day', { date });
    },
    [navigation],
  );

  /** Nothing logged at all, so the period has no statistics to describe. */
  const emptyPeriod = !loading && error === null && days.length > 0 && days.every((day) => day.entryCount === 0);
  /** Logged days exist, but none of them is complete for the selected macro. */
  const macroIncomplete =
    summary !== null && summary.averageDays === 0 && days.some((day) => day.entryCount > 0 && !day.complete && !day.isFuture);
  const noGoalAnywhere = days.length > 0 && days.every((day) => day.goal.minimum === null && day.goal.maximum === null);
  const dayToOpen = period.dates.includes(today) ? today : period.start;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader
        left={<IconButton icon="menu" accessibilityLabel={t('common.openMenu')} onPress={() => navigation.dispatch(DrawerActions.openDrawer())} />}
        title={t('stats.title')}
        right={<View style={styles.rightSpacer} />}
        bottom={
          <SegmentTabs
            tabs={[
              { key: 'week', label: t('stats.tabWeek') },
              { key: 'month', label: t('stats.tabMonth') },
            ]}
            active={kind}
            onChange={switchKind}
          />
        }
      />

      <View style={[styles.periodRow, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
        <IconButton
          icon="chevron-left"
          accessibilityLabel={t(kind === 'week' ? 'stats.previousWeek' : 'stats.previousMonth')}
          onPress={() => shift(-1)}
        />
        <Text
          style={[styles.periodLabel, { color: colors.textPrimary }]}
          numberOfLines={2}
          accessibilityLabel={t('stats.periodA11y', { period: periodLabel })}
        >
          {periodLabel}
        </Text>
        <IconButton
          icon="chevron-right"
          accessibilityLabel={t(kind === 'week' ? 'stats.nextWeek' : 'stats.nextMonth')}
          onPress={() => shift(1)}
          disabled={!canShowNext(period, today)}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.metricRow} accessibilityRole="radiogroup" accessibilityLabel={t('stats.metricA11y')}>
          {METRIC_KEYS.map((key) => (
            <Chip key={key} label={t(METRIC_LABEL_KEYS[key])} selected={metric === key} onPress={() => setMetric(key)} />
          ))}
        </View>

        {error !== null ? (
          <EmptyState message={t('stats.loadFailed')}>
            <Button title={t('stats.retry')} onPress={reload} />
          </EmptyState>
        ) : (
          <>
            {/* The structure stays put while loading so the chart does not jump into place. */}
            <View style={styles.chartBlock}>
              <StatisticsChart
                days={days}
                kind={kind}
                metric={metric}
                selectedDate={selectedDate}
                onSelect={setSelectedDate}
                onOpenDetails={setDetailDate}
                summaryLabel={chartSummaryLabel}
              />
              <StatisticsLegend />
              {loading ? (
                <View style={styles.loading} accessibilityLabel={t('stats.loading')}>
                  <ActivityIndicator color={colors.accent} />
                </View>
              ) : null}
            </View>

            {emptyPeriod ? (
              <EmptyState message={t('stats.emptyPeriod')}>
                <Button title={t('stats.openDay', { date: shortDate(dayToOpen) })} onPress={() => openDay(dayToOpen)} />
              </EmptyState>
            ) : null}

            {noGoalAnywhere ? (
              <Text style={[styles.note, { color: colors.textSecondary }]}>{t('stats.noGoalMetric', { metric: metricName })}</Text>
            ) : null}

            {summary !== null && !emptyPeriod ? (
              <StatisticsSummary
                summary={summary}
                metric={metric}
                incompleteNote={macroIncomplete ? t('stats.noCompleteMacro', { macro: metricName }) : null}
              />
            ) : null}

            {error === null && !loading ? <BodyWeightCard entries={weights} kind={kind} onLogWeight={openWeightSheet} /> : null}
          </>
        )}
      </ScrollView>

      {detailDay ? (
        <DayStatisticSheet day={detailDay} metric={metric} onClose={() => setDetailDate(null)} onOpenDay={openDay} />
      ) : null}
      {logging ? (
        <LogWeightSheet
          date={today}
          initialKg={logging.initialKg}
          existing={logging.existing}
          onClose={() => setLogging(null)}
          onSaved={(message) => {
            setLogging(null);
            snackbar.show({ message });
            reload();
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  rightSpacer: { width: 48 },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  periodLabel: { ...typography.bodyStrong, flex: 1, textAlign: 'center' },
  content: { paddingBottom: spacing.xl },
  metricRow: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  chartBlock: { position: 'relative' },
  loading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  note: { ...typography.secondary, paddingHorizontal: spacing.lg, marginTop: spacing.md },
});
