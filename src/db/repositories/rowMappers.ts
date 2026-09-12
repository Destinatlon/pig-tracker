import { Category, DayEntry, GoalSettings, LibraryItem, Recipe, RecipeIngredient } from '../../domain/models';

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
  protein_min: number | null;
  protein_max: number | null;
  carbs_min: number | null;
  carbs_max: number | null;
  fat_min: number | null;
  fat_max: number | null;
  effective_from: string;
  created_at: string;
}

export function mapGoal(row: GoalRow): GoalSettings {
  return {
    id: row.id,
    calories: row.calories,
    protein: { minimum: row.protein_min, maximum: row.protein_max },
    carbs: { minimum: row.carbs_min, maximum: row.carbs_max },
    fat: { minimum: row.fat_min, maximum: row.fat_max },
    effectiveFrom: row.effective_from,
    createdAt: row.created_at,
  };
}

export interface RecipeRow {
  id: number;
  name: string;
  description: string;
  cooked_weight_grams: number | null;
  macros_overridden: number;
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export function mapRecipe(row: RecipeRow): Recipe {
  const overridden = row.macros_overridden === 1;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    cookedWeightGrams: row.cooked_weight_grams,
    macrosOverridden: overridden,
    overridePer100g:
      overridden && row.calories_per_100g !== null
        ? {
            caloriesPer100g: row.calories_per_100g,
            proteinPer100g: row.protein_per_100g,
            carbsPer100g: row.carbs_per_100g,
            fatPer100g: row.fat_per_100g,
          }
        : null,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface RecipeIngredientRow {
  id: number;
  recipe_id: number;
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

export function mapRecipeIngredient(row: RecipeIngredientRow): RecipeIngredient {
  return {
    id: row.id,
    recipeId: row.recipe_id,
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
