import { Category, DayEntry, GoalSettings, LibraryItem } from '../../domain/models';

export interface CategoryRow {
  id: number;
  name: string;
  sort_order: number;
  is_system: number;
  created_at: string;
  updated_at: string;
}

export function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    isSystem: row.is_system === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface LibraryItemRow {
  variant_id: number;
  variant_name: string;
  is_default: number;
  product_id: number;
  product_name: string;
  category_id: number;
  category_name: string;
  calories_per_100g: number;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
}

export function mapLibraryItem(row: LibraryItemRow): LibraryItem {
  return {
    variantId: row.variant_id,
    variantName: row.variant_name,
    isDefault: row.is_default === 1,
    productId: row.product_id,
    productName: row.product_name,
    categoryId: row.category_id,
    categoryName: row.category_name,
    caloriesPer100g: row.calories_per_100g,
    proteinPer100g: row.protein_per_100g,
    carbsPer100g: row.carbs_per_100g,
    fatPer100g: row.fat_per_100g,
  };
}

export interface DayEntryRow {
  id: number;
  date: string;
  sort_order: number;
  product_id: number | null;
  variant_id: number | null;
  product_name: string;
  variant_name: string | null;
  weight_grams: number;
  calories_per_100g: number;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
  created_at: string;
  updated_at: string;
}

export function mapDayEntry(row: DayEntryRow): DayEntry {
  return {
    id: row.id,
    date: row.date,
    sortOrder: row.sort_order,
    productId: row.product_id,
    variantId: row.variant_id,
    productName: row.product_name,
    variantName: row.variant_name,
    weightGrams: row.weight_grams,
    caloriesPer100g: row.calories_per_100g,
    proteinPer100g: row.protein_per_100g,
    carbsPer100g: row.carbs_per_100g,
    fatPer100g: row.fat_per_100g,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface GoalRow {
  id: number;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  effective_from: string;
  created_at: string;
}

export function mapGoal(row: GoalRow): GoalSettings {
  return {
    id: row.id,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    effectiveFrom: row.effective_from,
    createdAt: row.created_at,
  };
}
