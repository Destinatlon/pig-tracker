/** Calendar date key in local time, formatted as YYYY-MM-DD. */
export type DateKey = string;

export type MacroKey = 'protein' | 'carbs' | 'fat';
export const MACRO_KEYS: readonly MacroKey[] = ['protein', 'carbs', 'fat'];

export type ThemePreference = 'system' | 'light' | 'dark';

/** Reusable nutritional values, always normalized per 100 g. Unknown macros are null, never 0. */
export interface NutritionPer100g {
  caloriesPer100g: number;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
}

/** Nutrition actually consumed for a given weight. */
export interface ConsumedNutrition {
  consumedCalories: number;
  consumedProtein: number | null;
  consumedCarbs: number | null;
  consumedFat: number | null;
}

export interface Category {
  id: number;
  name: string;
  sortOrder: number;
  /** The internal `Uncategorized` category cannot be renamed or deleted. */
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: number;
  categoryId: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant extends NutritionPer100g {
  id: number;
  productId: number;
  /** Empty string for the hidden default variant. */
  name: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Flattened library row: one per variant, including the hidden default variant. */
export interface LibraryItem extends NutritionPer100g {
  variantId: number;
  variantName: string;
  isDefault: boolean;
  productId: number;
  productName: string;
  categoryId: number;
  categoryName: string;
}

/** A historical snapshot of something eaten on a date. Never recalculated from the library. */
export interface DayEntry extends NutritionPer100g {
  id: number;
  date: DateKey;
  sortOrder: number;
  productId: number | null;
  variantId: number | null;
  productName: string;
  variantName: string | null;
  weightGrams: number;
  createdAt: string;
  updatedAt: string;
}

export type NewDayEntry = Omit<DayEntry, 'id' | 'sortOrder' | 'createdAt' | 'updatedAt'>;

export interface GoalSettings {
  id: number;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  effectiveFrom: DateKey;
  createdAt: string;
}

export type GoalInput = Omit<GoalSettings, 'id' | 'effectiveFrom' | 'createdAt'>;

export interface ReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

export function entryDisplayName(entry: { productName: string; variantName: string | null }): string {
  return entry.variantName ? `${entry.productName} — ${entry.variantName}` : entry.productName;
}

export function libraryItemDisplayName(item: { productName: string; variantName: string; isDefault: boolean }): string {
  return item.isDefault || !item.variantName ? item.productName : `${item.productName} — ${item.variantName}`;
}
