import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { rangeShape } from '../../domain/goals/range';
import { MetricKey, PeriodSummary } from '../../domain/statistics/types';
import { useI18n } from '../../i18n';
import { radius, spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { metricFormatter, METRIC_UNIT_KEYS } from './labels';

interface Props {
  summary: PeriodSummary;
  metric: MetricKey;
  /** Shown instead of an average when no day of the period has complete data for the metric. */
  incompleteNote: string | null;
}

interface RowProps {
  label: string;
  value: string;
  note?: string | null;
}

function Row({ label, value, note }: RowProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${value}${note ? `. ${note}` : ''}`}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.valueBlock}>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{value}</Text>
        {note ? <Text style={[styles.note, { color: colors.textSecondary }]}>{note}</Text> : null}
      </View>
    </View>
  );
}

/**
 * Compact period statistics. Every figure comes from the domain summary, which already excludes
 * today, empty days, future days and incomplete macro days — nothing here fills a gap with zero.
 */
export function StatisticsSummary({ summary, metric, incompleteNote }: Props) {
  const { colors } = useTheme();
  const { t, tn, shortDate } = useI18n();
  const format = metricFormatter(metric);
  const unit = t(METRIC_UNIT_KEYS[metric]);
  const withUnit = (value: number) => `${format(value)} ${unit}`;
  const none = t('range.none');

  const goalShape = rangeShape({ minimum: summary.averageMinimum, maximum: summary.averageMaximum }, format);
  const onlyOneDay = summary.averageDays === 1;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t('stats.summaryTitle')}</Text>
      <Row
        label={t('stats.average')}
        value={summary.averageValue === null ? none : withUnit(summary.averageValue)}
        note={incompleteNote ?? (summary.averageDays > 0 ? tn('stats.averageFromDays', summary.averageDays) : null)}
      />
      <Row label={t('stats.averageGoal')} value={`${t(`range.${goalShape.key}`, goalShape.params)}${goalShape.key === 'none' ? '' : ` ${unit}`}`} />
      <Row label={t('stats.coverage')} value={t('stats.coverageValue', { logged: summary.loggedDays, total: summary.coverageDays })} />
      <Row
        label={t('stats.assessed')}
        value={
          summary.assessedDays === 0
            ? none
            : t('stats.countsValue', { below: summary.counts.below, normal: summary.counts.normal, above: summary.counts.above })
        }
        note={summary.assessedDays === 0 ? t('stats.noAssessed') : null}
      />
      <Row
        label={t('stats.highest')}
        value={summary.highest === null ? none : `${withUnit(summary.highest.value)} · ${shortDate(summary.highest.date)}`}
        note={onlyOneDay ? t('stats.onlyCompleteDay') : null}
      />
      {/* With a single eligible day the same date is both extremes, so it is presented only once. */}
      {onlyOneDay ? null : (
        <Row
          label={t('stats.lowest')}
          value={summary.lowest === null ? none : `${withUnit(summary.lowest.value)} · ${shortDate(summary.lowest.date)}`}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: { ...typography.bodyStrong, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing.xs, gap: spacing.md },
  label: { ...typography.secondary, flex: 1 },
  valueBlock: { flex: 1.4, alignItems: 'flex-end' },
  value: { ...typography.bodyStrong, textAlign: 'right' },
  note: { ...typography.label, textAlign: 'right', marginTop: 2 },
});
