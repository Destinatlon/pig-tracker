import { formatCalories, formatMacro } from '../../domain/nutrition/format';
import { ThemeColors } from '../../theme/tokens';
import { MetricKey, StatisticStatus } from '../../domain/statistics/types';
import type { TranslationKey } from '../../i18n/types';

export const METRIC_LABEL_KEYS: Record<MetricKey, TranslationKey> = {
  calories: 'field.calories',
  protein: 'macro.protein',
  carbs: 'macro.carbs',
  fat: 'macro.fat',
};

export const METRIC_UNIT_KEYS: Record<MetricKey, TranslationKey> = {
  calories: 'common.kcal',
  protein: 'common.grams',
  carbs: 'common.grams',
  fat: 'common.grams',
};

/** Text always accompanies the chart colours, so no status is carried by colour alone. */
export const STATUS_LABEL_KEYS: Record<StatisticStatus, TranslationKey> = {
  noData: 'stats.statusNoData',
  future: 'stats.statusFuture',
  incomplete: 'stats.statusIncomplete',
  noGoal: 'stats.statusNoGoal',
  below: 'stats.statusBelow',
  normal: 'stats.statusNormal',
  above: 'stats.statusAbove',
};

/** Calories are whole numbers; macros keep one decimal. Display rounding only. */
export function metricFormatter(metric: MetricKey): (value: number) => string {
  return metric === 'calories' ? formatCalories : formatMacro;
}

/**
 * The bar colour for a status, or null for the states that get no bar at all (no entries and
 * future dates). Colour never stands alone: a legend and the textual status accompany it.
 */
export function statusColor(status: StatisticStatus, colors: ThemeColors): string | null {
  switch (status) {
    case 'normal':
      return colors.statisticsNormal;
    case 'below':
      return colors.statisticsBelow;
    case 'above':
      return colors.statisticsAbove;
    case 'incomplete':
      return colors.statisticsIncomplete;
    case 'noGoal':
      return colors.statisticsNoGoal;
    default:
      return null;
  }
}

/** Statuses shown in the chart legend, in the order the specification lists them. */
export const LEGEND_STATUSES: readonly StatisticStatus[] = ['normal', 'below', 'above', 'incomplete', 'noGoal'];
