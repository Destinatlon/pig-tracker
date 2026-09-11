import { NutritionPer100g } from '../../domain/models';
import { formatCalories, formatMacro } from '../../domain/nutrition/format';

type Translate = (key: 'common.kcal' | 'macro.p' | 'macro.c' | 'macro.f' | 'common.unknownMacro') => string;

/** One-line per-100-g summary shared by the recipe list and the log sheet. */
export function per100gSummary(per100g: NutritionPer100g | null, t: Translate): string {
  if (per100g === null) return t('common.unknownMacro');
  return `${formatCalories(per100g.caloriesPer100g)} ${t('common.kcal')} · ${t('macro.p')} ${formatMacro(per100g.proteinPer100g)} · ${t('macro.c')} ${formatMacro(per100g.carbsPer100g)} · ${t('macro.f')} ${formatMacro(per100g.fatPer100g)}`;
}
