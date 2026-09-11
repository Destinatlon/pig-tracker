import { PRESET_CATEGORY_NAMES, PRESET_PRODUCTS, PresetCategory } from '../seed/presetProducts';
import type { Migration } from './index';

/**
 * Seeds a starter product library. Runs once per install (the migration version guard), and only
 * ever inserts: existing products, variants and day entries are never touched. A preset whose name
 * already exists in the library is skipped so a user who added it by hand keeps their own values.
 */
export const migration002SeedProducts: Migration = {
  version: 2,
  name: 'seed_products',
  async up(db) {
    const now = new Date().toISOString();

    const uncategorized = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM categories WHERE is_system = 1 ORDER BY id LIMIT 1',
    );
    if (!uncategorized) throw new Error('Uncategorized category is missing');

    const categories = await db.getAllAsync<{ id: number; name: string }>('SELECT id, name FROM categories');
    const categoryIdByName = new Map(categories.map((row) => [row.name.toLowerCase(), row.id]));
    const resolveCategoryId = (category: PresetCategory): number => {
      const names = PRESET_CATEGORY_NAMES[category];
      return (
        categoryIdByName.get(names.uk.toLowerCase()) ??
        categoryIdByName.get(names.en.toLowerCase()) ??
        uncategorized.id
      );
    };

    const existing = await db.getAllAsync<{ name: string }>('SELECT name FROM products');
    const takenNames = new Set(existing.map((row) => row.name.trim().toLowerCase()));

    for (const preset of PRESET_PRODUCTS) {
      if (takenNames.has(preset.name.toLowerCase())) continue;
      takenNames.add(preset.name.toLowerCase());

      const product = await db.runAsync(
        'INSERT INTO products (category_id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
        [resolveCategoryId(preset.category), preset.name, now, now],
      );
      // Every product needs its hidden default variant; the library reads values through variants.
      await db.runAsync(
        `INSERT INTO product_variants (product_id, name, is_default, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, created_at, updated_at)
         VALUES (?, '', 1, ?, ?, ?, ?, ?, ?)`,
        [
          product.lastInsertRowId,
          preset.caloriesPer100g,
          preset.proteinPer100g,
          preset.carbsPer100g,
          preset.fatPer100g,
          now,
          now,
        ],
      );
    }
  },
};
