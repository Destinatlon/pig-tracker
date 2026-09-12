import { nowIso } from '../../domain/dates';
import { NewRecipeIngredient, NutritionPer100g, Recipe, RecipeIngredient, RecipeWithIngredients } from '../../domain/models';
import { filterBySearch } from '../../domain/search';
import { Database, getDb } from '../database';
import { RecipeIngredientRow, RecipeRow, mapRecipe, mapRecipeIngredient } from './rowMappers';

/** A recipe plus just enough of its contents for a list row. */
export interface RecipeListItem {
  recipe: Recipe;
  ingredients: RecipeIngredient[];
}

/** Most recently used first, then alphabetical. Ingredients come from one extra query, not N. */
export async function listRecipes(filter: { search?: string } = {}): Promise<RecipeListItem[]> {
  const db = await getDb();
  const all = await db.getAllAsync<RecipeRow>(
    'SELECT * FROM recipes ORDER BY last_used_at IS NULL ASC, last_used_at DESC, name COLLATE NOCASE ASC',
  );
  // Each typed word has to appear in the name or the description, in any order.
  const rows = filterBySearch(all, filter.search ?? '', (row) => [row.name, row.description]);
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const ingredientRows = await db.getAllAsync<RecipeIngredientRow>(
    `SELECT * FROM recipe_ingredients WHERE recipe_id IN (${ids.map(() => '?').join(',')}) ORDER BY sort_order ASC, id ASC`,
    ids,
  );
  const byRecipe = new Map<number, RecipeIngredient[]>(ids.map((id) => [id, []]));
  for (const row of ingredientRows) byRecipe.get(row.recipe_id)?.push(mapRecipeIngredient(row));
  return rows.map((row) => ({ recipe: mapRecipe(row), ingredients: byRecipe.get(row.id) ?? [] }));
}

export async function getRecipe(id: number): Promise<RecipeWithIngredients | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<RecipeRow>('SELECT * FROM recipes WHERE id = ?', [id]);
  if (!row) return null;
  const ingredientRows = await db.getAllAsync<RecipeIngredientRow>(
    'SELECT * FROM recipe_ingredients WHERE recipe_id = ? ORDER BY sort_order ASC, id ASC',
    [id],
  );
  return { ...mapRecipe(row), ingredients: ingredientRows.map(mapRecipeIngredient) };
}

export interface SaveRecipeInput {
  /** Omitted when creating. */
  id?: number;
  name: string;
  description: string;
  cookedWeightGrams: number | null;
  /** Null leaves the calculated values in place; a value replaces them. */
  overridePer100g: NutritionPer100g | null;
  ingredients: NewRecipeIngredient[];
}

const INSERT_INGREDIENT_SQL = `
  INSERT INTO recipe_ingredients (recipe_id, sort_order, product_id, variant_id, product_name, variant_name,
    weight_grams, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

async function writeIngredients(db: Database, recipeId: number, ingredients: NewRecipeIngredient[], now: string): Promise<void> {
  await db.runAsync('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [recipeId]);
  let sortOrder = 0;
  for (const ingredient of ingredients) {
    await db.runAsync(INSERT_INGREDIENT_SQL, [
      recipeId,
      sortOrder++,
      ingredient.productId,
      ingredient.variantId,
      ingredient.productName,
      ingredient.variantName,
      ingredient.weightGrams,
      ingredient.caloriesPer100g,
      ingredient.proteinPer100g,
      ingredient.carbsPer100g,
      ingredient.fatPer100g,
      now,
      now,
    ]);
  }
}

/**
 * Creates or updates a recipe and replaces its ingredient list in one transaction. The editor
 * holds the whole draft in memory, so there is a single explicit Save rather than per-row writes.
 */
export async function saveRecipe(input: SaveRecipeInput): Promise<number> {
  const db = await getDb();
  const now = nowIso();
  const override = input.overridePer100g;
  let recipeId = input.id ?? 0;
  await db.withTransactionAsync(async () => {
    if (input.id === undefined) {
      const result = await db.runAsync(
        `INSERT INTO recipes (name, description, cooked_weight_grams, macros_overridden,
           calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.name,
          input.description,
          input.cookedWeightGrams,
          override ? 1 : 0,
          override?.caloriesPer100g ?? null,
          override?.proteinPer100g ?? null,
          override?.carbsPer100g ?? null,
          override?.fatPer100g ?? null,
          now,
          now,
        ],
      );
      recipeId = result.lastInsertRowId;
    } else {
      await db.runAsync(
        `UPDATE recipes SET name = ?, description = ?, cooked_weight_grams = ?, macros_overridden = ?,
           calories_per_100g = ?, protein_per_100g = ?, carbs_per_100g = ?, fat_per_100g = ?, updated_at = ?
         WHERE id = ?`,
        [
          input.name,
          input.description,
          input.cookedWeightGrams,
          override ? 1 : 0,
          override?.caloriesPer100g ?? null,
          override?.proteinPer100g ?? null,
          override?.carbsPer100g ?? null,
          override?.fatPer100g ?? null,
          now,
          input.id,
        ],
      );
    }
    await writeIngredients(db, recipeId, input.ingredients, now);
  });
  return recipeId;
}

export async function deleteRecipe(id: number): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [id]);
    await db.runAsync('DELETE FROM recipes WHERE id = ?', [id]);
  });
}

/** Records that the recipe was logged, so the pickers can offer it first. */
export async function touchRecipeUsage(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE recipes SET last_used_at = ? WHERE id = ?', [nowIso(), id]);
}
