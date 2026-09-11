import type { Migration } from './index';

/**
 * Recipes: a named dish built from ingredients, each of which is a snapshot exactly like a day
 * entry. Library references are kept so an ingredient can be refreshed on request, but they are
 * nullable and deleting a product never changes a saved recipe's numbers.
 */
export const migration003Recipes: Migration = {
  version: 3,
  name: 'recipes',
  async up(db) {
    await db.execAsync(`
      CREATE TABLE recipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        -- Weight of the finished dish when it differs from the sum of ingredients (evaporation,
        -- added water). NULL means "use the sum".
        cooked_weight_grams REAL CHECK (cooked_weight_grams IS NULL OR cooked_weight_grams > 0),
        -- 1 when the user replaced the calculated per-100-g values with their own.
        macros_overridden INTEGER NOT NULL DEFAULT 0,
        calories_per_100g REAL CHECK (calories_per_100g IS NULL OR calories_per_100g >= 0),
        protein_per_100g REAL CHECK (protein_per_100g IS NULL OR protein_per_100g >= 0),
        carbs_per_100g REAL CHECK (carbs_per_100g IS NULL OR carbs_per_100g >= 0),
        fat_per_100g REAL CHECK (fat_per_100g IS NULL OR fat_per_100g >= 0),
        last_used_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX idx_recipes_name ON recipes(name COLLATE NOCASE);

      CREATE TABLE recipe_ingredients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
        product_name TEXT NOT NULL,
        variant_name TEXT,
        weight_grams REAL NOT NULL CHECK (weight_grams > 0),
        calories_per_100g REAL NOT NULL CHECK (calories_per_100g >= 0),
        protein_per_100g REAL CHECK (protein_per_100g IS NULL OR protein_per_100g >= 0),
        carbs_per_100g REAL CHECK (carbs_per_100g IS NULL OR carbs_per_100g >= 0),
        fat_per_100g REAL CHECK (fat_per_100g IS NULL OR fat_per_100g >= 0),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id, sort_order);
    `);
  },
};
