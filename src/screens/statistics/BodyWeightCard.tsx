import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { formatWeight } from '../../domain/nutrition/format';
import { PeriodKind } from '../../domain/statistics/periods';
import { summarizeWeights, WeeklyWeightPoint, weeklyWeightPoints, weightPointBounds, WeightEntry } from '../../domain/weight/trend';
import { useI18n } from '../../i18n';
import { radius, spacing, typography } from '../../theme/tokens';
import { useTheme } from '../../theme/ThemeProvider';

/** Height of the weekly diagram; it only has to show a direction, not precise values. */
const DIAGRAM_HEIGHT = 90;
const POINT_SIZE = 8;

interface Props {
  entries: readonly WeightEntry[];
  kind: PeriodKind;
  onLogWeight: () => void;
}

/**
 * Body weight over the selected period: where it started, where it ended, and the difference.
 * A month additionally plots one point per week, which is the cadence the reminder asks for.
 */
export function BodyWeightCard({ entries, kind, onLogWeight }: Props) {
  const { colors } = useTheme();
  const { t, shortDate } = useI18n();
  const trend = useMemo(() => summarizeWeights(entries), [entries]);
  const points = useMemo(() => (kind === 'month' ? weeklyWeightPoints(entries) : []), [entries, kind]);
  const unit = t('weight.kg');

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('weight.title')}</Text>
        <Button title={t('weight.log')} variant="secondary" compact onPress={onLogWeight} />
      </View>

      {trend.count === 0 ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>{t('weight.empty')}</Text>
      ) : (
        <>
          <View style={styles.row}>
            <Figure label={t('weight.start')} value={`${formatWeight(trend.start?.weightKg)} ${unit}`} note={shortDate(trend.start!.date)} />
            <Figure label={t('weight.end')} value={`${formatWeight(trend.end?.weightKg)} ${unit}`} note={shortDate(trend.end!.date)} />
            <Figure
              label={t('weight.change')}
              value={trend.changeKg === null ? t('range.none') : `${trend.changeKg > 0 ? '+' : trend.changeKg < 0 ? '−' : ''}${formatWeight(Math.abs(trend.changeKg))} ${unit}`}
            />
          </View>
          {trend.changeKg === null ? <Text style={[styles.empty, { color: colors.textSecondary }]}>{t('weight.noChange')}</Text> : null}
          {kind === 'month' && points.length > 1 ? <WeeklyDiagram points={points} /> : null}
        </>
      )}
    </View>
  );
}

function Figure({ label, value, note }: { label: string; value: string; note?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.figure} accessible accessibilityLabel={`${label}: ${value}${note ? `, ${note}` : ''}`}>
      <Text style={[styles.figureLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.figureValue, { color: colors.textPrimary }]}>{value}</Text>
      {note ? <Text style={[styles.figureNote, { color: colors.textSecondary }]}>{note}</Text> : null}
    </View>
  );
}

/**
 * One point per week that has a weighing, joined by a line. The vertical scale spans only the
 * observed range, so small real changes stay visible; the figures above carry the numbers.
 */
function WeeklyDiagram({ points }: { points: readonly WeeklyWeightPoint[] }) {
  const { colors } = useTheme();
  const { t, shortDate } = useI18n();
  const [width, setWidth] = useState(0);
  const bounds = weightPointBounds(points);
  if (bounds === null) return null;

  const span = bounds.max - bounds.min;
  const usable = DIAGRAM_HEIGHT - POINT_SIZE;
  // A flat period would divide by zero; put its points on the middle line instead.
  const toY = (weightKg: number) => (span > 0 ? ((weightKg - bounds.min) / span) * usable : usable / 2);
  const step = points.length > 1 ? (width - POINT_SIZE) / (points.length - 1) : 0;
  const toX = (index: number) => index * step;

  return (
    <View style={styles.diagramBlock}>
      <Text style={[styles.figureLabel, { color: colors.textSecondary }]}>{t('weight.weeklyTitle')}</Text>
      <View
        style={[styles.diagram, { height: DIAGRAM_HEIGHT, borderBottomColor: colors.statisticsGrid }]}
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        accessible
        accessibilityLabel={
          `${t('weight.chartA11y', { count: points.length })} ` +
          points.map((point) => t('weight.pointA11y', { date: shortDate(point.weekStart), weight: formatWeight(point.weightKg) })).join('. ')
        }
      >
        {width > 0
          ? points.map((point, index) => {
              const next = points[index + 1];
              const x = toX(index);
              const y = toY(point.weightKg);
              return (
                <React.Fragment key={point.weekStart}>
                  {next ? <Segment fromX={x} fromY={y} toX={toX(index + 1)} toY={toY(next.weightKg)} color={colors.statisticsNormal} /> : null}
                  <View style={[styles.point, { left: x, bottom: y, backgroundColor: colors.statisticsNormal }]} />
                </React.Fragment>
              );
            })
          : null}
      </View>
      <View style={styles.diagramLabels}>
        <Text style={[styles.figureNote, { color: colors.textSecondary }]}>{shortDate(points[0].weekStart)}</Text>
        <Text style={[styles.figureNote, { color: colors.textSecondary }]}>{shortDate(points[points.length - 1].weekStart)}</Text>
      </View>
    </View>
  );
}

/** A straight line between two points, drawn as a rotated bar so no SVG dependency is needed. */
function Segment({ fromX, fromY, toX, toY, color }: { fromX: number; fromY: number; toX: number; toY: number; color: string }) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(-dy, dx);
  return (
    <View
      pointerEvents="none"
      style={[
        styles.segment,
        {
          left: fromX + POINT_SIZE / 2,
          bottom: fromY + POINT_SIZE / 2,
          width: length,
          backgroundColor: color,
          transform: [{ rotateZ: `${angle}rad` }],
        },
      ]}
    />
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.sm },
  title: { ...typography.bodyStrong, flexShrink: 1 },
  empty: { ...typography.secondary, marginTop: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.md },
  figure: { flex: 1 },
  figureLabel: { ...typography.label },
  figureValue: { ...typography.bodyStrong, marginTop: 2 },
  figureNote: { ...typography.label, marginTop: 2 },
  diagramBlock: { marginTop: spacing.md },
  diagram: { position: 'relative', marginTop: spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth },
  diagramLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  point: { position: 'absolute', width: POINT_SIZE, height: POINT_SIZE, borderRadius: POINT_SIZE / 2 },
  segment: { position: 'absolute', height: 2, transformOrigin: 'left center' },
});
