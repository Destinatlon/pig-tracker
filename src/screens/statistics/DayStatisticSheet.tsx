import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { rangeShape } from '../../domain/goals/range';
import { DayStatistic, MetricKey } from '../../domain/statistics/types';
import { useI18n } from '../../i18n';
import { spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';
import { metricFormatter, METRIC_LABEL_KEYS, METRIC_UNIT_KEYS, statusColor, STATUS_LABEL_KEYS } from './labels';

interface Props {
  day: DayStatistic;
  metric: MetricKey;
  onClose: () => void;
  /** Closes the popup and opens the existing Day screen on this exact date. */
  onOpenDay: (date: string) => void;
}

/** Compact details for one charted date, including why a value may not be a complete total. */
export function DayStatisticSheet({ day, metric, onClose, onOpenDay }: Props) {
  const { colors } = useTheme();
  const { t, tn, longDate } = useI18n();
  const format = metricFormatter(metric);
  const unit = t(METRIC_UNIT_KEYS[metric]);
  const metricName = t(METRIC_LABEL_KEYS[metric]);
  const goal = rangeShape(day.goal, format);
  const status = t(STATUS_LABEL_KEYS[day.status]);
  const value = day.value === null ? t('range.none') : `${format(day.value)} ${unit}`;

  return (
    <BottomSheet
      visible
      onRequestClose={onClose}
      title={longDate(day.date)}
      footer={
        <>
          <Button title={t('common.close')} variant="secondary" onPress={onClose} style={styles.footerButton} />
          <Button title={t('stats.openFullDay')} onPress={() => onOpenDay(day.date)} style={styles.footerButton} />
        </>
      }
    >
      {day.isToday ? <Text style={[styles.progress, { color: colors.textSecondary }]}>{t('stats.inProgress')}</Text> : null}
      <View style={styles.row} accessible accessibilityLabel={`${metricName}, ${t('stats.intake')}: ${value}${day.isToday ? `, ${t('stats.soFar')}` : ''}`}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {t('stats.intake')}
          {day.isToday ? ` (${t('stats.soFar')})` : ''}
        </Text>
        <Text style={[styles.value, { color: colors.textPrimary }]}>{value}</Text>
      </View>
      <View
        style={styles.row}
        accessible
        accessibilityLabel={`${t('stats.goalLabel')}: ${t(`range.${goal.key}A11y`, goal.params)}${goal.key === 'none' ? '' : ` ${unit}`}`}
      >
        <Text style={[styles.label, { color: colors.textSecondary }]}>{t('stats.goalLabel')}</Text>
        <Text style={[styles.value, { color: colors.textPrimary }]}>
          {t(`range.${goal.key}`, goal.params)}
          {goal.key === 'none' ? '' : ` ${unit}`}
        </Text>
      </View>
      <View style={styles.statusRow} accessible accessibilityLabel={status}>
        <View style={[styles.statusDot, { backgroundColor: statusColor(day.status, colors) ?? colors.disabled }]} />
        <Text style={[styles.statusText, { color: colors.textPrimary }]}>{status}</Text>
      </View>
      {day.status === 'incomplete' ? (
        <Text style={[styles.explain, { color: colors.textSecondary }]}>
          {tn('stats.incompleteEntries', day.missingEntries, { macro: metricName })}
        </Text>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  progress: { ...typography.secondary, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, gap: spacing.md },
  label: { ...typography.body },
  value: { ...typography.bodyStrong, flexShrink: 1, textAlign: 'right' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusText: { ...typography.bodyStrong, flexShrink: 1 },
  explain: { ...typography.secondary, marginTop: spacing.xs },
  footerButton: { flex: 1 },
});
